from twilio.rest import Client
from app.core.config import settings

_client = None


def get_twilio_client() -> Client:
    global _client
    if _client is None and settings.twilio_account_sid and settings.twilio_auth_token:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


def send_whatsapp_message(to: str, body: str) -> bool:
    client = get_twilio_client()
    if not client:
        return False
    try:
        client.messages.create(
            from_=settings.twilio_whatsapp_from,
            body=body,
            to=f"whatsapp:{to}" if not to.startswith("whatsapp:") else to,
        )
        return True
    except Exception:
        return False
