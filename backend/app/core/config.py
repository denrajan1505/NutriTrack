from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    gemini_api_key: str = ""
    openai_api_key: str = ""

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"

    secret_key: str = "change-me-in-production"
    cors_origins: List[str] = ["http://localhost:5173"]
    admin_emails: List[str] = []

    dodo_api_key: str = ""
    dodo_webhook_secret: str = ""
    dodo_pro_product_id: str = ""
    dodo_premium_product_id: str = ""
    dodo_pro_annual_product_id: str = ""
    dodo_premium_annual_product_id: str = ""
    frontend_url: str = "https://nutries.appden.sbs"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
