from fastapi import APIRouter, Header, HTTPException, Depends
from app.core.supabase_client import get_user_from_token, supabase
from app.core.config import settings

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
    response = supabase.auth.admin.list_users()
    users = []
    for u in response:
        users.append({
            "id": str(u.id),
            "email": u.email or "",
            "full_name": (u.user_metadata or {}).get("full_name", ""),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_sign_in_at": u.last_sign_in_at.isoformat() if u.last_sign_in_at else None,
            "email_confirmed": u.email_confirmed_at is not None,
        })
    users.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return {"users": users, "total": len(users)}
