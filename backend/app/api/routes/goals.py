from fastapi import APIRouter, Header, HTTPException
from app.core.supabase_client import supabase, get_user_id_from_token
from app.models.schemas import UserGoalCreate, UserGoalResponse
from app.services.nutrition_service import calculate_targets

router = APIRouter(prefix="/goals", tags=["goals"])


def get_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_id_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/", response_model=UserGoalResponse)
async def set_goal(goal: UserGoalCreate, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    targets = calculate_targets(goal)

    row = {
        "user_id": user_id,
        "goal_type": goal.goal_type.value,
        "target_weight": goal.target_weight,
        "current_weight": goal.current_weight,
        "height": goal.height,
        "age": goal.age,
        "activity_level": goal.activity_level,
        **targets,
    }

    result = supabase.table("user_goals").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save goal")
    return UserGoalResponse(**result.data[0])


@router.get("/", response_model=UserGoalResponse)
async def get_current_goal(authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    result = (
        supabase.table("user_goals")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="No goal set")
    return UserGoalResponse(**result.data[0])


@router.put("/", response_model=UserGoalResponse)
async def update_goal(goal: UserGoalCreate, authorization: str = Header(...)):
    user_id = get_user_id(authorization)
    targets = calculate_targets(goal)

    existing = (
        supabase.table("user_goals")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    row = {
        "goal_type": goal.goal_type.value,
        "target_weight": goal.target_weight,
        "current_weight": goal.current_weight,
        "height": goal.height,
        "age": goal.age,
        "activity_level": goal.activity_level,
        **targets,
    }

    if existing.data:
        result = supabase.table("user_goals").update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        row["user_id"] = user_id
        result = supabase.table("user_goals").insert(row).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to update goal")
    return UserGoalResponse(**result.data[0])
