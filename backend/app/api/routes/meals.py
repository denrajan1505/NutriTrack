from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Header
from typing import Optional
from datetime import date, datetime
import uuid

from app.core.supabase_client import supabase, get_user_id_from_token
from app.models.schemas import MealLogCreate, ManualMealLogCreate, MealLogResponse, TextAnalysisRequest, NutritionInfo
from app.services.gemini_service import analyze_food_image, analyze_food_text
from app.services.voice_service import analyze_voice_message

router = APIRouter(prefix="/meals", tags=["meals"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/analyze/photo", response_model=NutritionInfo)
async def analyze_photo(
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    nutrition = await analyze_food_image(contents)
    return nutrition


@router.post("/analyze/text", response_model=NutritionInfo)
async def analyze_text(
    request: TextAnalysisRequest,
    authorization: str = Header(...),
):
    get_user_id(authorization)
    try:
        nutrition = await analyze_food_text(request.text)
    except RuntimeError as e:
        if str(e) == "QUOTA_EXCEEDED":
            raise HTTPException(status_code=429, detail="AI quota exceeded. Please try again in a few minutes.")
        raise HTTPException(status_code=500, detail="Analysis failed")
    return nutrition


@router.post("/analyze/voice", response_model=dict)
async def analyze_voice(
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    get_user_id(authorization)
    contents = await file.read()
    try:
        result = await analyze_voice_message(contents, file.filename or "audio.webm")
    except RuntimeError as e:
        if str(e) == "QUOTA_EXCEEDED":
            raise HTTPException(status_code=429, detail="AI quota exceeded. Please try again in a few minutes.")
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")
    return {"transcript": result.transcript, "nutrition": result.nutrition.model_dump()}


@router.post("/log/photo", response_model=MealLogResponse)
async def log_meal_from_photo(
    file: UploadFile = File(...),
    meal_type: str = Form("meal"),
    meal_date: Optional[str] = Form(None),
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)
    contents = await file.read()

    nutrition = await analyze_food_image(contents)

    image_url = None
    try:
        file_path = f"{user_id}/{uuid.uuid4()}.jpg"
        supabase.storage.from_("meal-images").upload(file_path, contents)
        image_url = supabase.storage.from_("meal-images").get_public_url(file_path)
    except Exception:
        pass

    log_date = date.fromisoformat(meal_date) if meal_date else date.today()

    row = {
        "user_id": user_id,
        "meal_type": meal_type,
        "calories": nutrition.calories,
        "protein": nutrition.protein,
        "carbs": nutrition.carbs,
        "fat": nutrition.fat,
        "fiber": nutrition.fiber,
        "meal_quality_score": nutrition.meal_quality_score,
        "food_items": nutrition.food_items,
        "image_url": image_url,
        "description": nutrition.description,
        "logged_at": datetime.combine(log_date, datetime.now().time()).isoformat(),
    }

    result = supabase.table("meal_logs").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")
    return MealLogResponse(**result.data[0])


@router.post("/log/text", response_model=MealLogResponse)
async def log_meal_from_text(
    request: MealLogCreate,
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)

    if not request.description:
        raise HTTPException(status_code=400, detail="Description required")

    try:
        nutrition = await analyze_food_text(request.description)
    except RuntimeError as e:
        if str(e) == "QUOTA_EXCEEDED":
            raise HTTPException(status_code=429, detail="AI quota exceeded. Please try again in a few minutes.")
        raise HTTPException(status_code=500, detail="Analysis failed")
    log_date = request.date or date.today()

    row = {
        "user_id": user_id,
        "meal_type": request.meal_type,
        "description": request.description,
        "calories": nutrition.calories,
        "protein": nutrition.protein,
        "carbs": nutrition.carbs,
        "fat": nutrition.fat,
        "fiber": nutrition.fiber,
        "meal_quality_score": nutrition.meal_quality_score,
        "food_items": nutrition.food_items,
        "logged_at": datetime.combine(log_date, datetime.now().time()).isoformat(),
    }

    result = supabase.table("meal_logs").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")
    return MealLogResponse(**result.data[0])


@router.post("/log/voice", response_model=MealLogResponse)
async def log_meal_from_voice(
    file: UploadFile = File(...),
    meal_type: str = Form("meal"),
    meal_date: Optional[str] = Form(None),
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)
    contents = await file.read()
    try:
        result = await analyze_voice_message(contents, file.filename or "audio.webm")
    except RuntimeError as e:
        if str(e) == "QUOTA_EXCEEDED":
            raise HTTPException(status_code=429, detail="AI quota exceeded. Please try again in a few minutes.")
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")

    log_date = date.fromisoformat(meal_date) if meal_date else date.today()

    row = {
        "user_id": user_id,
        "meal_type": meal_type,
        "description": result.transcript,
        "calories": result.nutrition.calories,
        "protein": result.nutrition.protein,
        "carbs": result.nutrition.carbs,
        "fat": result.nutrition.fat,
        "fiber": result.nutrition.fiber,
        "meal_quality_score": result.nutrition.meal_quality_score,
        "food_items": result.nutrition.food_items,
        "logged_at": datetime.combine(log_date, datetime.now().time()).isoformat(),
    }

    db_result = supabase.table("meal_logs").insert(row).execute()
    if not db_result.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")
    return MealLogResponse(**db_result.data[0])


@router.post("/log/manual", response_model=MealLogResponse)
async def log_meal_manual(
    request: ManualMealLogCreate,
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)
    log_date = request.date or date.today()

    row = {
        "user_id": user_id,
        "meal_type": request.meal_type,
        "description": request.description,
        "calories": request.calories,
        "protein": request.protein,
        "carbs": request.carbs,
        "fat": request.fat,
        "fiber": request.fiber,
        "logged_at": datetime.combine(log_date, datetime.now().time()).isoformat(),
    }

    result = supabase.table("meal_logs").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save meal")
    return MealLogResponse(**result.data[0])


@router.get("/history", response_model=list[MealLogResponse])
async def get_meal_history(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    authorization: str = Header(...),
):
    user_id = get_user_id(authorization)
    query = supabase.table("meal_logs").select("*").eq("user_id", user_id).order("logged_at", desc=True).limit(limit)

    if start_date:
        query = query.gte("logged_at", start_date)
    if end_date:
        query = query.lte("logged_at", end_date + "T23:59:59")

    result = query.execute()
    return [MealLogResponse(**row) for row in result.data]


@router.delete("/{meal_id}")
async def delete_meal(meal_id: str, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    supabase.table("meal_logs").delete().eq("id", meal_id).eq("user_id", user_id).execute()
    return {"message": "Meal deleted"}
