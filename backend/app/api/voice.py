import time
import json
import uuid
import logging
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from backend.app.core.database import get_db, AsyncSessionLocal
from backend.app.core.security import get_current_user, decode_access_token
from backend.app.core.realtime import realtime_manager
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
from backend.app.services.bi_analytics_service import bi_service
from backend.app.services.bi_date_parser import BIDateParser
from backend.app.services.conversational_memory import conversational_memory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["Voice Engine (Gnani Prisma & Timbre)"])

@router.post("/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    language_code: Optional[str] = Form("indic-auto"),
    model: Optional[str] = Form("prisma-v3.0"),
    current_user: User = Depends(get_current_user)
):
    """
    Direct Gnani Prisma STT proxy endpoint.
    Accepts audio file and forwards to Gnani STT API with intelligent language normalization.
    """
    content = await audio_file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large (Max 10MB)")
    if len(content) < 44:
        raise HTTPException(status_code=400, detail="Audio file was empty. Please record audio and try again.")

    result = await gnani_stt_service.transcribe_audio(
        audio_bytes=content,
        filename=audio_file.filename or "audio.wav",
        content_type=audio_file.content_type or "audio/wav",
        language_code=language_code,
        model=model
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("user_message", "Voice transcription failed"))
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
    language_code: Optional[str] = Form("indic-auto"),
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
    detected_lang = language_code or "indic-auto"
    stt_model_used = "text-input"

    # 1. Speech-to-Text via Gnani Prisma if audio provided
    if audio_file:
        audio_bytes = await audio_file.read()
        if len(audio_bytes) < 44:
            raise HTTPException(
                status_code=400,
                detail="Audio recording was empty or too short. Please speak into your microphone and try again."
            )
        stt_res = await gnani_stt_service.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=audio_file.filename or "recording.wav",
            content_type=audio_file.content_type or "audio/wav",
            language_code=language_code
        )
        if not stt_res.get("success"):
            user_msg = stt_res.get("user_message") or "Voice transcription failed. Please try again or type your command."
            raise HTTPException(status_code=400, detail=user_msg)
        actual_transcript = (stt_res.get("transcript") or "").strip()
        if not actual_transcript:
            raise HTTPException(
                status_code=400,
                detail="No clear speech could be recognized. Please speak closer to your microphone and try again."
            )
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

    # 3b. Conversational Context Resolution for Multi-Turn Follow-Ups
    follow_up_resolved = conversational_memory.resolve_follow_up(
        text=actual_transcript,
        detected_intent=nlu_result["intent"],
        matched_product=nlu_result.get("matched_product_details"),
        detected_timeframe=nlu_result.get("timeframe"),
        business_id=current_user.business_id,
        user_id=current_user.id
    )

    if follow_up_resolved.get("is_follow_up"):
        nlu_result["intent"] = follow_up_resolved["intent"]
        nlu_result["clarification_prompt"] = None
        if follow_up_resolved.get("matched_product"):
            prod = follow_up_resolved["matched_product"]
            nlu_result["matched_product_details"] = prod
            nlu_result["product_name"] = prod.get("name")
            nlu_result["matched_product_id"] = prod.get("id")

        if follow_up_resolved.get("timeframe"):
            tf_data = BIDateParser.parse_timeframe(follow_up_resolved["timeframe"].replace("_", " "))
            nlu_result["timeframe"] = tf_data["timeframe"]
            nlu_result["period_label"] = tf_data["label"]
            nlu_result["period_label_te"] = tf_data["label_te"]
            nlu_result["start_utc"] = tf_data["start_utc"]
            nlu_result["end_utc"] = tf_data["end_utc"]
            if follow_up_resolved.get("previous_timeframe"):
                nlu_result["comparison_timeframe"] = follow_up_resolved["previous_timeframe"]
                nlu_result["is_comparison"] = True

    intent_str = nlu_result["intent"]
    product_dict = nlu_result["matched_product_details"]
    quantity = nlu_result["quantity"]
    unit = nlu_result["unit"]

    action_status = "PREVIEW_READY"
    execution_result = {}
    business_context = {}

    # 4. Business Intelligence & Transaction Processing
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

    elif intent_str == "list_products":
        action_status = "EXECUTED"
        filters = nlu_result.get("filters") or {}
        inv_data = await inventory_service.query_inventory(
            db=db,
            business_id=current_user.business_id,
            search=filters.get("search"),
            category_name=filters.get("category_name"),
            stock_status=filters.get("stock_status"),
            min_price=filters.get("min_price"),
            max_price=filters.get("max_price"),
            min_stock=filters.get("min_stock"),
            max_stock=filters.get("max_stock"),
            sort_by=filters.get("sort_by")
        )
        business_context.update(inv_data)
        execution_result = inv_data

    elif intent_str == "list_categories":
        action_status = "EXECUTED"
        cats = await inventory_service.get_categories_summary(db, current_user.business_id)
        business_context["categories_count"] = len(cats)
        business_context["top_category_names"] = ", ".join([c["name"] for c in cats[:4]]) if cats else "None"
        execution_result = {
            "categories_count": len(cats),
            "top_categories": cats[:6],
            "categories": cats
        }

    elif intent_str == "inventory_valuation":
        action_status = "EXECUTED"
        inv_data = await inventory_service.query_inventory(db, current_user.business_id)
        business_context["total_valuation"] = inv_data["total_store_valuation"]
        business_context["total_products"] = inv_data["total_store_products"]
        execution_result = inv_data

    elif intent_str == "compare_stock":
        action_status = "EXECUTED"
        p1_query = nlu_result.get("product1", "")
        p2_query = nlu_result.get("product2", "")
        find1 = await inventory_service.find_products(db, current_user.business_id, p1_query)
        find2 = await inventory_service.find_products(db, current_user.business_id, p2_query)

        p1_obj = find1.get("product") or (find1.get("matches", [None])[0])
        p2_obj = find2.get("product") or (find2.get("matches", [None])[0])

        business_context["product1_name"] = p1_obj["name"] if p1_obj else p1_query
        business_context["product1_stock"] = p1_obj["current_stock"] if p1_obj else 0.0
        business_context["product1_unit"] = p1_obj["unit"] if p1_obj else "units"

        business_context["product2_name"] = p2_obj["name"] if p2_obj else p2_query
        business_context["product2_stock"] = p2_obj["current_stock"] if p2_obj else 0.0
        business_context["product2_unit"] = p2_obj["unit"] if p2_obj else "units"

        execution_result = {
            "product1": p1_obj,
            "product2": p2_obj,
            "products": [p for p in [p1_obj, p2_obj] if p]
        }

    elif intent_str == "check_stock":
        action_status = "EXECUTED"
        target_query = nlu_result.get("product_query") or (product_dict.get("name") if product_dict else None)

        if target_query:
            find_res = await inventory_service.find_products(db, current_user.business_id, target_query)
            status_type = find_res["status"]
            business_context["inquiry_status"] = status_type
            business_context["query"] = target_query

            if status_type in ["AVAILABLE", "LOW_STOCK", "OUT_OF_STOCK"]:
                single_p = find_res["product"]
                business_context["product_name"] = single_p["name"]
                business_context["current_stock"] = single_p["current_stock"]
                business_context["unit"] = single_p["unit"]
                business_context["selling_price"] = single_p["selling_price"]
                business_context["threshold"] = single_p["low_stock_threshold"]
                execution_result = {
                    **find_res,
                    "products": [single_p],
                    "current_stock": single_p["current_stock"],
                    "unit": single_p["unit"],
                    "selling_price": single_p["selling_price"]
                }
            elif status_type == "MULTIPLE_MATCHES":
                business_context["match_count"] = find_res["match_count"]
                business_context["product_name"] = target_query
                execution_result = {
                    **find_res,
                    "products": find_res["matches"]
                }
            elif status_type == "SIMILAR_FOUND":
                business_context["product_name"] = target_query
                business_context["similar_products"] = find_res["similar_products"]
                execution_result = {
                    **find_res,
                    "products": find_res["similar_products"]
                }
            else:  # UNLISTED
                business_context["product_name"] = target_query
                execution_result = find_res
        else:
            # Complete catalogue stock query
            inv_res = await inventory_service.query_inventory(db, current_user.business_id)
            business_context.update(inv_res)
            execution_result = inv_res

    elif intent_str == "price_inquiry":
        action_status = "EXECUTED"
        target_query = nlu_result.get("product_query") or (product_dict.get("name") if product_dict else None)

        if target_query:
            find_res = await inventory_service.find_products(db, current_user.business_id, target_query)
            if find_res.get("matches"):
                p_item = find_res["matches"][0]
                business_context["product_name"] = p_item["name"]
                business_context["unit_price"] = p_item["selling_price"]
                business_context["selling_price"] = p_item["selling_price"]
                business_context["unit"] = p_item["unit"]
                business_context["match_count"] = len(find_res["matches"])
                execution_result = {
                    **find_res,
                    "products": find_res["matches"],
                    "selling_price": p_item["selling_price"],
                    "unit": p_item["unit"]
                }
            else:
                business_context["inquiry_status"] = "UNLISTED"
                business_context["product_name"] = target_query
                execution_result = find_res
        else:
            action_status = "AMBIGUOUS"

    elif intent_str in ["get_profit_loss", "get_revenue"]:
        action_status = "EXECUTED"
        pnl_data = await bi_service.get_profit_and_loss(
            db=db,
            business_id=current_user.business_id,
            start_utc=nlu_result.get("start_utc"),
            end_utc=nlu_result.get("end_utc"),
            period_label=nlu_result.get("period_label", "Today")
        )
        business_context.update(pnl_data)
        execution_result = pnl_data

    elif intent_str == "get_sales_analytics":
        action_status = "EXECUTED"
        sales_data = await bi_service.get_sales_analytics(
            db=db,
            business_id=current_user.business_id,
            start_utc=nlu_result.get("start_utc"),
            end_utc=nlu_result.get("end_utc"),
            product_id=nlu_result.get("matched_product_id"),
            product_name=nlu_result.get("product_name"),
            period_label=nlu_result.get("period_label", "Today")
        )
        business_context.update(sales_data)
        execution_result = sales_data

    elif intent_str == "get_customer_analytics":
        action_status = "EXECUTED"
        cust_data = await bi_service.get_customer_analytics(
            db=db,
            business_id=current_user.business_id,
            start_utc=nlu_result.get("start_utc"),
            end_utc=nlu_result.get("end_utc"),
            period_label=nlu_result.get("period_label", "Today")
        )
        business_context.update(cust_data)
        execution_result = cust_data

    elif intent_str == "get_inventory_health":
        action_status = "EXECUTED"
        inv_data = await bi_service.get_inventory_health(
            db=db,
            business_id=current_user.business_id,
            product_id=nlu_result.get("matched_product_id")
        )
        business_context.update(inv_data)
        execution_result = inv_data

    elif intent_str == "compare_periods":
        action_status = "EXECUTED"
        p1_key = nlu_result.get("timeframe") or "this_month"
        p2_key = nlu_result.get("comparison_timeframe") or ("last_month" if p1_key == "this_month" else "yesterday")
        p1_info = BIDateParser.parse_timeframe(p1_key.replace("_", " "))
        p2_info = BIDateParser.parse_timeframe(p2_key.replace("_", " "))
        comp_data = await bi_service.compare_periods(
            db=db,
            business_id=current_user.business_id,
            period_1=p1_info,
            period_2=p2_info
        )
        business_context.update(comp_data)
        execution_result = comp_data

    elif intent_str == "get_business_insights":
        action_status = "EXECUTED"
        insights_data = await bi_service.get_business_insights(
            db=db,
            business_id=current_user.business_id
        )
        business_context.update(insights_data)
        execution_result = insights_data

    elif intent_str == "daily_summary":
        summary = await analytics_service.get_dashboard_summary(db, current_user.business_id)
        action_status = "EXECUTED"
        business_context["today_sales"] = summary.today_sales
        business_context["today_orders"] = summary.today_orders
        business_context["total_revenue"] = summary.total_revenue
        execution_result = {
            "today_sales": summary.today_sales,
            "today_orders": summary.today_orders,
            "total_revenue": summary.total_revenue
        }

    elif intent_str == "unknown":
        action_status = "AMBIGUOUS"

    # 5. Multilingual Natural Response Generation
    natural_response = voice_nlu_engine.generate_natural_response(nlu_result, business_context)

    # 5b. Update Conversational Memory Context
    conversational_memory.update_context(
        business_id=current_user.business_id,
        user_id=current_user.id,
        intent=intent_str,
        product_id=nlu_result.get("matched_product_id"),
        product_name=nlu_result.get("product_name"),
        timeframe=nlu_result.get("timeframe"),
        period_label=nlu_result.get("period_label"),
        raw_text=actual_transcript
    )

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
            slots=json.dumps({k: v for k, v in nlu_result.items() if k != "matched_product_details"}, default=str),
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

        # Broadcast real-time voice command event
        try:
            await realtime_manager.broadcast("VOICE_TRANSACTION", {
                "command_id": command_uuid,
                "intent": intent_str,
                "transcription": actual_transcript,
                "response_text": natural_response,
                "action_status": action_status
            })
        except Exception:
            pass
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
            total_amount=business_context.get("total_price") or business_context.get("total_revenue") or business_context.get("revenue"),
            timeframe=nlu_result.get("timeframe"),
            period_label=nlu_result.get("period_label"),
            language=nlu_result.get("language", "te"),
            confidence=nlu_result.get("confidence", 1.0),
            requires_confirmation=nlu_result.get("requires_confirmation", False),
            clarification_prompt=nlu_result.get("clarification_prompt")
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
                        natural_spoken = voice_nlu_engine.generate_natural_response(nlu_res, {})
                        tts_res = await gnani_tts_service.synthesize_speech(
                            text=natural_spoken,
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
                            natural_spoken = voice_nlu_engine.generate_natural_response(nlu_res, {})
                            tts_res = await gnani_tts_service.synthesize_speech(
                                text=natural_spoken,
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

