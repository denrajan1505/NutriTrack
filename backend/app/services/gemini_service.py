from google import genai
from google.genai import types
import json
import re
import asyncio
from app.core.config import settings
from app.models.schemas import NutritionInfo

_client = genai.Client(api_key=settings.gemini_api_key)
_MODEL = "gemini-2.0-flash"

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

_INDIAN_FOOD_SYSTEM = """You are a professional nutritionist with deep expertise in Indian cuisine — both North and South Indian.

CRITICAL: Always use the EXACT food name the user mentioned. Never substitute or rename:
- Pongal (rice + moong dal dish) ≠ upma (semolina dish) ≠ khichdi (North Indian rice-dal)
- Idli ≠ dosa ≠ uttapam
- Poha ≠ upma
- Appam ≠ dosa
- Paratha ≠ chapati ≠ roti
- Sambar ≠ rasam ≠ dal

If the user says "pongal", analyze it as pongal. If they say "upma", analyze it as upma. Use the user's exact words in food_items and description."""


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
    return "429" in msg or "quota" in msg.lower() or "resource_exhausted" in msg.lower()


async def analyze_food_image(image_bytes: bytes) -> NutritionInfo:
    prompt = f"{_INDIAN_FOOD_SYSTEM}\n\nIdentify this food and return ONLY valid JSON:\n{NUTRITION_SCHEMA}"
    try:
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=_MODEL,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt,
            ],
        )
        return _parse_nutrition_json(response.text)
    except Exception as e:
        if _is_quota_error(e):
            raise RuntimeError("QUOTA_EXCEEDED")
        raise


async def analyze_food_text(text: str) -> NutritionInfo:
    prompt = (
        f"{_INDIAN_FOOD_SYSTEM}\n\n"
        f'The user logged this meal: "{text}"\n\n'
        f'Return ONLY valid JSON:\n{NUTRITION_SCHEMA}'
    )
    try:
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=_MODEL,
            contents=prompt,
        )
        return _parse_nutrition_json(response.text)
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
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=_MODEL,
            contents=prompt,
        )
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if not match:
            return _SUGGESTIONS_FALLBACK
        return json.loads(match.group())
    except Exception:
        return _SUGGESTIONS_FALLBACK


def _weekly_summary_fallback(stats: dict) -> str:
    protein_pct = int(stats['avg_protein'] / stats['protein_target'] * 100) if stats['protein_target'] else 0
    calorie_pct = int(stats['avg_calories'] / stats['calorie_target'] * 100) if stats['calorie_target'] else 0
    return (
        f"You averaged {stats['avg_calories']:.0f} kcal/day ({calorie_pct}% of target) "
        f"and {stats['avg_protein']:.0f}g protein/day ({protein_pct}% of target) this week. "
        f"You hit your protein goal on {stats['protein_goal_days']}/7 days — keep pushing!"
    )


async def generate_weekly_summary(stats: dict) -> str:
    prompt = (
        f"You are a personal nutritionist. Generate a concise weekly summary (2-3 sentences) based on:\n"
        f"- Average daily calories: {stats['avg_calories']:.0f} / {stats['calorie_target']} kcal\n"
        f"- Average daily protein: {stats['avg_protein']:.0f}g / {stats['protein_target']}g\n"
        f"- Protein goal met: {stats['protein_goal_days']} / 7 days\n"
        f"- Calorie goal met: {stats['calorie_goal_days']} / 7 days\n"
        f"- Total meals logged: {stats['total_meals']}\n"
        f"- User goal: {stats['goal_type']}\n\n"
        "Be encouraging, specific, and actionable. Max 3 sentences."
    )
    try:
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=_MODEL,
            contents=prompt,
        )
        return response.text.strip()
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
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=_MODEL,
            contents=prompt,
        )
        return response.text.strip()
    except Exception:
        return "Sorry, I couldn't process that right now. Please try again."
