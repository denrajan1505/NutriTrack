import openai
import json
import re
import base64
from app.core.config import settings
from app.models.schemas import NutritionInfo

_client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
_TEXT_MODEL = "gpt-4o-mini"
_VISION_MODEL = "gpt-4o-mini"

NUTRITION_SCHEMA = """{
  "calories": <number>,
  "protein": <number in grams>,
  "carbs": <number in grams>,
  "fat": <number in grams>,
  "fiber": <number in grams>,
  "meal_quality_score": <integer 0-100>,
  "food_items": ["<food name with portion, e.g. Pongal - 1 cup>"],
  "description": "<brief nutritional summary using the EXACT food names the user mentioned>"
}"""

_INDIAN_FOOD_SYSTEM = """You are a professional nutritionist with deep expertise in Indian cuisine. You provide highly accurate nutritional estimates based on ICMR/NIN India food composition data.

ACCURACY RULES:
- For IMAGES: estimate portions from visual context — plate size, bowl size, box size, serving style
- Restaurant meals use larger portions than home-cooked; adjust accordingly
- ALWAYS include ALL components: main dish + every side + every condiment/chutney visible
- Account for cooking fat: plain dosa uses 1-2 tsp ghee, paratha uses 1-2 tbsp oil
- SUM every identified item — never calculate only the main dish and ignore accompaniments
- CRITICAL: NEVER return 0 for calories, protein, carbs, or fat. Every visible food has nutritional value. If uncertain, use your best estimate — 0 is ALWAYS wrong.
- For non-Indian foods, use standard international nutritional databases (USDA values)

REFERENCE VALUES — Indian foods (ICMR/NIN):
- Idli (1 medium, 40g): 65 kcal, 2g protein, 13g carbs, 0.4g fat
- Dosa plain small homestyle (1, 80g): 120 kcal, 3g protein, 22g carbs, 2g fat
- Dosa plain medium restaurant (1, 130g, with ghee): 200 kcal, 5g protein, 30g carbs, 7g fat
- Dosa plain large crispy restaurant (1, 170g, with ghee): 260 kcal, 6g protein, 39g carbs, 9g fat
- Masala dosa restaurant (1, with potato filling): 320 kcal, 7g protein, 50g carbs, 10g fat
- Uttapam (1 medium, 120g): 180 kcal, 5g protein, 30g carbs, 5g fat
- Sambar (1 small steel bowl, 200ml): 80 kcal, 4g protein, 12g carbs, 2g fat
- Coconut chutney small steel bowl (60g): 110 kcal, 1.5g protein, 6g carbs, 9g fat
- Coconut chutney (2 tbsp, 30g): 55 kcal, 1g protein, 3g carbs, 5g fat
- Chapati/Roti (1, 30g): 80 kcal, 3g protein, 15g carbs, 1.5g fat
- Paratha plain (1, 60g, with oil): 200 kcal, 4g protein, 27g carbs, 8g fat
- Rice cooked (1 cup, 150g): 195 kcal, 4g protein, 43g carbs, 0.4g fat
- Dal tadka (1 cup, 200ml): 150 kcal, 9g protein, 24g carbs, 3g fat
- Rajma/Chole (1 cup, 200ml): 200 kcal, 11g protein, 32g carbs, 4g fat
- Chicken curry (1 serving, 150g): 220 kcal, 22g protein, 6g carbs, 12g fat
- Egg whole boiled (1): 78 kcal, 6g protein, 0.6g carbs, 5g fat
- Paneer (100g): 265 kcal, 18g protein, 3g carbs, 20g fat
- Biryani (1 plate, 300g): 450 kcal, 18g protein, 65g carbs, 14g fat
- Upma (1 cup, 180g): 200 kcal, 5g protein, 32g carbs, 6g fat
- Poha (1 cup, 180g): 220 kcal, 4g protein, 38g carbs, 6g fat
- Curd/Yogurt (100g): 60 kcal, 3g protein, 4g carbs, 3g fat
- Puri (1, 25g, deep fried): 110 kcal, 2g protein, 14g carbs, 5.5g fat
- Bhaji/Sabzi (1 serving, 100g): 100 kcal, 3g protein, 12g carbs, 5g fat

REFERENCE VALUES — International foods (USDA):
- Pizza cheese/veg (1 slice, ~100g): 250 kcal, 11g protein, 30g carbs, 9g fat
- Pizza loaded toppings (1 slice, ~115g): 290 kcal, 13g protein, 31g carbs, 12g fat
- Pizza whole medium 12" (~8 slices, 800g): 2100 kcal, 95g protein, 245g carbs, 80g fat
- Burger standard (1, 200g): 490 kcal, 25g protein, 45g carbs, 22g fat
- French fries medium (120g): 370 kcal, 4g protein, 48g carbs, 18g fat
- Fried rice (1 plate, 250g): 370 kcal, 10g protein, 60g carbs, 10g fat
- Noodles/pasta (1 plate, 250g): 350 kcal, 12g protein, 60g carbs, 8g fat
- Sandwich (1, 200g): 350 kcal, 15g protein, 40g carbs, 14g fat
- Bread (1 slice, 30g): 80 kcal, 3g protein, 15g carbs, 1g fat
- Milk (1 glass, 200ml): 120 kcal, 6g protein, 10g carbs, 5g fat
- Tea with milk/sugar (1 cup): 50 kcal, 1g protein, 8g carbs, 1.5g fat
- Banana (1 medium, 120g): 105 kcal, 1.3g protein, 27g carbs, 0.4g fat
- Apple (1 medium, 180g): 95 kcal, 0.5g protein, 25g carbs, 0.3g fat

CRITICAL NAMING: Never substitute names — Pongal ≠ upma, Idli ≠ dosa, Sambar ≠ rasam ≠ dal.

Sum every component. Final totals must include ALL identified items."""


