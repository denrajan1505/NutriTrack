from fastapi import APIRouter, Header, HTTPException
from datetime import date, timedelta
from typing import Optional

from app.core.supabase_client import supabase, get_user_id_from_token
from app.models.schemas import DashboardSummary, MealLogResponse, WeeklySummary, SuggestionsResponse, MealSuggestion
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

    daily_totals: dict[str, dict] = {}
    for meal in meals_result.data:
        day = meal["logged_at"][:10]
        if day not in daily_totals:
            daily_totals[day] = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
        daily_totals[day]["calories"] += meal["calories"]
        daily_totals[day]["protein"] += meal["protein"]
        daily_totals[day]["carbs"] += meal["carbs"]
        daily_totals[day]["fat"] += meal["fat"]

    days_with_data = len(daily_totals) or 1
    avg_calories = sum(d["calories"] for d in daily_totals.values()) / days_with_data
    avg_protein = sum(d["protein"] for d in daily_totals.values()) / days_with_data
    avg_carbs = sum(d["carbs"] for d in daily_totals.values()) / days_with_data
    avg_fat = sum(d["fat"] for d in daily_totals.values()) / days_with_data

    protein_days = sum(1 for d in daily_totals.values() if d["protein"] >= goals["daily_protein_target"])
    calorie_days = sum(1 for d in daily_totals.values() if d["calories"] <= goals["daily_calorie_target"] * 1.05)

    nutrition_score = int(
        (protein_days / 7 * 40) + (calorie_days / 7 * 40) + (min(days_with_data / 7, 1) * 20)
    )

    ai_summary = await generate_weekly_summary({
        "avg_calories": avg_calories,
        "avg_protein": avg_protein,
        "calorie_target": goals["daily_calorie_target"],
        "protein_target": goals["daily_protein_target"],
        "protein_goal_days": protein_days,
        "calorie_goal_days": calorie_days,
        "total_meals": len(meals_result.data),
        "goal_type": goals.get("goal_type", "maintenance"),
    })

    return WeeklySummary(
        week_start=week_start,
        week_end=week_end,
        avg_daily_calories=round(avg_calories, 1),
        avg_daily_protein=round(avg_protein, 1),
        avg_daily_carbs=round(avg_carbs, 1),
        avg_daily_fat=round(avg_fat, 1),
        protein_goal_met_days=protein_days,
        calorie_goal_met_days=calorie_days,
        total_meals_logged=len(meals_result.data),
        ai_summary=ai_summary,
        nutrition_score=nutrition_score,
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
