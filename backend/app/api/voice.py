import time
import json
import uuid
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.core.security import get_current_user, decode_access_token
from backend.app.models.business import User
from backend.app.models.voice import VoiceCommand
from backend.app.models.inventory import Product
from backend.app.schemas.voice import (
    VoiceProcessResponse, VoiceCommandIntent,
    SpokenSynthesisRequest, VoiceCommandLogResponse
)
from backend.app.schemas.sale import SaleCreate, SaleItemCreate
from backend.app.services.gnani_stt import gnani_stt_service
from backend.app.services.gnani_tts import gnani_tts_service
from backend.app.services.voice_nlu import voice_nlu_engine
from backend.app.services.inventory_service import inventory_service
from backend.app.services.sales_service import sales_service
from backend.app.services.analytics_service import analytics_service

router = APIRouter(prefix="/voice", tags=["Voice Engine (Gnani Prisma & Timbre)"])

@router.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: Optional[str] = Form("te-IN"),
    model: Optional[str] = Form("prisma-v3.0"),
    current_user: User = Depends(get_current_user)
):
    """
    Direct Gnani Prisma STT proxy endpoint.
    Accepts audio file and forwards to Gnani STT API.
    """
    content = await audio_file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (Max 10MB)")

    result = await gnani_stt_service.transcribe_audio(
        audio_bytes=content,
        filename=audio_file.filename or "audio.wav",
        content_type=audio_file.content_type or "audio/wav",
        language_code=language_code,
        model=model
    )
    return result

