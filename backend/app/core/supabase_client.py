import base64
import json
from supabase import create_client, Client
from app.core.config import settings

# Service key bypasses RLS — correct for server-side operations
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_key)


def _decode_jwt_payload(token: str) -> dict:
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_b64))
    except Exception:
        raise ValueError("Invalid token")


def get_user_id_from_token(token: str) -> str:
    payload = _decode_jwt_payload(token)
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("No sub claim")
    return user_id


def get_user_from_token(token: str) -> dict:
    payload = _decode_jwt_payload(token)
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("No sub claim")
    return {"id": user_id, "email": payload.get("email", "")}
