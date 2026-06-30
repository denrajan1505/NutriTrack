from fastapi import APIRouter, Header, HTTPException
from datetime import date, timedelta
from typing import Optional

from app.core.supabase_client import supabase, get_user_id_from_token
from collections import Counter
from app.models.schemas import (
    DashboardSummary, MealLogResponse, WeeklySummary, SuggestionsResponse, MealSuggestion,
    ScoreBreakdown, DayData, BestWorstDay, TopFood, AiInsights,
)
from app.services.gemini_service import generate_meal_suggestions, generate_weekly_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_user_goals(user_id: str) -> dict:
    result = supabase.table("user_goals").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    if result.data:
        return result.data[0]
    return {
        "daily_calorie_target": 2000,
        "daily_protein_target": 120,
        "daily_carbs_target": 250,
        "daily_fat_target": 65,
        "daily_water_target": 2.5,
        "goal_type": "maintenance",
    }


@router.get("/today", response_model=DashboardSummary)
async def get_today_dashboard(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    today = date.today()
    return await _get_dashboard_for_date(user_id, today)


@router.get("/date/{target_date}", response_model=DashboardSummary)
async def get_dashboard_by_date(target_date: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    try:
        target = date.fromisoformat(target_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    return await _get_dashboard_for_date(user_id, target)


async def _get_dashboard_for_date(user_id: str, target_date: date) -> DashboardSummary:
    goals = get_user_goals(user_id)

    meals_result = (
        supabase.table("meal_logs")
        .select("*")
        .eq("user_id", user_id)
        .gte("logged_at", target_date.isoformat())
        .lt("logged_at", (target_date + timedelta(days=1)).isoformat())
        .order("logged_at")
        .execute()
    )

    meals = [MealLogResponse(**row) for row in meals_result.data]

    water_result = (
        supabase.table("water_logs")
        .select("amount_liters")
        .eq("user_id", user_id)
        .eq("date", target_date.isoformat())
        .execute()
    )
    water_intake = sum(row["amount_liters"] for row in water_result.data)

    return DashboardSummary(
        date=target_date,
        total_calories=sum(m.calories for m in meals),
        total_protein=sum(m.protein for m in meals),
        total_carbs=sum(m.carbs for m in meals),
        total_fat=sum(m.fat for m in meals),
        water_intake=water_intake,
        calorie_target=goals["daily_calorie_target"],
        protein_target=goals["daily_protein_target"],
        carbs_target=goals["daily_carbs_target"],
        fat_target=goals["daily_fat_target"],
        water_target=goals["daily_water_target"],
        meals=meals,
    )


@router.get("/weekly", response_model=WeeklySummary)
async def get_weekly_summary(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    goals = get_user_goals(user_id)

    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    meals_result = (
        supabase.table("meal_logs")
        .select("*")
        .eq("user_id", user_id)
        .gte("logged_at", week_start.isoformat())
        .lt("logged_at", (week_end + timedelta(days=1)).isoformat())
        .execute()
    )

    water_result = (
        supabase.table("water_logs")
        .select("date, amount_liters")
        .eq("user_id", user_id)
        .gte("date", week_start.isoformat())
        .lte("date", week_end.isoformat())
        .execute()
    )
    water_by_day = {row["date"]: row["amount_liters"] for row in water_result.data}

    # Build per-day totals from meals
    daily_totals: dict[str, dict] = {}
    for meal in meals_result.data:
        day = meal["logged_at"][:10]
        if day not in daily_totals:
            daily_totals[day] = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "meals": 0}
        daily_totals[day]["calories"] += meal["calories"]
        daily_totals[day]["protein"] += meal["protein"]
        daily_totals[day]["carbs"] += meal["carbs"]
        daily_totals[day]["fat"] += meal["fat"]
        daily_totals[day]["fiber"] += meal.get("fiber") or 0
        daily_totals[day]["meals"] += 1

    # Build 7-day array (Mon–Sun) and per-day scores for best/worst
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    daily_data: list[DayData] = []
    scored_days = []
    for i in range(7):
        day_date = week_start + timedelta(days=i)
        day_str = day_date.isoformat()
        t = daily_totals.get(day_str, {"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fiber": 0, "meals": 0})
        water = water_by_day.get(day_str, 0.0)
        cal_met = t["calories"] > 0 and t["calories"] <= goals["daily_calorie_target"] * 1.05
        pro_met = t["protein"] >= goals["daily_protein_target"]
        water_met = water >= goals["daily_water_target"] * 0.67
        day_score = int(cal_met) * 40 + int(pro_met) * 40 + int(water_met) * 20

        daily_data.append(DayData(
            day=day_names[i], date=day_str,
            calories=round(t["calories"], 1), protein=round(t["protein"], 1),
            carbs=round(t["carbs"], 1), fat=round(t["fat"], 1),
            water=round(water, 2), calorie_goal_met=cal_met,
            protein_goal_met=pro_met, meals_logged=t["meals"],
        ))
        if t["meals"] > 0:
            scored_days.append((day_str, day_names[i], day_score, t, water, cal_met, pro_met))

    # Aggregate averages
    days_with_data = len(daily_totals) or 1
    avg_calories = sum(d["calories"] for d in daily_totals.values()) / days_with_data
    avg_protein = sum(d["protein"] for d in daily_totals.values()) / days_with_data
    avg_carbs = sum(d["carbs"] for d in daily_totals.values()) / days_with_data
    avg_fat = sum(d["fat"] for d in daily_totals.values()) / days_with_data
    avg_fiber = sum(d["fiber"] for d in daily_totals.values()) / days_with_data

    water_values = list(water_by_day.values()) if water_by_day else [0.0]
    avg_water = sum(water_values) / len(water_values)
    best_water = max(water_values)
    lowest_water = min(water_values)

    protein_days = sum(1 for d in daily_totals.values() if d["protein"] >= goals["daily_protein_target"])
    calorie_days = sum(1 for d in daily_totals.values() if d["calories"] > 0 and d["calories"] <= goals["daily_calorie_target"] * 1.05)

    # Meal distribution + food variety
    unique_foods: set = set()
    food_counter: Counter = Counter()
    meal_dist = {"breakfast": 0, "lunch": 0, "dinner": 0, "snack": 0}
    for meal in meals_result.data:
        mt = meal.get("meal_type", "snack").lower()
        meal_dist[mt] = meal_dist.get(mt, 0) + 1
        for item in (meal.get("food_items") or []):
            name = item.split(" - ")[0].strip()
            unique_foods.add(name.lower())
            food_counter[name] += 1

    # Score breakdown (total 100)
    water_target = goals["daily_water_target"]
    ml_score = int(min(len(daily_totals) / 7, 1) * 30)
    cal_score = int(calorie_days / 7 * 20)
    pro_score = int(protein_days / 7 * 20)
    wat_score = int(min(avg_water / water_target if water_target else 0, 1) * 15)
    var_score = int(min(len(unique_foods) / 10, 1) * 15)
    nutrition_score = ml_score + cal_score + pro_score + wat_score + var_score

    score_breakdown = ScoreBreakdown(
        meal_logging=ml_score, calorie_goal=cal_score, protein_goal=pro_score,
        water_intake=wat_score, food_variety=var_score,
    )

    # Best and worst logged day
    best_day = None
    worst_day = None
    if scored_days:
        best = max(scored_days, key=lambda x: x[2])
        worst = min(scored_days, key=lambda x: x[2])
        best_day = BestWorstDay(
            day=best[1], date=best[0], score=best[2],
            calories=round(best[3]["calories"], 1), protein=round(best[3]["protein"], 1),
            water=round(best[4], 2), calorie_goal_met=best[5], protein_goal_met=best[6],
        )
        if len(scored_days) > 1 and worst[0] != best[0]:
            worst_day = BestWorstDay(
                day=worst[1], date=worst[0], score=worst[2],
                calories=round(worst[3]["calories"], 1), protein=round(worst[3]["protein"], 1),
                water=round(worst[4], 2), calorie_goal_met=worst[5], protein_goal_met=worst[6],
            )

    top_foods = [TopFood(name=k, count=v) for k, v in food_counter.most_common(5)]

    # Meal streak (last 60 days)
    sixty_days_ago = today - timedelta(days=60)
    streak_data = (
        supabase.table("meal_logs").select("logged_at")
        .eq("user_id", user_id).gte("logged_at", sixty_days_ago.isoformat()).execute()
    )
    days_with_meals = {row["logged_at"][:10] for row in streak_data.data}

    current_streak = 0
    check = today
    while check.isoformat() in days_with_meals:
        current_streak += 1
        check -= timedelta(days=1)

    longest_streak, cur = 0, 0
    for i in range(59, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        if d in days_with_meals:
            cur += 1
            longest_streak = max(longest_streak, cur)
        else:
            cur = 0

    # AI summary (structured)
    ai_result = await generate_weekly_summary({
        "avg_calories": avg_calories, "avg_protein": avg_protein,
        "calorie_target": goals["daily_calorie_target"], "protein_target": goals["daily_protein_target"],
        "protein_goal_days": protein_days, "calorie_goal_days": calorie_days,
        "total_meals": len(meals_result.data), "goal_type": goals.get("goal_type", "maintenance"),
        "avg_water": avg_water, "water_target": water_target, "nutrition_score": nutrition_score,
    })
    ai_summary = ai_result.get("summary", "")
    ai_insights = None
    good = ai_result.get("good", [])
    needs = ai_result.get("needs_improvement", [])
    next_goals = ai_result.get("next_week_goals", [])
    if good or needs or next_goals:
        ai_insights = AiInsights(good=good, needs_improvement=needs, next_week_goals=next_goals)

    return WeeklySummary(
        week_start=week_start, week_end=week_end,
        avg_daily_calories=round(avg_calories, 1), avg_daily_protein=round(avg_protein, 1),
        avg_daily_carbs=round(avg_carbs, 1), avg_daily_fat=round(avg_fat, 1),
        avg_daily_fiber=round(avg_fiber, 1), avg_daily_water=round(avg_water, 2),
        best_daily_water=round(best_water, 2), lowest_daily_water=round(lowest_water, 2),
        calorie_target=goals["daily_calorie_target"], protein_target=goals["daily_protein_target"],
        water_target=water_target,
        protein_goal_met_days=protein_days, calorie_goal_met_days=calorie_days,
        total_meals_logged=len(meals_result.data),
        ai_summary=ai_summary, nutrition_score=nutrition_score,
        score_breakdown=score_breakdown, daily_data=daily_data,
        best_day=best_day, worst_day=worst_day,
        meal_distribution=meal_dist, top_foods=top_foods,
        current_streak=current_streak, longest_streak=longest_streak,
        ai_insights=ai_insights,
    )


@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_meal_suggestions(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    dashboard = await _get_dashboard_for_date(user_id, date.today())
    goals = get_user_goals(user_id)

    ai_data = await generate_meal_suggestions(
        current_protein=dashboard.total_protein,
        protein_goal=dashboard.protein_target,
        current_calories=dashboard.total_calories,
        calorie_goal=dashboard.calorie_target,
        goal_type=goals.get("goal_type", "maintenance"),
    )

    suggestions = [MealSuggestion(**s) for s in ai_data.get("suggestions", [])]

    return SuggestionsResponse(
        current_protein=dashboard.total_protein,
        protein_goal=dashboard.protein_target,
        protein_gap=max(0, dashboard.protein_target - dashboard.total_protein),
        suggestions=suggestions,
        motivational_tip=ai_data.get("motivational_tip", "Keep going!"),
    )


@router.post("/water")
async def log_water(amount_liters: float, log_date: Optional[str] = None, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    target_date = date.fromisoformat(log_date) if log_date else date.today()

    existing = supabase.table("water_logs").select("id, amount_liters").eq("user_id", user_id).eq("date", target_date.isoformat()).execute()

    if existing.data:
        new_total = existing.data[0]["amount_liters"] + amount_liters
        supabase.table("water_logs").update({"amount_liters": new_total}).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("water_logs").insert({"user_id": user_id, "date": target_date.isoformat(), "amount_liters": amount_liters}).execute()

    return {"message": "Water logged", "date": target_date.isoformat()}
