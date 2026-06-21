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

_INDIAN_FOOD_SYSTEM = """You are a professional nutritionist and dietitian with deep expertise in Indian cuisine — both North and South Indian. You provide highly accurate nutritional estimates based on standard Indian food composition tables (NIN India / ICMR data).

ACCURACY RULES:
- Use realistic Indian home-cooked portion sizes, not restaurant portions
- Base values on ICMR/NIN nutritional data for Indian foods
- Account for oil/ghee used in cooking (typically 1-2 tsp per serving)

REFERENCE VALUES (use these as anchors):
- Idli (1 medium, 40g): 65 kcal, 2g protein, 13g carbs, 0.4g fat
- Dosa (1 plain, 80g): 120 kcal, 3g protein, 22g carbs, 3g fat
- Sambar (1 cup, 200ml): 80 kcal, 4g protein, 12g carbs, 2g fat
- Coconut chutney (2 tbsp): 60 kcal, 1g protein, 3g carbs, 5g fat
- Chapati/Roti (1, 30g): 80 kcal, 3g protein, 15g carbs, 1.5g fat
- Paratha (1, 60g): 180 kcal, 4g protein, 25g carbs, 7g fat
- Rice (1 cup cooked, 150g): 195 kcal, 4g protein, 43g carbs, 0.4g fat
- Dal (1 cup, 200ml): 150 kcal, 9g protein, 24g carbs, 3g fat
- Chicken curry (1 serving, 150g): 220 kcal, 22g protein, 6g carbs, 12g fat
- Egg (1 whole boiled): 78 kcal, 6g protein, 0.6g carbs, 5g fat
- Paneer (100g): 265 kcal, 18g protein, 3g carbs, 20g fat
- Biryani (1 plate, 300g): 450 kcal, 18g protein, 65g carbs, 14g fat
- Upma (1 cup, 180g): 200 kcal, 5g protein, 32g carbs, 6g fat
- Poha (1 cup, 180g): 220 kcal, 4g protein, 38g carbs, 6g fat
- Curd/Yogurt (100g): 60 kcal, 3g protein, 4g carbs, 3g fat
- Oats porridge (1 cup, 200ml): 150 kcal, 5g protein, 27g carbs, 3g fat

CRITICAL: Always use the EXACT food name the user mentioned. Never substitute or rename:
- Pongal ≠ upma ≠ khichdi
- Idli ≠ dosa ≠ uttapam
- Poha ≠ upma
- Paratha ≠ chapati ≠ roti
- Sambar ≠ rasam ≠ dal

Calculate totals by summing each item based on the quantity mentioned. Be precise."""


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
                        {"type": "text", "text": f"Identify this food and return ONLY valid JSON:\n{NUTRITION_SCHEMA}"},
                    ],
                },
            ],
            max_tokens=500,
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
        response = await _client.chat.completions.create(
            model=_TEXT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
        )
        return response.choices[0].message.content.strip()
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