@router.post("/synthesize")
async def synthesize_speech(
    data: SpokenSynthesisRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Direct Gnani Timbre TTS proxy endpoint.
    Synthesizes speech and returns binary WAV audio stream.
    """
    result = await gnani_tts_service.synthesize_speech(
        text=data.text,
        language=data.language,
        voice=data.voice,
        model=data.model,
        speed=data.speed or 1.0
    )
    return Response(
        content=result["audio_bytes"],
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=timbre_response.wav"}
    )

@router.post("/process-command", response_model=VoiceProcessResponse)
async def process_voice_command(
    audio_file: Optional[UploadFile] = File(None),
    transcription_text: Optional[str] = Form(None),
    language_code: Optional[str] = Form("te-IN"),
    execute_transaction: bool = Form(False),
    idempotency_key: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Full End-to-End Voice Processing Pipeline:
    Audio/Text -> Gnani Prisma STT -> NLU Slot Filling -> Business Validation -> DB Execution -> Gnani Timbre TTS
    """
    start_time = time.time()
    command_uuid = str(uuid.uuid4())
    actual_transcript = ""
    detected_lang = language_code or "te-IN"
    stt_model_used = "text-input"

    # 1. Speech-to-Text via Gnani Prisma if audio provided
    if audio_file:
        audio_bytes = await audio_file.read()
        stt_res = await gnani_stt_service.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=audio_file.filename or "recording.wav",
            content_type=audio_file.content_type or "audio/wav",
            language_code=language_code
        )
        if not stt_res.get("success"):
            raise HTTPException(status_code=502, detail=f"Gnani STT failed: {stt_res.get('error')}")
        actual_transcript = stt_res.get("transcript", "")
        detected_lang = stt_res.get("detected_language_code", detected_lang)
        stt_model_used = stt_res.get("model", "prisma-v3.0")
    elif transcription_text:
        actual_transcript = transcription_text.strip()
    else:
        raise HTTPException(status_code=400, detail="Either audio_file or transcription_text must be provided")

    # 2. Retrieve current product catalogue for fuzzy & multilingual alias matching
    catalog_products = await inventory_service.get_products(db, current_user.business_id)

    # 3. Multilingual NLU & Slot Extraction
    nlu_result = voice_nlu_engine.parse_command(actual_transcript, catalog_products)
    intent_str = nlu_result["intent"]
    product_dict = nlu_result["matched_product_details"]
    quantity = nlu_result["quantity"]
    unit = nlu_result["unit"]

    action_status = "PREVIEW_READY"
    execution_result = {}
    business_context = {}

    # 4. Business Validation & Optional Execution
    if intent_str == "inventory_sale":
        if not product_dict:
            action_status = "AMBIGUOUS"
            business_context["clarification_needed"] = True
        elif not quantity:
            action_status = "AMBIGUOUS"
            business_context["clarification_needed"] = True
        else:
            avail_stock = float(product_dict["current_stock"])
            unit_price = float(product_dict["selling_price"])
            total_price = unit_price * quantity
            business_context["remaining_stock"] = avail_stock
            business_context["total_price"] = total_price
            business_context["unit_price"] = unit_price

            if avail_stock < quantity:
                action_status = "REJECTED"
                business_context["insufficient_stock"] = True
            elif execute_transaction:
                # Execute transaction atomically
                sale_create = SaleCreate(
                    items=[
                        SaleItemCreate(
                            product_id=product_dict["id"],
                            quantity=Decimal(str(quantity)),
                            unit_price=Decimal(str(unit_price))
                        )
                    ],
                    payment_method="cash",
                    notes=f"Voice Sale: '{actual_transcript}'",
                    idempotency_key=idempotency_key or command_uuid
                )
                sale = await sales_service.create_sale(
                    db=db,
                    business_id=current_user.business_id,
                    sale_data=sale_create,
                    reference_type="voice_command",
                    reference_id=command_uuid
                )
                action_status = "EXECUTED"
                new_balance = avail_stock - quantity
                business_context["remaining_stock"] = new_balance
                execution_result = {
                    "sale_id": sale.id,
                    "invoice_number": sale.invoice_number,
                    "product_id": product_dict["id"],
                    "product_name": product_dict["name"],
                    "quantity_sold": quantity,
                    "unit": unit,
                    "total_amount": total_price,
                    "new_stock": new_balance
                }
            else:
                action_status = "CONFIRMATION_REQUIRED" if nlu_result["requires_confirmation"] else "PREVIEW_READY"
                execution_result = {
                    "product_id": product_dict["id"],
                    "product_name": product_dict["name"],
                    "quantity": quantity,
                    "unit": unit,
                    "total_amount": total_price,
                    "projected_remaining_stock": avail_stock - quantity
                }

    elif intent_str == "inventory_add":
        if not product_dict or not quantity:
            action_status = "AMBIGUOUS"
        elif execute_transaction:
            success, prod, err = await inventory_service.adjust_stock(
                db=db,
                business_id=current_user.business_id,
                product_id=product_dict["id"],
                quantity_delta=Decimal(str(quantity)),
                tx_type="IN",
                reference_type="voice_restock",
                notes=f"Voice Restock: '{actual_transcript}'"
            )
            action_status = "EXECUTED" if success else "ERROR"
            new_bal = float(prod.current_stock) if prod else 0
            business_context["remaining_stock"] = new_bal
            execution_result = {
                "product_id": product_dict["id"],
                "product_name": product_dict["name"],
                "quantity_added": quantity,
                "unit": unit,
                "new_stock": new_bal
            }
        else:
            action_status = "CONFIRMATION_REQUIRED"
            business_context["remaining_stock"] = float(product_dict["current_stock"]) + quantity
            execution_result = {
                "product_id": product_dict["id"],
                "product_name": product_dict["name"],
                "quantity_to_add": quantity,
                "unit": unit,
                "projected_stock": float(product_dict["current_stock"]) + quantity
            }

    elif intent_str == "check_stock":
        if product_dict:
            action_status = "EXECUTED"
            business_context["remaining_stock"] = float(product_dict["current_stock"])
            execution_result = {
                "product_id": product_dict["id"],
                "product_name": product_dict["name"],
                "current_stock": float(product_dict["current_stock"]),
                "unit": product_dict["unit"]
            }
        else:
            action_status = "AMBIGUOUS"

    elif intent_str == "price_inquiry":
        if product_dict:
            action_status = "EXECUTED"
            business_context["unit_price"] = float(product_dict["selling_price"])
            execution_result = {
                "product_id": product_dict["id"],
                "product_name": product_dict["name"],
                "selling_price": float(product_dict["selling_price"]),
                "unit": product_dict["unit"]
            }
        else:
            action_status = "AMBIGUOUS"

    elif intent_str == "daily_summary":
        summary = await analytics_service.get_dashboard_summary(db, current_user.business_id)
        action_status = "EXECUTED"
        business_context["today_sales"] = summary.today_sales
        business_context["today_orders"] = summary.today_orders
        execution_result = {
            "today_sales": summary.today_sales,
            "today_orders": summary.today_orders,
            "total_revenue": summary.total_revenue
        }

    # 5. Multilingual Natural Response Generation
    natural_response = voice_nlu_engine.generate_natural_response(nlu_result, business_context)

    # 6. Synthesize Speech via Gnani Timbre
    tts_lang = "te-IN" if "te" in detected_lang.lower() else "en-IN"
    tts_res = await gnani_tts_service.synthesize_speech(
        text=natural_response,
        language=tts_lang
    )

    elapsed_ms = (time.time() - start_time) * 1000

    # 7. Persist Voice Command Audit Log
    try:
        cmd_log = VoiceCommand(
            id=command_uuid,
            business_id=current_user.business_id,
            user_id=current_user.id,
            idempotency_key=idempotency_key,
            transcription=actual_transcript,
            detected_language=detected_lang,
            intent=intent_str,
            slots=json.dumps({k: v for k, v in nlu_result.items() if k != "matched_product_details"}),
            confidence=float(nlu_result["confidence"]),
            requires_confirmation=bool(nlu_result["requires_confirmation"]),
            is_confirmed=(action_status == "EXECUTED"),
            executed_action=action_status,
            timbre_audio_generated=bool(tts_res.get("success", False)),
            response_text=natural_response,
            latency_ms=float(elapsed_ms)
        )
        db.add(cmd_log)
        await db.commit()
    except Exception as e:
        logger.error(f"VoiceCommand persist error: {e}")

    return VoiceProcessResponse(
        command_id=command_uuid,
        transcription=actual_transcript,
        detected_language=detected_lang,
        intent=VoiceCommandIntent(
            intent=intent_str,
            product_name=nlu_result.get("product_name"),
            matched_product_id=nlu_result.get("matched_product_id"),
            quantity=nlu_result.get("quantity"),
            unit=nlu_result.get("unit"),
            unit_price=business_context.get("unit_price"),
            total_amount=business_context.get("total_price"),
            language=nlu_result.get("language", "te"),
            confidence=nlu_result.get("confidence", 1.0),
            requires_confirmation=nlu_result.get("requires_confirmation", False)
        ),
        action_status=action_status,
        natural_response=natural_response,
        spoken_audio_url=None,
        spoken_audio_base64=tts_res.get("audio_base64"),
        execution_result=execution_result,
        latency_ms=round(elapsed_ms, 2),
        model_info={
            "stt_engine": f"Gnani Prisma ({stt_model_used})",
            "tts_engine": f"Gnani Timbre ({tts_res.get('model', 'timbre-v2.5')})",
            "voice": tts_res.get("voice", "Nalini"),
            "live_gnani_stt": str(stt_res.get("is_live_api", False) if audio_file else False),
            "live_gnani_tts": str(tts_res.get("is_live_api", False))
        }
    )

