import os
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
            ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "VyapariMitra AI"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "vyaparimitra-super-secret-production-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Database URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./vyaparimitra.db"

    # Gnani AI Configuration
    GNANI_API_KEY: str = ""
    GNANI_API_BASE_URL: str = "https://api.vachana.ai"
    GNANI_STT_ENDPOINT: str = "https://api.vachana.ai/stt/v3"
    GNANI_TTS_ENDPOINT: str = "https://api.vachana.ai/api/v1/tts/inference"
    GNANI_STT_DEFAULT_MODEL: str = "prisma-v3.0"
    GNANI_STT_DEFAULT_LANG: str = "te-IN"
    GNANI_TTS_DEFAULT_MODEL: str = "timbre-v2.5"
    GNANI_TTS_DEFAULT_VOICE: str = "Nalini"

    # SMTP Email Configuration (Optional - falls back to dev console output)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@vyaparimitra.ai"
    SMTP_TLS: bool = True

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:8000"
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            import json
            try:
                return json.loads(v)
            except Exception:
                return ["*"]
        return v

settings = Settings()

