from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class GoalType(str, Enum):
    weight_loss = "weight_loss"
    weight_gain = "weight_gain"
    muscle_building = "muscle_building"
    maintenance = "maintenance"


class NutritionInfo(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: Optional[float] = None
    meal_quality_score: Optional[int] = None
    food_items: Optional[List[str]] = None
    description: Optional[str] = None


class MealLogCreate(BaseModel):
    meal_type: str  # breakfast, lunch, dinner, snack
    description: Optional[str] = None
    date: Optional[date] = None


class ManualMealLogCreate(BaseModel):
    meal_type: str
    description: Optional[str] = None
    date: Optional[date] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: Optional[float] = None


class MealLogResponse(BaseModel):
    id: str
    user_id: str
    meal_type: str
    description: Optional[str]
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: Optional[float]
    meal_quality_score: Optional[int]
    food_items: Optional[List[str]]
    image_url: Optional[str]
    logged_at: datetime


class UserGoalCreate(BaseModel):
    goal_type: GoalType
    gender: Optional[str] = "male"
    target_weight: Optional[float] = None
    current_weight: Optional[float] = None
    height: Optional[float] = None
    age: Optional[int] = None
    activity_level: Optional[str] = "moderate"


class UserGoalResponse(BaseModel):
    id: str
    user_id: str
    goal_type: str
    daily_calorie_target: int
    daily_protein_target: int
    daily_carbs_target: int
    daily_fat_target: int
    daily_water_target: float
    target_weight: Optional[float]
    current_weight: Optional[float]
    height: Optional[float]
    age: Optional[int]
    activity_level: Optional[str]
    gender: Optional[str]


class DashboardSummary(BaseModel):
    date: date
    total_calories: float
    total_protein: float
    total_carbs: float
    total_fat: float
    water_intake: float
    calorie_target: int
    protein_target: int
    carbs_target: int
    fat_target: int
    water_target: float
    meals: List[MealLogResponse]


class WaterLogCreate(BaseModel):
    amount_liters: float
    date: Optional[date] = None


class TextAnalysisRequest(BaseModel):
    text: str
    meal_type: Optional[str] = "meal"


class VoiceAnalysisResponse(BaseModel):
    transcript: str
    nutrition: NutritionInfo


class WeeklySummary(BaseModel):
    week_start: date
    week_end: date
    avg_daily_calories: float
    avg_daily_protein: float
    avg_daily_carbs: float
    avg_daily_fat: float
    protein_goal_met_days: int
    calorie_goal_met_days: int
    total_meals_logged: int
    ai_summary: str
    nutrition_score: int


class MealSuggestion(BaseModel):
    food_name: str
    portion: str
    calories: float
    protein: float
    reason: str


class SuggestionsResponse(BaseModel):
    current_protein: float
    protein_goal: float
    protein_gap: float
    suggestions: List[MealSuggestion]
    motivational_tip: str
