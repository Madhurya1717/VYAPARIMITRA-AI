import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, AsyncSessionLocal
from backend.app.api.router import api_router
from backend.app.services.seed_data import seed_demo_data_if_empty

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vyaparimitra")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing VyapariMitra AI database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified.")

    # Seed initial demo data
    async with AsyncSessionLocal() as session:
        await seed_demo_data_if_empty(session)
    logger.info("Demo store & products seeded successfully.")

    yield
    logger.info("Shutting down VyapariMitra AI application.")
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Multilingual Voice-Powered Business Operating System for Bharat Merchants",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    import json
    try:
        origins = json.loads(origins)
    except Exception:
        origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["Health & Status"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "gnani_stt_endpoint": settings.GNANI_STT_ENDPOINT,
        "gnani_tts_endpoint": settings.GNANI_TTS_ENDPOINT,
        "gnani_api_key_configured": bool(settings.GNANI_API_KEY and settings.GNANI_API_KEY.strip()),
        "supported_languages": ["te-IN", "en-IN", "hi-IN", "te-en (Tenglish)"],
        "database": "connected"
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "app": "VyapariMitra AI",
        "tagline": "Your Business. Your Voice. Your Language.",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR
    }
