import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class VoiceSession(Base):
    __tablename__ = "voice_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    language_code = Column(String(10), default="te-IN", nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    ended_at = Column(DateTime, nullable=True)

    business = relationship("Business", back_populates="voice_sessions")
    commands = relationship("VoiceCommand", back_populates="session", cascade="all, delete-orphan")

class VoiceCommand(Base):
    __tablename__ = "voice_commands"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    idempotency_key = Column(String(64), unique=True, nullable=True, index=True)
    transcription = Column(Text, nullable=False)
    detected_language = Column(String(10), default="te-IN", nullable=False)
    intent = Column(String(64), nullable=False, index=True)
    slots = Column(Text, default="{}", nullable=False)  # JSON representation of extracted entities
    confidence = Column(Float, default=1.0, nullable=False)
    requires_confirmation = Column(Boolean, default=False, nullable=False)
    is_confirmed = Column(Boolean, default=True, nullable=False)
    executed_action = Column(String(64), nullable=True)  # sale_completed, stock_updated, query_answered, rejected
    timbre_audio_generated = Column(Boolean, default=False, nullable=False)
    response_text = Column(Text, nullable=True)
    latency_ms = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    session = relationship("VoiceSession", back_populates="commands")
    business = relationship("Business", back_populates="voice_commands")

