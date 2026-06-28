from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import meals, dashboard, goals, whatsapp, auth, admin, payments

app = FastAPI(
    title="Nutries API",
    description="AI-powered nutrition tracking — Snap. Speak. Track.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(meals.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(goals.router, prefix="/api/v1")
app.include_router(whatsapp.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Nutries API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
