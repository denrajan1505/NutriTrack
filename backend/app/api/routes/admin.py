from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.supabase_client import get_user_from_token, supabase
from app.core.config import settings
from collections import defaultdict

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        user = get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if user["email"].lower() not in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/users")
async def list_users(_admin=Depends(require_admin)):
    # Fetch all auth users
    response = supabase.auth.admin.list_users()

    # Fetch subscription plans in bulk
    subs_res = supabase.table("subscriptions").select("user_id, plan, status").execute()
    sub_map = {
        s["user_id"]: s for s in (subs_res.data or [])
    }

    # Fetch meal log counts and last activity in bulk
    logs_res = supabase.table("meal_logs").select("user_id, logged_at").execute()
    meal_stats = defaultdict(lambda: {"meal_count": 0, "last_active": None})
    for log in (logs_res.data or []):
        uid = log["user_id"]
        meal_stats[uid]["meal_count"] += 1
        ts = log.get("logged_at")
        if ts and (not meal_stats[uid]["last_active"] or ts > meal_stats[uid]["last_active"]):
            meal_stats[uid]["last_active"] = ts

    users = []
    for u in response:
        uid = str(u.id)
        sub = sub_map.get(uid, {})
        plan = sub.get("plan", "free") if sub.get("status") == "active" else "free"
        stats = meal_stats[uid]
        users.append({
            "id": uid,
            "email": u.email or "",
            "full_name": (u.user_metadata or {}).get("full_name", ""),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_sign_in_at": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
            "email_confirmed": u.email_confirmed_at is not None,
            "plan": plan,
            "meal_count": stats["meal_count"],
            "last_active": stats["last_active"],
        })
    users.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return {"users": users, "total": len(users)}
