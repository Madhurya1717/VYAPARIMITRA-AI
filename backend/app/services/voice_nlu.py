import re
import logging
from typing import Dict, Any, Optional, Tuple, List
from decimal import Decimal

logger = logging.getLogger(__name__)

# Telugu word numbers to integer mapping
TELUGU_NUMERAL_WORDS = {
    "ఒకటి": 1, "ఒక": 1, "రెండు": 2, "మూడు": 3, "నాలుగు": 4, "ఐదు": 5,
    "ఆరు": 6, "ఏడు": 7, "ఎనిమిది": 8, "తొమ్మిది": 9, "పది": 10,
    "పదకొండు": 11, "పన్నెండు": 12, "పదమూడు": 13, "పద్నాలుగు": 14, "పదిహేను": 15,
    "ఇరవై": 20, "ముప్పై": 30, "నలభై": 40, "యాభై": 50, "అరవై": 60,
    "డెబ్బై": 70, "ఎనభై": 80, "తొంభై": 90, "వంద": 100, "రెండు వందలు": 200, "ఐదు వందలు": 500
}

ENGLISH_NUMERAL_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "fifteen": 15, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100
}

# Standard Unit Normalization
UNIT_PATTERNS = {
    "kg": [r"\b(?:kg|kgs|kilogram|kilograms|kilo|kilos|కిలో|కిలోల|కిలోలు|కేజీ|కేజీల|కేజీలు)\b"],
    "litre": [r"\b(?:l|litre|litres|liter|liters|లీటర్|లీటర్ల|లీటర్లు)\b"],
    "packet": [r"\b(?:packet|packets|pkt|pkts|ప్యాకెట్|ప్యాకెట్ల|ప్యాకెట్లు)\b"],
    "bag": [r"\b(?:bag|bags|బస్తా|బస్తాల|బస్తాలు)\b"],
    "piece": [r"\b(?:piece|pieces|pc|pcs|ముక్క|ముక్కలు)\b"]
}

