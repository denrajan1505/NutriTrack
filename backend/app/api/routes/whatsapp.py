from fastapi import APIRouter, Request, Form, Header, HTTPException
from app.services.gemini_service import analyze_whatsapp_message, analyze_food_text, analyze_food_image
from app.services.whatsapp_service import send_whatsapp_message
from app.core.supabase_client import supabase
from app.core.config import settings
from datetime import datetime
import httpx

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(""),
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(None),
    MediaContentType0: str = Form(None),
):
    phone = From.replace("whatsapp:", "")

    try:
        if NumMedia > 0 and MediaUrl0:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    MediaUrl0,
                    auth=(settings.twilio_account_sid, settings.twilio_auth_token),
                    timeout=15,
                )
                image_bytes = resp.content

            nutrition_result = await analyze_food_image(image_bytes)
            items = ", ".join(nutrition_result.food_items[:3]) if nutrition_result.food_items else "Food"
            ai_response = (
                f"🍽️ *{items}*\n\n"
                f"📊 Nutrition:\n"
                f"• Calories: {nutrition_result.calories} kcal\n"
                f"• Protein: {nutrition_result.protein}g\n"
                f"• Carbs: {nutrition_result.carbs}g\n"
                f"• Fat: {nutrition_result.fat}g\n\n"
                f"💬 {nutrition_result.description}"
            )
            description = items
        elif Body.strip():
            ai_response = await analyze_whatsapp_message(Body)
            nutrition_result = await analyze_food_text(Body)
            description = Body
        else:
            send_whatsapp_message(phone, "Please send me a food photo or describe what you ate and I'll analyze the nutrition!")
            return {"status": "ok"}

        user_result = supabase.table("whatsapp_users").select("user_id").eq("phone", phone).execute()
        if user_result.data:
            user_id = user_result.data[0]["user_id"]
            supabase.table("meal_logs").insert({
                "user_id": user_id,
                "meal_type": "whatsapp",
                "description": description,
                "calories": nutrition_result.calories,
                "protein": nutrition_result.protein,
                "carbs": nutrition_result.carbs,
                "fat": nutrition_result.fat,
                "logged_at": datetime.now().isoformat(),
            }).execute()

        send_whatsapp_message(phone, ai_response)

    except Exception:
        send_whatsapp_message(phone, "Sorry, I couldn't analyze that. Please try again with more detail about your meal.")

    return {"status": "ok"}


@router.post("/link-phone")
async def link_phone(phone: str, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = supabase.auth.get_user(token)
        user_id = user.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    supabase.table("whatsapp_users").upsert({"user_id": user_id, "phone": phone}, on_conflict="user_id").execute()
    return {"message": f"Phone {phone} linked to your account"}
