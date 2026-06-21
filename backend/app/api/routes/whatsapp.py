from fastapi import APIRouter, Request, Form, Header, HTTPException
from app.services.gemini_service import analyze_whatsapp_message, analyze_food_text
from app.services.whatsapp_service import send_whatsapp_message
from app.core.supabase_client import supabase
from datetime import date, datetime

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


@router.post("/webhook")
async def whatsapp_webhook(
    From: str = Form(...),
    Body: str = Form(...),
    NumMedia: int = Form(0),
):
    phone = From.replace("whatsapp:", "")

    try:
        ai_response = await analyze_whatsapp_message(Body)

        nutrition_result = await analyze_food_text(Body)

        user_result = supabase.table("whatsapp_users").select("user_id").eq("phone", phone).execute()
        if user_result.data:
            user_id = user_result.data[0]["user_id"]
            supabase.table("meal_logs").insert({
                "user_id": user_id,
                "meal_type": "whatsapp",
                "description": Body,
                "calories": nutrition_result.calories,
                "protein": nutrition_result.protein,
                "carbs": nutrition_result.carbs,
                "fat": nutrition_result.fat,
                "logged_at": datetime.now().isoformat(),
            }).execute()

        send_whatsapp_message(phone, ai_response)

    except Exception as e:
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

    supabase.table("whatsapp_users").upsert({"user_id": user_id, "phone": phone}).execute()
    return {"message": f"Phone {phone} linked to your account"}