def _parse_nutrition_json(text: str) -> NutritionInfo:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    data = json.loads(match.group())
    if isinstance(data.get("food_items"), list):
        normalized = []
        for item in data["food_items"]:
            if isinstance(item, dict):
                parts = [str(v) for v in item.values() if v]
                normalized.append(" - ".join(parts))
            else:
                normalized.append(str(item))
        data["food_items"] = normalized
    return NutritionInfo(**data)


def _is_quota_error(e: Exception) -> bool:
    msg = str(e)
    return "429" in msg or "quota" in msg.lower() or "insufficient_quota" in msg.lower()


async def analyze_food_image(image_bytes: bytes) -> NutritionInfo:
    b64 = base64.b64encode(image_bytes).decode()
    try:
        response = await _client.chat.completions.create(
            model=_VISION_MODEL,
            messages=[
                {"role": "system", "content": _INDIAN_FOOD_SYSTEM},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
                        {
                            "type": "text",
                            "text": (
                                "Analyze this food image step by step:\n\n"
                                "STEP 1 — IDENTIFY: List every food item visible, including ALL sides, chutneys, sauces, drinks.\n"
                                "STEP 2 — ESTIMATE PORTIONS from visual cues:\n"
                                "  • Full restaurant plate dosa: 130-170g (not 80g)\n"
                                "  • Small steel bowl liquid (sambar/rasam): ~200ml\n"
                                "  • Small steel bowl thick condiment (chutney): ~60g\n"
                                "  • Whole medium pizza in box (~12 inch): ~800g, ~2100 kcal total\n"
                                "  • Per pizza slice: ~250-290 kcal\n"
                                "  • Restaurant/dhaba style = larger portions\n"
                                "STEP 3 — CALCULATE each item separately using reference values.\n"
                                "STEP 4 — SUM ALL items. Every identified item must contribute to the final numbers.\n\n"
                                "CRITICAL: Output REAL numbers. If you can see the food, you MUST estimate its calories. Returning 0 is forbidden — use your best nutritional knowledge.\n\n"
                                f"Return ONLY valid JSON:\n{NUTRITION_SCHEMA}"
                            ),
                        },
                    ],
                },
            ],
            max_tokens=600,
        )
        return _parse_nutrition_json(response.choices[0].message.content)
    except Exception as e:
        if _is_quota_error(e):
            raise RuntimeError("QUOTA_EXCEEDED")
        raise


async def analyze_food_text(text: str) -> NutritionInfo:
    try:
        response = await _client.chat.completions.create(
            model=_TEXT_MODEL,
            messages=[
                {"role": "system", "content": _INDIAN_FOOD_SYSTEM},
                {
                    "role": "user",
                    "content": (
                        f'The user logged this meal: "{text}"\n\n'
                        f'Return ONLY valid JSON:\n{NUTRITION_SCHEMA}'
                    ),
                },
            ],
            max_tokens=400,
        )
        return _parse_nutrition_json(response.choices[0].message.content)
    except Exception as e:
        if _is_quota_error(e):
            raise RuntimeError("QUOTA_EXCEEDED")
        raise


_SUGGESTIONS_FALLBACK = {
    "suggestions": [
        {"food_name": "Paneer (100g)", "portion": "100g", "calories": 265, "protein": 18, "reason": "High protein, low carb"},
        {"food_name": "Boiled Eggs (2)", "portion": "2 eggs", "calories": 155, "protein": 13, "reason": "Complete protein source"},
        {"food_name": "Greek Yogurt", "portion": "150g", "calories": 90, "protein": 10, "reason": "Protein + probiotics"},
    ],
    "motivational_tip": "Every meal is a step toward your goal. Keep going!",
}


