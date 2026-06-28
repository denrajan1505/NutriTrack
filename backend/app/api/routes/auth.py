from fastapi import APIRouter, Header, HTTPException
from app.core.supabase_client import get_user_from_token, supabase
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
async def get_me(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    sub = supabase.table("subscriptions").select("plan, status").eq("user_id", user["id"]).maybe_single().execute()
    plan = "free"
    if sub and sub.data and sub.data.get("status") == "active":
        plan = sub.data.get("plan", "free")

    return {
        "id": user["id"],
        "email": user["email"],
        "is_admin": user["email"].lower() in [e.lower() for e in settings.admin_emails],
        "plan": plan,
    }
