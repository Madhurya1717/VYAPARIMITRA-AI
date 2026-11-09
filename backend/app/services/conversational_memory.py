import time
from typing import Dict, Any, Optional

class ConversationalMemoryService:
    """
    Maintains short-term conversational context per business / user session.
    Enables natural multi-turn follow-up queries:
    - User: "How much rice did I sell this month?"
    - User: "What about last month?" (inherits sales_report intent & rice product)
    - User: "Compare both." (compares this month vs last month)
    - User: "What about dal?" (inherits sales_report intent & timeframe)
    """

    def __init__(self, ttl_seconds: int = 900):  # 15 minute conversation window
        self._sessions: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl_seconds

    def _get_key(self, business_id: str, user_id: Optional[str] = None) -> str:
        return f"{business_id}_{user_id or 'default'}"

    def get_context(self, business_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        key = self._get_key(business_id, user_id)
        entry = self._sessions.get(key)
        if not entry:
            return None

        # Check TTL
        if time.time() - entry["timestamp"] > self.ttl:
            del self._sessions[key]
            return None

        return entry["context"]

    def update_context(
        self,
        business_id: str,
        user_id: Optional[str],
        intent: str,
        product_id: Optional[str] = None,
        product_name: Optional[str] = None,
        timeframe: Optional[str] = None,
        period_label: Optional[str] = None,
        raw_text: Optional[str] = None
    ) -> None:
        key = self._get_key(business_id, user_id)
        current = self.get_context(business_id, user_id) or {}

        # Save previous timeframe for comparison
        prev_timeframe = current.get("timeframe")
        if timeframe and prev_timeframe and timeframe != prev_timeframe:
            current["previous_timeframe"] = prev_timeframe
            current["previous_period_label"] = current.get("period_label")

        if intent and intent != "unknown":
            current["intent"] = intent
        if product_id:
            current["product_id"] = product_id
        if product_name:
            current["product_name"] = product_name
        if timeframe:
            current["timeframe"] = timeframe
        if period_label:
            current["period_label"] = period_label
        if raw_text:
            current["last_query"] = raw_text

        self._sessions[key] = {
            "timestamp": time.time(),
            "context": current
        }

    def resolve_follow_up(
        self,
        text: str,
        detected_intent: str,
        matched_product: Optional[Dict[str, Any]],
        detected_timeframe: Optional[str],
        business_id: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Merges current command entities with previous conversational context
        if the command is an elliptical follow-up question.
        """
        lower = text.lower().strip()
        context = self.get_context(business_id, user_id)

        if not context:
            return {
                "intent": detected_intent,
                "matched_product": matched_product,
                "timeframe": detected_timeframe,
                "is_follow_up": False
            }

        # Check for explicit follow-up indicators
        is_follow_up = False
        follow_up_cues = [
            "what about", "how about", "and for", "and what", "mari",
            "మరి", "ఇంకా", "compare both", "compare", "తేడా", "difference"
        ]
        
        # If user starts with a cue OR if user provided only a timeframe without an intent
        has_cue = any(cue in lower for cue in follow_up_cues)
        is_sparse_timeframe = (
            detected_intent in ["unknown", "daily_summary"] and
            not matched_product and
            detected_timeframe in ["yesterday", "last_week", "last_month", "last_year", "this_week", "this_month"]
        )
        is_sparse_product = (
            detected_intent == "unknown" and
            matched_product is not None and
            len(lower.split()) <= 4
        )
        is_compare_call = any(w in lower for w in ["compare", "compare both", "difference", "పోల్చండి"])

        if has_cue or is_sparse_timeframe or is_sparse_product or is_compare_call:
            is_follow_up = True

        if not is_follow_up:
            return {
                "intent": detected_intent,
                "matched_product": matched_product,
                "timeframe": detected_timeframe,
                "is_follow_up": False
            }

        # Handle "Compare both" or comparison follow-up
        if is_compare_call:
            return {
                "intent": "compare_periods",
                "matched_product": matched_product or context.get("matched_product"),
                "timeframe": detected_timeframe or context.get("timeframe"),
                "previous_timeframe": context.get("previous_timeframe") or "last_month",
                "is_follow_up": True
            }

        # Inherit previous intent if current is unknown
        resolved_intent = detected_intent
        if resolved_intent == "unknown" or is_sparse_timeframe:
            resolved_intent = context.get("intent", detected_intent)

        # Inherit previous product if not specified in follow-up
        resolved_product = matched_product
        if not resolved_product and context.get("product_name"):
            resolved_product = {
                "id": context.get("product_id"),
                "name": context.get("product_name"),
                "unit": context.get("unit", "units")
            }

        return {
            "intent": resolved_intent,
            "matched_product": resolved_product,
            "timeframe": detected_timeframe or context.get("timeframe"),
            "is_follow_up": True
        }

conversational_memory = ConversationalMemoryService()