class MultilingualVoiceNLU:
    """
    Multilingual NLU Engine for VyapariMitra AI.
    Accurately classifies intents and extracts business entities across:
    - Pure Telugu
    - Indian English
    - Tenglish (Telugu-English code-mixed speech)
    """

    def parse_command(self, text: str, catalog_products: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Parses spoken/transcribed text into structured business intent and slots.
        """
        raw_text = text.strip()
        lower_text = raw_text.lower()
        detected_lang = self._detect_language(raw_text)

        intent = self._classify_intent(lower_text, detected_lang)
        quantity, unit = self._extract_quantity_and_unit(lower_text)
        matched_product = self._match_product(raw_text, lower_text, catalog_products or [])

        # Confidence calculation based on entity completeness
        confidence = 0.96
        if intent == "unknown":
            confidence = 0.35
        elif intent in ["inventory_sale", "inventory_add"] and not matched_product:
            confidence = 0.65
        elif intent in ["inventory_sale", "inventory_add"] and quantity is None:
            confidence = 0.70

        # Safety & Confirmation rules
        requires_confirmation = False
        if intent == "inventory_sale":
            if quantity and quantity >= 25.0:
                requires_confirmation = True  # High quantity protection
            if not matched_product:
                requires_confirmation = True
        elif intent == "inventory_add":
            requires_confirmation = True  # Destructive inventory modification
        elif intent == "unknown":
            requires_confirmation = False

        return {
            "intent": intent,
            "product_name": matched_product.get("name") if matched_product else None,
            "matched_product_id": matched_product.get("id") if matched_product else None,
            "matched_product_details": matched_product,
            "quantity": quantity,
            "unit": unit or (matched_product.get("unit") if matched_product else "kg"),
            "language": detected_lang,
            "confidence": round(confidence, 2),
            "requires_confirmation": requires_confirmation,
            "raw_text": raw_text
        }

    def _detect_language(self, text: str) -> str:
        """
        Detects if text is primarily Telugu Unicode, English, or Code-mixed Tenglish.
        """
        telugu_char_count = sum(1 for c in text if 0x0C00 <= ord(c) <= 0x0C7F)
        latin_char_count = sum(1 for c in text if c.isalpha() and ord(c) < 128)

        if telugu_char_count > 0 and latin_char_count > 0:
            return "te-en"  # Tenglish
        elif telugu_char_count > latin_char_count:
            return "te"
        else:
            # Check for common Tenglish romanized markers
            tenglish_markers = ["chesanu", "ammamu", "chesaru", "entha", "undhi", "undi", "cheppu", "ivvali", "ammali", "kavali"]
            words = text.lower().split()
            if any(w in words for w in tenglish_markers):
                return "te-en"
            return "en"

    def _classify_intent(self, text: str, lang: str) -> str:
        # Sales intents
        sale_keywords = [
            # Telugu
            "అమ్మాను", "అమ్మాము", "అమ్మకం", "సేల్", "విక్రయించాము", "ఇచ్చాను", "కొన్నారు",
            # English
            "sold", "sell", "sale", "billed", "dispatch",
            # Tenglish
            "sell chesanu", "sale aindi", "sale chesam", "ammesanu", "ammina", "bill cheyi"
        ]
        if any(kw in text for kw in sale_keywords):
            return "inventory_sale"

        # Restock / Add Stock intents
        add_keywords = [
            # Telugu
            "చేర్చండి", "కలపండి", "స్టాక్ వచ్చింది", "కొన్నాము", "లోడ్ అయింది",
            # English
            "add", "restock", "received", "purchased", "stocked", "added",
            # Tenglish
            "stock add chey", "stock vachindi", "add chey", "restock chey", "konnamu"
        ]
        if any(kw in text for kw in add_keywords):
            return "inventory_add"

        # Check stock inquiry
        stock_query_keywords = [
            # Telugu
            "స్టాక్ ఎంత", "ఎంత ఉంది", "స్టాక్ చెక్", "నిల్వ ఎంత",
            # English
            "how much stock", "check stock", "stock left", "quantity available", "stock available",
            # Tenglish
            "stock entha undi", "entha stock undi", "stock check chey"
        ]
        if any(kw in text for kw in stock_query_keywords):
            return "check_stock"

        # Price inquiry
        price_keywords = [
            # Telugu
            "ధర ఎంత", "ధర చెప్పు", "రేటు ఎంత",
            # English
            "price of", "cost of", "how much is", "rate of",
            # Tenglish
            "price entha", "rate entha", "cost entha"
        ]
        if any(kw in text for kw in price_keywords):
            return "price_inquiry"

        # Daily sales summary
        summary_keywords = [
            # Telugu
            "ఈరోజు అమ్మకాలు", "ఈరోజు బిజినెస్", "మొత్తం సేల్స్", "రోజువారీ సారాంశం",
            # English
            "today sales", "today's revenue", "daily summary", "business summary", "total sales today",
            # Tenglish
            "today sales entha", "today business entha", "today sales summary"
        ]
        if any(kw in text for kw in summary_keywords):
            return "daily_summary"

        return "unknown"

    def _extract_quantity_and_unit(self, text: str) -> Tuple[Optional[float], Optional[str]]:
        """
        Extracts numeric quantity and measurement unit with Telugu & English word support.
        """
        detected_qty = None
        detected_unit = None

        # 1. Look for explicit digits (e.g., "10 kg", "25.5 కేజీలు")
        digit_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|–)?\s*([a-zA-Z\u0C00-\u0C7F]+)?", text)
        if digit_match:
            try:
                detected_qty = float(digit_match.group(1))
            except ValueError:
                pass

        # 2. If no digits found, scan for Telugu or English word numbers
        if detected_qty is None:
            words = text.split()
            for word in words:
                clean_w = re.sub(r'[^\w\u0C00-\u0C7F]', '', word)
                if clean_w in TELUGU_NUMERAL_WORDS:
                    detected_qty = float(TELUGU_NUMERAL_WORDS[clean_w])
                    break
                elif clean_w in ENGLISH_NUMERAL_WORDS:
                    detected_qty = float(ENGLISH_NUMERAL_WORDS[clean_w])
                    break

        # 3. Detect Unit
        for unit_key, patterns in UNIT_PATTERNS.items():
            for p in patterns:
                if re.search(p, text, re.IGNORECASE):
                    detected_unit = unit_key
                    break
            if detected_unit:
                break

        return detected_qty, detected_unit

    def _match_product(self, raw_text: str, lower_text: str, products: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Matches product against catalog using canonical names, Telugu names, and aliases.
        """
        if not products:
            # Fallback default heuristics if catalog not yet loaded
            common_items = [
                {"name": "Sona Masoori Rice", "telugu_name": "సోనా మసూరి బియ్యం", "aliases": ["rice", "biyyam", "బియ్యం", "వరి అన్నం"]},
                {"name": "Toor Dal", "telugu_name": "కందిపప్పు", "aliases": ["dal", "kandi pappu", "toordal", "పప్పు"]},
                {"name": "Sunflower Oil", "telugu_name": "సన్‌ఫ్లవర్ నూనె", "aliases": ["oil", "sunflower oil", "నూనె"]},
                {"name": "Sugar", "telugu_name": "చక్కెర", "aliases": ["sugar", "panchadara", "పంచదార"]},
                {"name": "Aashirvaad Atta", "telugu_name": "ఆశీర్వాద్ గోధుమపిండి", "aliases": ["atta", "wheat flour", "గోధుమపిండి"]}
            ]
            products = common_items

        # Exact Telugu and English substring matching
        for prod in products:
            # Check Telugu name
            telugu_name = prod.get("telugu_name") or ""
            if telugu_name and telugu_name in raw_text:
                return prod

            # Check English name
            canonical_name = prod.get("name", "").lower()
            if canonical_name and canonical_name in lower_text:
                return prod

            # Check aliases
            aliases = prod.get("aliases") or []
            if isinstance(aliases, str):
                import json
                try:
                    aliases = json.loads(aliases)
                except Exception:
                    aliases = [aliases]
            for alias in aliases:
                alias_clean = alias.strip().lower()
                if alias_clean and alias_clean in lower_text:
                    return prod

        return None

    def generate_natural_response(
        self,
        intent_data: Dict[str, Any],
        business_context: Dict[str, Any]
    ) -> str:
        """
        Generates natural spoken feedback in the merchant's chosen language.
        """
        intent = intent_data.get("intent")
        lang = intent_data.get("language", "te")
        product = intent_data.get("product_name") or "వస్తువు"
        qty = intent_data.get("quantity")
        unit = intent_data.get("unit", "kg")
        remaining_stock = business_context.get("remaining_stock")
        total_price = business_context.get("total_price")

        # Telugu Responses
        if "te" in lang:
            if intent == "inventory_sale":
                if business_context.get("insufficient_stock"):
                    return f"క్షమించండి, స్టాక్ సరిపోదు. ప్రస్తుతం కేవలం {remaining_stock} {unit} మాత్రమే ఉంది."
                stock_str = f" మిగిలిన స్టాక్ {remaining_stock} {unit}." if remaining_stock is not None else ""
                price_str = f" మొత్తం విలువ ₹{total_price:.2f}." if total_price is not None else ""
                return f"{qty} {unit} {product} అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది.{price_str}{stock_str}"

            elif intent == "inventory_add":
                return f"{qty} {unit} {product} స్టాక్‌లో విజయవంతంగా చేర్చబడింది. ప్రస్తుత నిల్వ: {remaining_stock} {unit}."

            elif intent == "check_stock":
                return f"ప్రస్తుతం స్టాక్‌లో {remaining_stock} {unit} {product} అందుబాటులో ఉంది."

            elif intent == "price_inquiry":
                unit_price = business_context.get("unit_price", 0)
                return f"{product} అమ్మకం ధర ప్రతి {unit}కు ₹{unit_price:.2f}."

            elif intent == "daily_summary":
                today_sales = business_context.get("today_sales", 0)
                today_orders = business_context.get("today_orders", 0)
                return f"ఈరోజు మొత్తం {today_orders} లావాదేవీలలో ₹{today_sales:.2f} అమ్మకాలు జరిగాయి."

            else:
                return "క్షమించండి, మీ ఆదేశాన్ని పూర్తిగా అర్థం చేసుకోలేకపోయాను. దయచేసి '10 కిలోల బియ్యం అమ్మాను' లాంటి ఆదేశాన్ని స్పష్టంగా చెప్పండి."

        # English Responses
        else:
            if intent == "inventory_sale":
                if business_context.get("insufficient_stock"):
                    return f"Sorry, insufficient stock available. Current stock is only {remaining_stock} {unit}."
                stock_str = f" Remaining stock is {remaining_stock} {unit}." if remaining_stock is not None else ""
                price_str = f" Total amount ₹{total_price:.2f}." if total_price is not None else ""
                return f"Sale of {qty} {unit} of {product} recorded successfully.{price_str}{stock_str}"

            elif intent == "inventory_add":
                return f"Added {qty} {unit} of {product} to inventory. Current stock is now {remaining_stock} {unit}."

            elif intent == "check_stock":
                return f"You currently have {remaining_stock} {unit} of {product} in stock."

            elif intent == "price_inquiry":
                unit_price = business_context.get("unit_price", 0)
                return f"The selling price of {product} is ₹{unit_price:.2f} per {unit}."

            elif intent == "daily_summary":
                today_sales = business_context.get("today_sales", 0)
                today_orders = business_context.get("today_orders", 0)
                return f"Today's total sales stand at ₹{today_sales:.2f} across {today_orders} transactions."

            else:
                return "I couldn't clearly understand that instruction. Please try saying 'Sold 10 kg of rice' or 'Add 50 kg toor dal'."

voice_nlu_engine = MultilingualVoiceNLU()
