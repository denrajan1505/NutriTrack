from fastapi import APIRouter, Header, HTTPException, Request, Depends
from app.core.supabase_client import get_user_from_token, supabase
from app.core.config import settings
from dodopayments import DodoPayments
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


def _get_dodo():
    return DodoPayments(
        bearer_token=settings.dodo_api_key,
        environment="live_mode",
    )


def _plan_maps():
    pm = {
        "pro": settings.dodo_pro_product_id,
        "premium": settings.dodo_premium_product_id,
        "pro_annual": settings.dodo_pro_annual_product_id,
        "premium_annual": settings.dodo_premium_annual_product_id,
    }
    return pm, {v: k for k, v in pm.items()}


def require_auth(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        return get_user_from_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/checkout")
async def create_checkout(plan: str, user=Depends(require_auth)):
    plan_products, _ = _plan_maps()
    if plan not in plan_products:
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'pro' or 'premium'")

    product_id = plan_products[plan]
    dodo = _get_dodo()

    try:
        response = dodo.checkout_sessions.create(
            product_cart=[{"product_id": product_id, "quantity": 1}],
            customer={"email": user["email"], "name": user["email"].split("@")[0]},
            return_url=f"{settings.frontend_url}/profile?payment=success",
            metadata={"user_id": user["id"], "plan": plan},
        )
        url = response.checkout_url
        if not url:
            raise HTTPException(status_code=500, detail="No checkout URL returned")
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("CHECKOUT ERROR: %s: %s", type(e).__name__, e, exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhook")
async def webhook(request: Request):
    body = await request.body()

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = payload.get("type", "")
    data = payload.get("data") or {}
    metadata = (payload.get("metadata")
                or (data.get("metadata") if isinstance(data, dict) else None)
                or {})

    logger.info("WEBHOOK received: type=%s metadata=%s data_keys=%s",
                event_type, metadata, list(data.keys()) if isinstance(data, dict) else [])

    if event_type == "subscription.active":
        _handle_subscription(data, metadata, "active")
    elif event_type in ("subscription.cancelled", "subscription.expired", "subscription.failed"):
        _handle_subscription(data, metadata, "cancelled")

    return {"ok": True}


def _handle_subscription(data: dict, metadata: dict, status: str):
    _, product_plans = _plan_maps()

    user_id = metadata.get("user_id") if metadata else None
    product_id = data.get("product_id") if isinstance(data, dict) else None
    subscription_id = data.get("subscription_id") if isinstance(data, dict) else None

    if not user_id:
        customer = data.get("customer") if isinstance(data, dict) else None
        email = (customer.get("email") if isinstance(customer, dict)
                 else getattr(customer, "email", None)) if customer else None
        if email:
            users = supabase.auth.admin.list_users()
            for u in users:
                if u.email == email:
                    user_id = str(u.id)
                    break

    if not user_id:
        logger.error("WEBHOOK: cannot find user_id. metadata=%s data=%s", metadata, data)
        return

    plan = product_plans.get(product_id, "pro") if status == "active" else "free"

    supabase.table("subscriptions").upsert(
        {"user_id": user_id, "plan": plan, "status": status,
         "dodo_subscription_id": subscription_id},
        on_conflict="user_id",
    ).execute()
    logger.info("WEBHOOK: updated user=%s plan=%s status=%s", user_id, plan, status)