async def generate_meal_suggestions(
    current_protein: float,
    protein_goal: float,
    current_calories: float,
    calorie_goal: float,
    goal_type: str,
) -> dict:
    gap_protein = max(0, protein_goal - current_protein)
    gap_calories = max(0, calorie_goal - current_calories)

    prompt = (
        f'You are a nutrition coach. A user with goal "{goal_type}" needs meal suggestions.\n\n'
        f'Current status:\n'
        f'- Protein consumed: {current_protein}g / {protein_goal}g (gap: {gap_protein}g)\n'
        f'- Calories consumed: {current_calories} / {calorie_goal} kcal (gap: {gap_calories} kcal)\n\n'
        'Suggest 3-4 specific food items they can eat now. Return ONLY valid JSON:\n'
        '{\n  "suggestions": [\n    {\n      "food_name": "<name>",\n      "portion": "<amount>",\n'
        '      "calories": <number>,\n      "protein": <number>,\n      "reason": "<why this helps>"\n    }\n  ],\n'
        '  "motivational_tip": "<short motivational message>"\n}'
    )
    try:
        response = await _client.chat.completions.create(
            model=_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
        )
        match = re.search(r'\{.*\}', response.choices[0].message.content, re.DOTALL)
        if not match:
            return _SUGGESTIONS_FALLBACK
        return json.loads(match.group())
    except Exception:
        return _SUGGESTIONS_FALLBACK


def _weekly_summary_fallback(stats: dict) -> dict:
    protein_pct = int(stats['avg_protein'] / stats['protein_target'] * 100) if stats['protein_target'] else 0
    calorie_pct = int(stats['avg_calories'] / stats['calorie_target'] * 100) if stats['calorie_target'] else 0
    summary = (
        f"You averaged {stats['avg_calories']:.0f} kcal/day ({calorie_pct}% of target) "
        f"and {stats['avg_protein']:.0f}g protein/day ({protein_pct}% of target) this week. "
        f"You hit your protein goal on {stats['protein_goal_days']}/7 days — keep pushing!"
    )
    good, needs, goals = [], [], []
    if stats['calorie_goal_days'] >= 4:
        good.append(f"Calorie goal met {stats['calorie_goal_days']}/7 days")
    else:
        needs.append(f"Calorie goal met only {stats['calorie_goal_days']}/7 days")
    if stats['protein_goal_days'] >= 4:
        good.append(f"Protein goal hit {stats['protein_goal_days']}/7 days")
    else:
        needs.append(f"Protein goal met only {stats['protein_goal_days']}/7 days")
    if stats.get('avg_water', 0) >= stats.get('water_target', 2.5) * 0.8:
        good.append("Good hydration this week")
    else:
        needs.append(f"Water intake below target ({stats.get('avg_water', 0):.1f}L avg)")
    goals.append(f"Hit {stats['protein_target']}g protein every day")
    goals.append(f"Drink {stats.get('water_target', 2.5)}L water daily")
    goals.append("Log all meals to boost your nutrition score")
    return {"summary": summary, "good": good, "needs_improvement": needs, "next_week_goals": goals}


async def generate_weekly_summary(stats: dict) -> dict:
    prompt = (
        f"You are a personal nutritionist. Analyze this week's data:\n"
        f"- Avg calories: {stats['avg_calories']:.0f} / {stats['calorie_target']} kcal\n"
        f"- Avg protein: {stats['avg_protein']:.0f}g / {stats['protein_target']}g\n"
        f"- Avg water: {stats.get('avg_water', 0):.1f}L / {stats.get('water_target', 2.5)}L\n"
        f"- Protein goal met: {stats['protein_goal_days']} / 7 days\n"
        f"- Calorie goal met: {stats['calorie_goal_days']} / 7 days\n"
        f"- Total meals logged: {stats['total_meals']}\n"
        f"- Nutrition score: {stats.get('nutrition_score', 0)}/100\n"
        f"- User goal: {stats['goal_type']}\n\n"
        "Return ONLY valid JSON (no markdown, no backticks):\n"
        '{"summary": "<2-3 sentence encouraging summary>", '
        '"good": ["<achievement 1>", "<achievement 2>", "<achievement 3>"], '
        '"needs_improvement": ["<issue 1>", "<issue 2>", "<issue 3>"], '
        '"next_week_goals": ["<specific actionable goal 1>", "<goal 2>", "<goal 3>"]}'
    )
    try:
        response = await _client.chat.completions.create(
            model=_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        match = re.search(r'\{.*\}', response.choices[0].message.content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return _weekly_summary_fallback(stats)
    except Exception:
        return _weekly_summary_fallback(stats)


async def analyze_whatsapp_message(message: str) -> str:
    prompt = (
        f'You are Nutries, a WhatsApp nutrition AI assistant. The user sent: "{message}"\n\n'
        "If it's a food item/meal, analyze it and respond with:\n"
        "- Food identified\n- Calories, Protein, Carbs, Fat\n- A short encouraging note\n\n"
        "If it's a question about nutrition, answer helpfully and briefly.\n"
        "Keep response under 150 words. Use simple formatting."
    )
    try:
        response = await _client.chat.completions.create(
            model=_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "Sorry, I couldn't process that right now. Please try again."