@router.get("/history", response_model=List[VoiceCommandLogResponse])
async def list_voice_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(VoiceCommand).filter(
        VoiceCommand.business_id == current_user.business_id
    ).order_by(VoiceCommand.created_at.desc()).limit(30)
    res = await db.execute(query)
    logs = res.scalars().all()
    return logs

@router.websocket("/stream")
async def websocket_voice_stream(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """
    Real-Time WebSocket Audio Streaming Endpoint.
    Accepts continuous binary PCM/WAV audio frames or JSON command frames.
    Returns low-latency streaming state, transcriptions, and speech output.
    """
    await websocket.accept()

    # Authenticate via query param token or default to demo business
    business_id = None
    if token:
        try:
            payload = decode_access_token(token)
            async with AsyncSessionLocal() as session:
                user_res = await session.execute(
                    select(User).filter(User.id == payload.get("sub"))
                )
                user = user_res.scalar_one_or_none()
                if user:
                    business_id = user.business_id
        except Exception:
            pass

    audio_chunks = bytearray()
    language_code = "te-IN"

    try:
        await websocket.send_json({
            "type": "ready",
            "message": "VyapariMitra Real-Time Voice Stream Connected",
            "supported_languages": ["te-IN", "en-IN", "te-en"]
        })

        while True:
            message = await websocket.receive()
            if "bytes" in message and message["bytes"]:
                # Binary audio chunk
                audio_chunks.extend(message["bytes"])
                await websocket.send_json({
                    "type": "chunk_received",
                    "buffered_bytes": len(audio_chunks)
                })
            elif "text" in message and message["text"]:
                data = json.loads(message["text"])
                msg_type = data.get("type")

                if msg_type == "config":
                    language_code = data.get("language", language_code)
                    await websocket.send_json({"type": "config_updated", "language": language_code})

                elif msg_type == "text_command":
                    # Instant text command evaluation
                    user_text = data.get("text", "")
                    async with AsyncSessionLocal() as session:
                        products_data = []
                        if business_id:
                            products_data = await inventory_service.get_products(session, business_id)
                        nlu_res = voice_nlu_engine.parse_command(user_text, products=products_data)
                        tts_res = await gnani_tts_service.synthesize_speech(
                            text=nlu_res.get("spoken_response", "ఆదేశం స్వీకరించబడింది"),
                            language=language_code
                        )
                        await websocket.send_json({
                            "type": "result",
                            "transcription": user_text,
                            "intent": nlu_res,
                            "spoken_audio_base64": tts_res.get("audio_base64")
                        })

                elif msg_type == "finalize_audio":
                    # Transcribe buffered audio
                    if len(audio_chunks) > 0:
                        stt_res = await gnani_stt_service.transcribe_audio(
                            audio_bytes=bytes(audio_chunks),
                            filename="stream.wav",
                            language_code=language_code
                        )
                        transcript = stt_res.get("transcription", "")
                        await websocket.send_json({
                            "type": "transcription",
                            "text": transcript
                        })

                        async with AsyncSessionLocal() as session:
                            products_data = []
                            if business_id:
                                products_data = await inventory_service.get_products(session, business_id)
                            nlu_res = voice_nlu_engine.parse_command(transcript, products=products_data)
                            tts_res = await gnani_tts_service.synthesize_speech(
                                text=nlu_res.get("spoken_response", "ఆదేశం స్వీకరించబడింది"),
                                language=language_code
                            )
                            await websocket.send_json({
                                "type": "result",
                                "transcription": transcript,
                                "intent": nlu_res,
                                "spoken_audio_base64": tts_res.get("audio_base64")
                            })
                        audio_chunks.clear()
                    else:
                        await websocket.send_json({"type": "error", "message": "No audio buffered"})

                elif msg_type == "reset":
                    audio_chunks.clear()
                    await websocket.send_json({"type": "reset_ack"})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
            await websocket.close()
        except Exception:
            pass

