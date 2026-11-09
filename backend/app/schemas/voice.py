from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class VoiceTranscribeRequest(BaseModel):
    language_code: Optional[str] = "te-IN"
    model: Optional[str] = "prisma-v3.0"
    format: Optional[str] = "transcribe"

class VoiceCommandIntent(BaseModel):
    intent: str  # inventory_sale, inventory_add, check_stock, create_order, daily_summary, price_inquiry, unknown, get_profit_loss, get_revenue, get_sales_analytics, get_customer_analytics, get_inventory_health, compare_periods, get_business_insights
    product_name: Optional[str] = None
    matched_product_id: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = "kg"
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    timeframe: Optional[str] = None
    period_label: Optional[str] = None
    language: str = "te"
    confidence: float = 1.0
    requires_confirmation: bool = False
    clarification_prompt: Optional[str] = None

class VoiceProcessRequest(BaseModel):
    transcription: Optional[str] = None
    language_code: Optional[str] = "te-IN"
    execute_transaction: bool = False
    idempotency_key: Optional[str] = None

class VoiceProcessResponse(BaseModel):
    command_id: str
    transcription: str
    detected_language: str
    intent: VoiceCommandIntent
    action_status: str  # PREVIEW_READY, EXECUTED, CONFIRMATION_REQUIRED, AMBIGUOUS, ERROR
    natural_response: str
    spoken_audio_url: Optional[str] = None
    spoken_audio_base64: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    latency_ms: float
    model_info: Dict[str, str]

class SpokenSynthesisRequest(BaseModel):
    text: str
    language: str = "te-IN"
    voice: Optional[str] = "Nalini"
    model: Optional[str] = "timbre-v2.5"
    speed: Optional[float] = 1.0

class VoiceCommandLogResponse(BaseModel):
    id: str
    transcription: str
    detected_language: str
    intent: str
    confidence: float
    requires_confirmation: bool
    is_confirmed: bool
    executed_action: Optional[str] = None
    response_text: Optional[str] = None
    latency_ms: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
