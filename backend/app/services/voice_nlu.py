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
    Production-Grade Multilingual NLU Engine for VyapariMitra AI.
    Accurately classifies intents and extracts business entities across:
    - Pure Telugu (తెలుగు)
    - Indian English
    - Tenglish (Telugu-English code-mixed speech)
    """

    def parse_command(self, text: str, catalog_products: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        raw_text = text.strip()
        lower_text = raw_text.lower()
        detected_lang = self._detect_language(raw_text)

        intent = self._classify_intent(raw_text, lower_text, detected_lang)
        quantity, unit = self._extract_quantity_and_unit(lower_text)
        matched_product = self._match_product(raw_text, lower_text, catalog_products or [])

        # Confidence calculation
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

        clarification_prompt = None
        if intent == "unknown":
            if "te" in detected_lang:
                clarification_prompt = "క్షమించండి, మీ ఆదేశం అర్థం కాలేదు. దయచేసి '10 కిలోల బియ్యం అమ్మాను' లేదా 'స్టాక్ ఎంత ఉంది' అని స్పష్టంగా చెప్పండి."
            else:
                clarification_prompt = "I didn't quite catch that. Please specify an action like 'Sold 10 kg rice' or 'Check stock'."
        elif intent == "inventory_sale" and not matched_product:
            if "te" in detected_lang:
                clarification_prompt = "ఏ వస్తువు అమ్మారో దయచేసి స్పష్టంగా చెప్పండి (ఉదాహరణకు: బియ్యం, కందిపప్పు, పంచదార)."
            else:
                clarification_prompt = "Please specify which product was sold (e.g., rice, toor dal, sugar)."

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
            "clarification_prompt": clarification_prompt,
            "raw_text": raw_text
        }

    def _detect_language(self, text: str) -> str:
        telugu_char_count = sum(1 for c in text if 0x0C00 <= ord(c) <= 0x0C7F)
        latin_char_count = sum(1 for c in text if c.isalpha() and ord(c) < 128)

        if telugu_char_count > 0 and latin_char_count > 0:
            return "te-en"
        elif telugu_char_count > latin_char_count:
            return "te"
        else:
            tenglish_markers = [
                "chesanu", "ammamu", "chesaru", "entha", "undhi", "undi",
                "cheppu", "ivvali", "ammali", "kavali", "cheyi", "aindi", "vachindi", "chesam"
            ]
            words = text.lower().split()
            if any(w in words for w in tenglish_markers):
                return "te-en"
            return "en"

    def _classify_intent(self, raw_text: str, lower_text: str, lang: str) -> str:
        """
        Classifies business intents with strict precedence:
        1. Summaries & Reports
        2. Price Inquiries
        3. Stock Inquiries
        4. Stock Inward (Add)
        5. Stock Sales
        """
        # 1. Daily Summary & Revenue Inquiries (Must be checked BEFORE sale!)
        summary_patterns = [
            # Telugu
            r"ఈరోజు.*అమ్మకాలు", r"మొత్తం.*అమ్మకాలు", r"ఈరోజు.*బిజినెస్", r"లాభం.*ఎంత", r"రోజువారీ సారాంశం",
            # English
            r"\b(?:today(?:'s)?\s+(?:sales|revenue|summary|business))\b",
            r"\b(?:sales\s+and\s+revenue\s+summary)\b",
            r"\b(?:total\s+sales\s+today)\b",
            r"\b(?:how\s+much\s+(?:profit|sales|revenue))\b",
            # Tenglish
            r"\b(?:today\s+sales\s+entha)\b", r"\b(?:today\s+business\s+entha)\b",
            r"\b(?:sales\s+summary\s+cheppu)\b", r"\b(?:today\s+sales\s+entha\s+chesamu)\b"
        ]
        for p in summary_patterns:
            if re.search(p, raw_text, re.IGNORECASE):
                return "daily_summary"

        # 2. Price Inquiries (Must be checked BEFORE sale!)
        price_patterns = [
            # Telugu
            r"ధర\s*ఎంత", r"ధర\s*చెప్పు", r"రేటు\s*ఎంత", r"ఖరీదు\s*ఎంత",
            # English
            r"\b(?:(?:what\s+is\s+the\s+)?(?:selling\s+)?(?:price|cost|rate)\s+of)\b",
            r"\b(?:how\s+much\s+(?:is|for))\b",
            # Tenglish
            r"\b(?:price\s+entha)\b", r"\b(?:rate\s+entha)\b", r"\b(?:cost\s+entha)\b"
        ]
        for p in price_patterns:
            if re.search(p, raw_text, re.IGNORECASE):
                return "price_inquiry"

        # 3. Stock Level Inquiries (Must be checked BEFORE sale!)
        stock_patterns = [
            # Telugu
            r"స్టాక్\s*ఎంత", r"నిల్వ\s*ఎంత", r"ఎంత\s*ఉంది", r"స్టాక్\s*చెక్",
            # English
            r"\b(?:how\s+much\s+.*(?:stock|left|available))\b",
            r"\b(?:check\s+stock)\b",
            r"\b(?:remaining\s+stock)\b",
            r"\b(?:quantity\s+available)\b",
            # Tenglish
            r"\b(?:stock\s+entha\s+undi)\b", r"\b(?:entha\s+stock\s+undi)\b",
            r"\b(?:stock\s+check\s+chey)\b"
        ]
        for p in stock_patterns:
            if re.search(p, raw_text, re.IGNORECASE):
                return "check_stock"

        # 4. Inventory Inward / Restock Commands
        add_patterns = [
            # Telugu
            r"చేర్చండి", r"కలపండి", r"స్టాక్\s*వచ్చింది", r"లోడ్\s*అయింది", r"చేర్చు",
            # English
            r"\b(?:add|restock|received|purchased|stocked|shipment|added)\b",
            # Tenglish
            r"\b(?:stock\s+add)\b", r"\b(?:add\s+chey)\b", r"\b(?:restock\s+chey)\b", r"\b(?:vachindi)\b"
        ]
        for p in add_patterns:
            if re.search(p, raw_text, re.IGNORECASE):
                return "inventory_add"

        # 5. Sales & Billing Commands
        sale_patterns = [
            # Telugu
            r"అమ్మాను", r"అమ్మాము", r"అమ్మకం", r"సేల్", r"విక్రయించాము", r"ఇచ్చాను", r"కొన్నారు",
            # English (Word boundaries mandatory to avoid matching 'price')
            r"\b(?:sold|sell|sale|billed|billing|dispatch|bill)\b",
            # Tenglish
            r"\b(?:sell\s+chesanu|sale\s+aindi|sale\s+chesam|ammesanu|ammina|bill\s+cheyi)\b"
        ]
        for p in sale_patterns:
            if re.search(p, raw_text, re.IGNORECASE):
                return "inventory_sale"

        return "unknown"

    def _extract_quantity_and_unit(self, text: str) -> Tuple[Optional[float], Optional[str]]:
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
        Uses word boundaries for English tokens to prevent 'rice' matching inside 'price'!
        Sorts candidates by alias length descending so specific compounds match first.
        """
        if not products:
            products = [
                {"name": "Sona Masoori Rice", "telugu_name": "సోనా మసూరి బియ్యం", "aliases": ["rice", "biyyam", "వరి అన్నం"]},
                {"name": "Toor Dal", "telugu_name": "కందిపప్పు", "aliases": ["toor dal", "kandi pappu", "dal"]},
                {"name": "Freedom Sunflower Oil", "telugu_name": "సన్‌ఫ్లవర్ నూనె", "aliases": ["sunflower oil", "oil", "noon"]},
                {"name": "Refined Sugar", "telugu_name": "పంచదార", "aliases": ["sugar", "panchadara", "చక్కెర"]},
                {"name": "Aashirvaad Shudh Chakki Atta", "telugu_name": "ఆశీర్వాద్ గోధుమపిండి", "aliases": ["atta", "wheat flour", "గోధుమపిండి"]},
                {"name": "Tata Salt Vacuum Evaporated", "telugu_name": "టాటా ఉప్పు", "aliases": ["salt", "uppu", "ఉప్పు"]}
            ]

        # 1. Check exact Telugu names first (longest first)
        sorted_by_telugu = sorted(products, key=lambda p: len(p.get("telugu_name") or ""), reverse=True)
        for prod in sorted_by_telugu:
            t_name = prod.get("telugu_name") or ""
            if t_name and t_name in raw_text:
                return prod

        # 2. Check full canonical English names (longest first)
        sorted_by_name = sorted(products, key=lambda p: len(p.get("name") or ""), reverse=True)
        for prod in sorted_by_name:
            c_name = prod.get("name", "").lower()
            if c_name and re.search(r'\b' + re.escape(c_name) + r'\b', lower_text):
                return prod

        # 3. Check all aliases with word boundaries (longest alias first)
        alias_candidates = []
        for prod in products:
            aliases = prod.get("aliases") or []
            if isinstance(aliases, str):
                import json
                try:
                    aliases = json.loads(aliases)
                except Exception:
                    aliases = [aliases]

            candidate_list = list(aliases)
            # Also include significant words from telugu_name (e.g., 'గోధుమపిండి' from 'ఆశీర్వాద్ గోధుమపిండి')
            t_name = prod.get("telugu_name") or ""
            if t_name:
                for tw in t_name.split():
                    if len(tw) >= 3 and tw not in candidate_list:
                        candidate_list.append(tw)

            for a in candidate_list:
                a_clean = a.strip().lower()
                if a_clean:
                    alias_candidates.append((len(a_clean), a_clean, prod))

        alias_candidates.sort(key=lambda x: x[0], reverse=True)

        for _, alias_clean, prod in alias_candidates:
            # Check if alias is Telugu Unicode
            is_telugu = any(0x0C00 <= ord(c) <= 0x0C7F for c in alias_clean)
            if is_telugu:
                if alias_clean in raw_text:
                    return prod
            else:
                # English / Latin: enforce strict word boundary so 'rice' does NOT match 'price'!
                pattern = r'\b' + re.escape(alias_clean) + r'\b'
                if re.search(pattern, lower_text):
                    return prod

        return None

    def generate_natural_response(
        self,
        intent_data: Dict[str, Any],
        business_context: Dict[str, Any]
    ) -> str:
        intent = intent_data.get("intent")
        lang = intent_data.get("language", "te")
        product = intent_data.get("product_name") or "వస్తువు"
        qty = intent_data.get("quantity")
        unit = intent_data.get("unit", "kg")
        remaining_stock = business_context.get("remaining_stock")
        total_price = business_context.get("total_price")

        if intent_data.get("clarification_prompt"):
            return intent_data["clarification_prompt"]

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
