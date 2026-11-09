import re
import difflib
import logging
from typing import Dict, Any, Optional, Tuple, List
from decimal import Decimal

from backend.app.services.bi_date_parser import BIDateParser

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
    "piece": [r"\b(?:piece|pieces|pc|pcs|ముక్క|ముక్కలు|బాటిల్|డబ్బా)\b"]
}

# Common bilingual grocery & kirana item phonetic synonyms
BILINGUAL_SYNONYMS = {
    "mehendi": ["మెహందీ", "mehndi", "mehandi", "గోరింటాకు", "cone", "cones"],
    "rice": ["బియ్యం", "వరి అన్నం", "biyyam", "sona masoori", "raw rice", "ric"],
    "dal": ["కందిపప్పు", "పప్పు", "toor dal", "kandi pappu", "red gram"],
    "oil": ["నూనె", "సన్‌ఫ్లవర్ నూనె", "sunflower oil", "noon", "cooking oil"],
    "sugar": ["పంచదార", "చక్కెర", "panchadara", "sweetener"],
    "salt": ["ఉప్పు", "టాటా ఉప్పు", "uppu"],
    "chilli": ["కారం", "కారం పొడి", "గుంటూరు కారం", "mirchi", "chilli powder"],
    "atta": ["గోధుమపిండి", "ఆశీర్వాద్ గోధుమపిండి", "godhumapindi", "flour", "wheat"],
    "soap": ["సబ్బు", "లైఫ్‌బాయ్", "డవ్", "లక్స్", "soaps"],
    "milk": ["పాలు", "విజయ పాలు", "ప్యాకెట్ పాలు"]
}

class MultilingualVoiceNLU:
    """
    Advanced Business Intelligence NLU Engine for VyapariMitra AI.
    Understands unlimited variations of business questions and transactional commands in:
    - Pure Telugu (తెలుగు)
    - Indian English
    - Tenglish (Telugu-English code-mixed)
    Supports dynamic catalog discovery and Asia/Kolkata date parsing.
    """

    def parse_command(
        self,
        text: str,
        catalog_products: List[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        raw_text = text.strip()
        lower_text = raw_text.lower()
        detected_lang = self._detect_language(raw_text)

        # 1. First classify broad intent & extract filters/entities
        intent_info = self._classify_intent_and_entities(raw_text, lower_text, detected_lang, None)
        intent = intent_info["intent"]
        filters = intent_info.get("filters", {})
        product_query = intent_info.get("product_query")
        product1 = intent_info.get("product1")
        product2 = intent_info.get("product2")

        # 2. Match individual product ONLY for transactional or product-specific intents
        matched_product = None
        non_product_intents = ["list_products", "list_categories", "inventory_valuation", "compare_stock", "compare_periods"]
        if intent not in non_product_intents:
            matched_product = self._match_product(raw_text, lower_text, catalog_products or [])

        timeframe_info = BIDateParser.parse_timeframe(raw_text)
        quantity, unit = self._extract_quantity_and_unit(lower_text, intent)

        # Context-aware fallback if intent was unknown
        if intent == "unknown":
            if matched_product or product_query:
                stock_words = ["stock", "stok", "available", "left", "remaining", "count", "undi", "undhi", "chudu", "check", "ఎంత", "ఉంది", "స్టాక్", "నిల్వ"]
                price_words = ["price", "cost", "rate", "khareedu", "ధర", "రేటు", "ఖరీదు"]
                sale_words = ["sold", "sell", "sale", "ammanu", "ammesanu", "bill", "అమ్మాను"]
                add_words = ["add", "restock", "vachindi", "చేర్చండి", "చేర్చు"]

                if any(w in lower_text for w in stock_words):
                    intent = "check_stock"
                elif any(w in lower_text for w in price_words):
                    intent = "price_inquiry"
                elif any(w in lower_text for w in sale_words) or quantity:
                    intent = "inventory_sale"
                elif any(w in lower_text for w in add_words):
                    intent = "inventory_add"
                else:
                    intent = "check_stock"

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
            requires_confirmation = True  # Inventory addition confirmation

        clarification_prompt = None
        if intent == "unknown":
            if "te" in detected_lang:
                clarification_prompt = "క్షమించండి, మీ ప్రశ్న అర్థం కాలేదు. దయచేసి 'ఈరోజు లాభం ఎంత', 'మెహందీ స్టాక్ ఎంత ఉంది' లేదా '10 కిలోల బియ్యం అమ్మాను' లాంటి ప్రశ్న అడగండి."
            else:
                clarification_prompt = "I didn't quite catch that. You can ask business questions like 'How much profit did I earn today?' or commands like 'Sold 5 packets mehendi'."
        elif intent == "inventory_sale" and not matched_product:
            if "te" in detected_lang:
                clarification_prompt = "ఏ వస్తువు అమ్మారో దయచేసి స్పష్టంగా చెప్పండి (ఉదాహరణకు: మెహందీ, బియ్యం, పంచదార)."
            else:
                clarification_prompt = "Please specify which product was sold (e.g., mehendi, rice, sugar)."

        return {
            "intent": intent,
            "product_name": matched_product.get("name") if matched_product else (product_query or None),
            "product_query": product_query or (matched_product.get("name") if matched_product else None),
            "matched_product_id": matched_product.get("id") if matched_product else None,
            "matched_product_details": matched_product,
            "product1": product1,
            "product2": product2,
            "filters": filters,
            "quantity": quantity,
            "unit": unit or (matched_product.get("unit") if matched_product else "kg"),
            "timeframe": timeframe_info["timeframe"],
            "period_label": timeframe_info["label"],
            "period_label_te": timeframe_info["label_te"],
            "start_utc": timeframe_info["start_utc"],
            "end_utc": timeframe_info["end_utc"],
            "is_comparison": timeframe_info["is_comparison"],
            "comparison_timeframe": timeframe_info.get("comparison_timeframe"),
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
                "cheppu", "ivvali", "ammali", "kavali", "cheyi", "aindi", "vachindi", "chesam",
                "ammanu", "ammesanu", "ammina", "ammadu", "chudu", "vacharu", "vachadu", "eeroju", "nela"
            ]
            words = text.lower().split()
            if any(w in words for w in tenglish_markers):
                return "te-en"
            return "en"

    def _classify_intent_and_entities(
        self,
        raw_text: str,
        lower_text: str,
        lang: str,
        matched_product: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive Multilingual NLU intent and entity classifier.
        Supports full business intelligence, product catalogue queries,
        inventory filtering, price checks, and transactional operations.
        """
        # 1. Product Categories List
        cat_list_patterns = [
            r"\b(?:list|show|what|tell)\b.*?\b(?:categories|category|product\s+categories|every\s+product\s+category)\b",
            r"కేటగిరీలు", r"విభాగాలు"
        ]
        if any(re.search(p, lower_text) for p in cat_list_patterns):
            return {"intent": "list_categories"}

        # 2. Stock Comparison between two products
        compare_stock_patterns = [
            r"\bcompare\b.*?\b(?:stock|current\s+stock|inventory)\b.*?\b(?:of|between)\b\s+([a-zA-Z\u0C00-\u0C7F\s]+?)\s+(?:and|with|to|vs|versus)\s+([a-zA-Z\u0C00-\u0C7F\s]+)",
            r"([a-zA-Z\u0C00-\u0C7F\s]+?)\s*(?:మరియు|మరింత)?\s*([a-zA-Z\u0C00-\u0C7F\s]+?)\s*స్టాక్.*?(?:పోల్చండి|పోల్చు)"
        ]
        for p in compare_stock_patterns:
            m = re.search(p, lower_text)
            if m:
                return {
                    "intent": "compare_stock",
                    "product1": m.group(1).strip(),
                    "product2": m.group(2).strip()
                }

        # 3. Total Inventory Valuation
        val_patterns = [
            r"\b(?:total\s+inventory\s+value|inventory\s+valuation|overall\s+stock\s+value|worth\s+of\s+inventory)\b",
            r"ఇన్వెంటరీ\s*విలువ", r"మొత్తం\s*స్టాక్\s*విలువ"
        ]
        if any(re.search(p, lower_text) for p in val_patterns):
            return {"intent": "inventory_valuation"}

        # 4. List / Filter Products Catalogue
        list_products_patterns = [
            r"\b(?:show|list|give|view|get|display)\b.*?\b(?:all\s+products|products|inventory|catalogue|catalog|items)\b",
            r"\bwhat\s+products\s+are\s+available\b",
            r"\bcomplete\s+inventory\s+list\b",
            r"\bcomplete\s+(?:product\s+)?catalogue\b",
            r"\bfind\s+all\s+products\b",
            r"\bshow\s+(?:all\s+)?products\b",
            r"\bsearch\s+for\s+products\b",
            r"\bdo\s+i\s+have\s+any\s+(\d+\s*(?:ml|l|litre|kg|gm|packet|bag|bottle)s?)\b",
            r"\bproducts?\s+(?:below|under|less\s+than|within|between|above|greater\s+than)\b",
            r"\b(?:which\s+products\s+are\s+the\s+most\s+expensive|most\s+expensive\s+products?)\b",
            r"\b(?:highest\s+inventory\s+quantity|highest\s+stock|products\s+with\s+high\s+stock)\b",
            r"\b(?:which\s+products\s+are\s+out\s+of\s+stock|out\s+of\s+stock\s+products?)\b",
            r"\b(?:show\s+products\s+with\s+low\s+stock|low\s+stock\s+products?)\b",
            r"\bhow\s+many\s+products\s+do\s+i\s+have\b",
            r"అన్ని\s*వస్తువుల", r"అన్ని\s*ప్రోడక్ట్స్", r"పూర్తి\s*కేటలాగ్", r"మొత్తం\s*లిస్ట్",
            r"వస్తువుల\s*జాబితా", r"ఏ\s*వస్తువులు\s*ఉన్నాయి", r"అందుబాటులో\s*ఉన్న\s*వస్తువులు"
        ]
        if any(re.search(p, lower_text) for p in list_products_patterns):
            filters = {}
            if re.search(r"\b(?:out\s+of\s+stock|zero\s+stock|empty)\b|అయిపోయినవి|అయిపోయాయి", lower_text):
                filters["stock_status"] = "out_of_stock"
            elif re.search(r"\b(?:low\s+stock|running\s+low|threshold)\b|తక్కువగా|తక్కువ", lower_text):
                filters["stock_status"] = "low_stock"
            elif re.search(r"\b(?:available|in\s+stock)\b|అందుబాటులో", lower_text):
                filters["stock_status"] = "in_stock"
            else:
                filters["stock_status"] = "all"

            # Stock quantity conditions
            stock_m = re.search(r"\bstock\s+(?:greater\s+than|above|more\s+than|over)\s*(\d+(?:\.\d+)?)\b|(\d+(?:\.\d+)?)\s*కంటే\s*ఎక్కువ\s*స్టాక్", lower_text)
            if stock_m:
                filters["min_stock"] = float(stock_m.group(1) or stock_m.group(2))

            stock_less_m = re.search(r"\bstock\s+(?:less\s+than|below|under)\s*(\d+(?:\.\d+)?)\b|(\d+(?:\.\d+)?)\s*కంటే\s*తక్కువ\s*స్టాక్", lower_text)
            if stock_less_m:
                filters["max_stock"] = float(stock_less_m.group(1) or stock_less_m.group(2))

            # Price conditions
            below_m = re.search(r"\b(?:below|under|less\s+than)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\b|(\d+(?:\.\d+)?)\s*కంటే\s*తక్కువ(?!\s*స్టాక్)", lower_text)
            if below_m and not stock_less_m:
                filters["max_price"] = float(below_m.group(1) or below_m.group(2))

            above_m = re.search(r"\b(?:above|greater\s+than|more\s+than|over)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\b|(\d+(?:\.\d+)?)\s*కంటే\s*ఎక్కువ(?!\s*స్టాక్)", lower_text)
            if above_m and not stock_m:
                filters["min_price"] = float(above_m.group(1) or above_m.group(2))

            range_m = re.search(r"\b(?:within|between)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\s*(?:to|and|-)\s*(?:₹|rs\.?|rupees)?\s*(\d+(?:\.\d+)?)\b", lower_text)
            if range_m:
                filters["min_price"] = float(range_m.group(1))
                filters["max_price"] = float(range_m.group(2))

            # Sorting
            if re.search(r"\b(?:highest\s+inventory|highest\s+stock|most\s+stock|maximum\s+stock)\b|ఎక్కువ\s*స్టాక్", lower_text):
                filters["sort_by"] = "stock_desc"
            elif re.search(r"\b(?:most\s+expensive|highest\s+price|costliest)\b|ఎక్కువ\s*ధర|ఖరీదైన", lower_text):
                filters["sort_by"] = "price_desc"
            elif re.search(r"\b(?:cheapest|lowest\s+price)\b|తక్కువ\s*ధర", lower_text):
                filters["sort_by"] = "price_asc"

            # Category filter
            cat_m = re.search(r"\b(?:belonging\s+to\s+the|belonging\s+to|in|under|of)\s+([a-zA-Z\s]+?)\s+category\b", lower_text)
            if cat_m:
                filters["category_name"] = cat_m.group(1).strip()

            # Specific search word
            search_m = re.search(r"\b(?:containing\s+the\s+word|containing|with\s+name|keyword)\s+([a-zA-Z\u0C00-\u0C7F]+)\b", lower_text)
            if search_m:
                filters["search"] = search_m.group(1).strip()

            unit_m = re.search(r"\b(\d+\s*(?:ml|l|litre|kg|gm|packet|bag|bottle)s?)\b", lower_text)
            if unit_m:
                filters["search"] = unit_m.group(1).strip()

            return {
                "intent": "list_products",
                "filters": filters
            }

        # 5. Period Comparisons
        comp_keywords = [
            r"\bcompare\b", r"\bversus\b", r"\bvs\b", r"\bdifference\b",
            r"\bcompare\s+both\b", r"\bcompare\s+chey\b", r"పోల్చండి", r"పోల్చు", r"తేడా", r"\bpolchandi\b"
        ]
        if any(re.search(p, lower_text) for p in comp_keywords):
            return {"intent": "compare_periods"}

        # 6. Business Insights & Strategic Health
        insights_keywords = [
            r"\b(?:making\s+a?\s*profit|business\s+profitable|in\s+profit\s+or\s+loss)\b",
            r"\b(?:highest\s+profit|most\s+profitable|highest\s+margin|best\s+margin)\b",
            r"\b(?:why\s+did\s+.*sales\s+decrease|why\s+sales\s+dropped|why\s+sales\s+decrease)\b",
            r"\b(?:business\s+performance\s+report|overall\s+business\s+health)\b",
            r"లాభాల్లో\s*ఉందా", r"ఎక్కువ\s*లాభం\s*ఇస్తుంది", r"వ్యాపార\s*పనితీరు",
            r"\bbusiness\s+profit\s+lo\s+unda\b", r"\bhighest\s+profit\s+margin\b"
        ]
        if any(re.search(p, lower_text) for p in insights_keywords):
            return {"intent": "get_business_insights"}

        # 7. Customer Analytics
        customer_keywords = [
            r"\b(?:how\s+many\s+customers|customers?\s+visited|customer\s+count|visitors?)\b",
            r"\b(?:regular\s+customers?|frequent\s+buyers?|loyal\s+customers?)\b",
            r"\b(?:which\s+customer\s+purchased\s+the\s+most|top\s+customer|best\s+customer)\b",
            r"\b(?:average\s+customer\s+purchase|average\s+order\s+value|aov)\b",
            r"\b(?:new\s+customers?|new\s+clients?)\b",
            r"ఎంతమంది\s*కస్టమర్లు", r"కస్టమర్లు\s*వచ్చారు", r"రెగ్యులర్\s*కస్టమర్లు", r"ఏ\s*కస్టమర్",
            r"సగటున.*కస్టమర్", r"కొత్త\s*కస్టమర్లు",
            r"\bentha\s+mandi\s+customers\b", r"\bregular\s+customers\s+evaru\b", r"\btop\s+customer\s+evaru\b"
        ]
        if any(re.search(p, lower_text) for p in customer_keywords):
            return {"intent": "get_customer_analytics"}

        # 8. Inventory Health & Reordering
        inventory_health_keywords = [
            r"\b(?:what\s+products\s+should\s+i\s+reorder|reorder\s+suggestions?|reorder\s+list)\b",
            r"\b(?:what\s+should\s+i\s+purchase\s+tomorrow|what\s+to\s+buy\s+tomorrow|need\s+restocking)\b",
            r"మళ్లీ\s*ఆర్డర్", r"రేపు\s*ఏ\s*వస్తువులు\s*కొనాలి", r"రీ-?ఆర్డర్\s*చేయాల్సినవి",
            r"\breorder\s+cheyalsina\b"
        ]
        if any(re.search(p, lower_text) for p in inventory_health_keywords):
            return {"intent": "get_inventory_health"}

        # 9. Financial Analytics: Profit & Loss
        profit_keywords = [
            r"\b(?:how\s+much\s+profit|what\s+is\s+my\s+.*profit|total\s+profit|gross\s+profit|net\s+profit)\b",
            r"\b(?:how\s+much\s+loss|face\s+any\s+loss|total\s+loss)\b",
            r"\b(?:how\s+much\s+money\s+did\s+i\s+earn|how\s+much\s+earned)\b",
            r"లాభం\s*ఎంత", r"నష్టం\s*ఎంత", r"లాభం\s*వచ్చింది", r"నష్టం\s*వచ్చింది", r"ఎంత\s*సంపాదించాను",
            r"\bentha\s+profit\b", r"\bprofit\s+entha\b", r"\bloss\s+vachinda\b", r"\bentha\s+earn\b",
            r"ఎంత\s*profit", r"profit\s*వచ్చింది", r"profit\s*ఎంత", r"లాభం.*profit", r"\bprofit\b.*?(?:వచ్చింది|ఎంత|ఉంది|vachindi)"
        ]
        if any(re.search(p, lower_text) for p in profit_keywords):
            return {"intent": "get_profit_loss"}

        # 10. Financial Analytics: Revenue, Investment & Expenses
        revenue_keywords = [
            r"\b(?:what\s+is\s+my\s+total\s+revenue|total\s+revenue|overall\s+revenue)\b",
            r"\b(?:how\s+much\s+money\s+did\s+i\s+invest|how\s+much\s+invested|total\s+investment)\b",
            r"\b(?:what\s+are\s+my\s+total\s+expenses|total\s+expenses|total\s+expenditure|operating\s+costs?)\b",
            r"మొత్తం\s*ఆదాయం", r"పెట్టుబడి\s*ఎంత", r"మొత్తం\s*ఖర్చులు", r"ఖర్చు\s*ఎంత",
            r"\btotal\s+revenue\b", r"\bentha\s+invest\b", r"\btotal\s+expenses\b"
        ]
        if any(re.search(p, lower_text) for p in revenue_keywords):
            return {"intent": "get_revenue"}

        # 11. Sales Analytics
        sales_analytics_keywords = [
            r"\b(?:how\s+many\s+products\s+did\s+i\s+sell|how\s+many\s+items\s+sold)\b",
            r"\b(?:which\s+product\s+is\s+selling\s+the\s+most|best[- ]selling\s+product|highest[- ]selling\s+product|top\s+seller)\b",
            r"\b(?:which\s+products\s+have\s+low\s+sales|low\s+selling\s+products)\b",
            r"\b(?:how\s+much\s+.*did\s+i\s+sell|how\s+many\s+.*did\s+i\s+sell|quantity\s+sold)\b",
            r"\b(?:sales\s+report|sales\s+summary|show\s+my\s+sales)\b",
            r"\b(?:what\s+is\s+my\s+total\s+sales\s+amount|total\s+sales\s+today|monthly\s+sales\s+summary)\b",
            r"ఎన్ని\s*వస్తువులు\s*అమ్మాను", r"ఎక్కువగా\s*అమ్ముడవుతోంది", r"ఎంత.*అమ్మాను",
            r"సేల్స్\s*రిపోర్ట్", r"టాప్\s*సెల్లింగ్", r"అమ్మకాలు\s*ఎంత", r"సేల్స్\s*ఎంత",
            r"\btop[- ]selling\b", r"\bhighest[- ]selling\b", r"\bsales\s+report\b",
            r"\b(?:sales\s+entha|entha\s+sales|sales\s+.*aindi|sales\s+aindi|sales\s+entha\s+cheppu|sales\s+chudu)\b"
        ]
        if any(re.search(p, lower_text) for p in sales_analytics_keywords):
            return {"intent": "get_sales_analytics"}

        # 12. Single Product Stock Check / Availability Inquiry
        stock_patterns = [
            r"\b(?:do\s+you\s+have|do\s+we\s+have|is\s+there)\s+([a-zA-Z\u0C00-\u0C7F\s]+?)\s+(?:in\s+stock|available|left|remaining|in\s+the\s+store|in\s+your\s+store)\??",
            r"\b(?:check|show|view|tell\s+me)\s+([a-zA-Z\u0C00-\u0C7F\s]+?)\s+stock\b",
            r"\b(?:what\s+is\s+the\s+)?available\s+stock\s+of\s+([a-zA-Z\u0C00-\u0C7F\s]+)\b",
            r"\bstock\s+of\s+([a-zA-Z\u0C00-\u0C7F\s]+)\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+stock\s+entha\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+స్టాక్\s*ఎంత\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+ఉందా\b",
            r"\bdo\s+we\s+have\s+enough\s+([a-zA-Z\u0C00-\u0C7F\s]+)\??",
            r"\bdo\s+you\s+have\s+([a-zA-Z\u0C00-\u0C7F\s]+)\??",
            r"\bshow\s+me\s+all\s+available\s+([a-zA-Z\u0C00-\u0C7F\s]+)\b"
        ]
        for p in stock_patterns:
            m = re.search(p, lower_text)
            if m:
                cand = m.group(1).strip()
                cand = re.sub(r"\b(?:the|any|some|available)\b", "", cand).strip()
                return {
                    "intent": "check_stock",
                    "product_query": cand
                }

        # Generic Stock Check
        general_stock_patterns = [
            r"\b(?:check|show|view|tell)\b.*?\b(?:stock|availability)\b",
            r"\bhow\s+much\b.*?\b(?:remaining|left|available|in\s+stock)\b",
            r"\b\w+\s+(?:stock|availability)\b",
            r"స్టాక్", r"నిల్వ", r"ఎంత\s*ఉంది", r"ఎంత\s*మిగిలింది", r"ఉందా",
            r"\b(?:stock|stok)\b.*?\b(?:entha|undi|undhi|cheppu|chudu)\b",
            r"\b\w+\s+entha\s+undi\b"
        ]
        if any(re.search(p, lower_text) for p in general_stock_patterns):
            return {
                "intent": "check_stock",
                "product_query": matched_product.get("name") if matched_product else None
            }

        # 13. Single Product Price Inquiry
        price_patterns = [
            r"\b(?:(?:what\s+is\s+the\s+)?(?:selling\s+)?(?:price|cost|rate)\s+of)\s+([a-zA-Z\u0C00-\u0C7F\s]+)\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+price\s+entha\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+ధర\s*ఎంత\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+రేటు\s*ఎంత\b",
            r"\b([a-zA-Z\u0C00-\u0C7F\s]+?)\s+ఖరీదు\s*ఎంత\b",
            r"\b(?:how\s+much\s+(?:is|for))\s+([a-zA-Z\u0C00-\u0C7F\s]+)\b"
        ]
        for p in price_patterns:
            m = re.search(p, lower_text)
            if m:
                cand = m.group(1).strip()
                return {
                    "intent": "price_inquiry",
                    "product_query": cand
                }

        general_price = [
            r"ధర\s*ఎంత", r"రేటు\s*ఎంత", r"ఖరీదు\s*ఎంత",
            r"\b\w+\s+(?:price|rate|cost|mrp)\b",
            r"\b(?:price\s+entha|rate\s+entha)\b"
        ]
        if any(re.search(p, lower_text) for p in general_price):
            return {
                "intent": "price_inquiry",
                "product_query": matched_product.get("name") if matched_product else None
            }

        # 14. Inventory Inward (Add / Restock)
        add_patterns = [
            r"చేర్చండి", r"కలపండి", r"స్టాక్\s*వచ్చింది", r"లోడ్\s*అయింది",
            r"\b(?:add|restock|received|purchased|stocked|shipment|added)\b",
            r"\b(?:add\s+chey|restock\s+chey|vachindi)\b"
        ]
        if any(re.search(p, lower_text) for p in add_patterns):
            return {"intent": "inventory_add"}

        # 15. Sales & Billing (Transaction execution)
        sale_patterns = [
            r"అమ్మాను", r"అమ్మాము", r"అమ్మకం", r"సేల్", r"విక్రయించాము",
            r"\b(?:sold|sell|sale|billed|billing|dispatch|bill)\b",
            r"\b(?:ammanu|ammesanu|ammina|ammamu)\b"
        ]
        if any(re.search(p, lower_text) for p in sale_patterns):
            return {"intent": "inventory_sale"}

        return {"intent": "unknown"}

    def _classify_intent(
        self,
        raw_text: str,
        lower_text: str,
        lang: str,
        matched_product: Optional[Dict[str, Any]] = None
    ) -> str:
        res = self._classify_intent_and_entities(raw_text, lower_text, lang, matched_product)
        return res["intent"]

    def _extract_quantity_and_unit(self, text: str, intent: str = "unknown") -> Tuple[Optional[float], Optional[str]]:
        # Non-transactional queries do not need quantity extraction
        non_qty_intents = [
            "get_profit_loss", "get_revenue", "get_customer_analytics",
            "get_inventory_health", "compare_periods", "get_business_insights",
            "check_stock", "price_inquiry"
        ]
        if intent in non_qty_intents:
            return None, None

        detected_qty = None
        detected_unit = None

        # 1. Look for explicit digits
        digit_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:-|–)?\s*([a-zA-Z\u0C00-\u0C7F]+)?", text)
        if digit_match:
            try:
                detected_qty = float(digit_match.group(1))
            except ValueError:
                pass

        # 2. Look for word numbers
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
        if not products:
            return None

        # 1. Check exact Telugu names first
        sorted_by_telugu = sorted(products, key=lambda p: len(p.get("telugu_name") or ""), reverse=True)
        for prod in sorted_by_telugu:
            t_name = prod.get("telugu_name") or ""
            if t_name and t_name.strip() in raw_text:
                return prod

        # 2. Check full canonical English names
        sorted_by_name = sorted(products, key=lambda p: len(p.get("name") or ""), reverse=True)
        for prod in sorted_by_name:
            c_name = prod.get("name", "").strip().lower()
            if c_name and re.search(r'\b' + re.escape(c_name) + r'\b', lower_text):
                return prod

        # 3. Check all aliases
        for prod in products:
            aliases = prod.get("aliases") or []
            if isinstance(aliases, str):
                import json
                try:
                    aliases = json.loads(aliases)
                except Exception:
                    aliases = [aliases]
            for a in aliases:
                a_clean = str(a).strip().lower()
                if not a_clean:
                    continue
                if any(0x0C00 <= ord(c) <= 0x0C7F for c in a_clean):
                    if a_clean in raw_text:
                        return prod
                else:
                    if re.search(r'\b' + re.escape(a_clean) + r'\b', lower_text):
                        return prod

        # 4. Bilingual Synonyms Matching
        for syn_key, syn_variants in BILINGUAL_SYNONYMS.items():
            has_variant = False
            for v in syn_variants + [syn_key]:
                if any(0x0C00 <= ord(c) <= 0x0C7F for c in v):
                    if v in raw_text:
                        has_variant = True
                        break
                else:
                    if re.search(r'\b' + re.escape(v.lower()) + r'\b', lower_text):
                        has_variant = True
                        break

            if has_variant:
                for prod in products:
                    p_name = prod.get("name", "").lower()
                    p_telugu = (prod.get("telugu_name") or "").lower()
                    all_p_names = [p_name, p_telugu]
                    if any(syn_key in n or any(v in n for v in syn_variants) for n in all_p_names):
                        return prod

        # 5. Salient Word & Fuzzy SequenceMatcher
        stopwords = {
            "price", "stock", "stok", "sale", "sold", "sell", "check", "much", "how", "what",
            "is", "the", "of", "in", "for", "to", "and", "with", "kg", "packet", "packets", "litre",
            "unit", "units", "left", "available", "remaining", "today", "yesterday", "all", "shop",
            "store", "my", "me", "show", "list", "give", "any", "do", "have", "products", "product",
            "items", "item", "catalogue", "catalog", "inventory", "many", "tell", "view", "find",
            "below", "above", "under", "within", "between", "category", "search", "containing", "word",
            "entha", "undi", "undhi", "cheppu", "chey", "chesam", "ammamu", "ammadu", "ammanu"
        }
        text_words = [w.strip(".,?!:;\"'") for w in lower_text.split() if len(w.strip(".,?!:;\"'")) > 2]
        salient_words = [w for w in text_words if w not in stopwords]

        for word in salient_words:
            for prod in products:
                prod_name_lower = prod.get("name", "").lower()
                if word == prod_name_lower:
                    return prod
                if len(word) >= 4 and re.search(r'\b' + re.escape(word) + r'\b', prod_name_lower):
                    return prod
                sim = difflib.SequenceMatcher(None, word, prod_name_lower).ratio()
                if sim >= 0.82:
                    return prod

        return None

    def generate_natural_response(
        self,
        intent_data: Dict[str, Any],
        business_context: Dict[str, Any]
    ) -> str:
        """
        Generates contextual natural speech responses in English or Telugu.
        Never fabricates numbers or states assumption as fact.
        """
        intent = intent_data.get("intent")
        lang = intent_data.get("language", "te")
        product = intent_data.get("product_name") or "వస్తువు"
        period = intent_data.get("period_label", "Today")
        period_te = intent_data.get("period_label_te", "ఈరోజు")
        is_te = "te" in lang

        if intent_data.get("clarification_prompt"):
            return intent_data["clarification_prompt"]

        # 1. Financial Analytics: Profit & Loss
        if intent == "get_profit_loss":
            has_records = business_context.get("has_records", False)
            if not has_records:
                if is_te:
                    return f"{period_te} లాభాన్ని లెక్కించడానికి మీ స్టోర్‌లో ఇంకా అమ్మకాల రికార్డులు నమోదు కాలేదు."
                return f"You don't have sufficient sales records for {period} to calculate profit."

            net_profit = business_context.get("net_profit", 0.0)
            total_rev = business_context.get("total_revenue", 0.0)
            margin_pct = business_context.get("profit_margin_pct", 0.0)
            is_loss = business_context.get("is_loss", False)
            loss_amount = business_context.get("loss_amount", 0.0)

            if is_loss:
                if is_te:
                    return f"{period_te} ఖర్చులు మరియు కొనుగోలు ధరలు ఆదాయం కంటే ఎక్కువగా ఉండటం వల్ల ₹{loss_amount:.2f} నష్టం నమోదయింది."
                return f"Your business recorded a loss of ₹{loss_amount:.2f} for {period} because product costs exceeded revenue."
            else:
                if is_te:
                    return f"{period_te} మీ వ్యాపార నికర లాభం ₹{net_profit:.2f}. మొత్తం అమ్మకాలు ₹{total_rev:.2f} (లాభ మార్జిన్: {margin_pct}%)."
                return f"Your profit for {period} is ₹{net_profit:.2f} on total sales of ₹{total_rev:.2f} (Profit margin: {margin_pct}%)."

        # 2. Financial Analytics: Revenue, Investment & Expenses
        elif intent == "get_revenue":
            has_records = business_context.get("has_records", False)
            total_rev = business_context.get("total_revenue", 0.0)
            sales_count = business_context.get("sales_count", 0)
            total_expenses = business_context.get("total_expenses", 0.0)
            total_cogs = business_context.get("total_cogs", 0.0)

            if not has_records:
                if is_te:
                    return f"{period_te} మీ వ్యాపారంలో ఇంకా ఎటువంటి ఆర్థిక లావాదేవీలు నమోదు కాలేదు."
                return f"No financial or sales transactions have been recorded yet for {period}."

            if "invest" in intent_data.get("raw_text", "").lower() or "పెట్టుబడి" in intent_data.get("raw_text", ""):
                if is_te:
                    return f"{period_te} విక్రయించిన వస్తువుల కొనుగోలు వ్యయం (పెట్టుబడి) ₹{total_cogs:.2f}."
                return f"Your total cost of goods sold (investment in sold inventory) for {period} is ₹{total_cogs:.2f}."
            elif "expense" in intent_data.get("raw_text", "").lower() or "ఖర్చు" in intent_data.get("raw_text", ""):
                if is_te:
                    return f"{period_te} నమోదైన మొత్తం నిర్వహణ ఖర్చులు ₹{total_expenses:.2f}."
                return f"Your total recorded operating expenses for {period} are ₹{total_expenses:.2f}."
            else:
                if is_te:
                    return f"{period_te} మొత్తం {sales_count} లావాదేవీల ద్వారా ₹{total_rev:.2f} ఆదాయం వచ్చింది."
                return f"Your total revenue for {period} stands at ₹{total_rev:.2f} across {sales_count} completed sales."

        # 3. Sales Analytics
        elif intent == "get_sales_analytics":
            is_prod = business_context.get("is_product_specific", False)
            if is_prod:
                prod_name = business_context.get("product_name", product)
                qty_sold = business_context.get("quantity_sold", 0.0)
                unit = business_context.get("unit", "units")
                prod_rev = business_context.get("revenue", 0.0)
                if qty_sold <= 0:
                    if is_te:
                        return f"{period_te} {prod_name} అమ్మకాలు ఏవీ నమోదు కాలేదు."
                    return f"No sales of {prod_name} were recorded for {period}."
                else:
                    if is_te:
                        return f"{period_te} {qty_sold} {unit} {prod_name} విక్రయించబడింది. మొత్తం విలువ ₹{prod_rev:.2f}."
                    return f"You sold {qty_sold} {unit} of {prod_name} in {period} generating ₹{prod_rev:.2f}."
            else:
                total_sales = business_context.get("total_sales_count", 0)
                total_rev = business_context.get("total_revenue", 0.0)
                best = business_context.get("best_seller")
                if total_sales <= 0:
                    if is_te:
                        return f"{period_te} మీ స్టోర్‌లో ఎటువంటి అమ్మకాలు నమోదు కాలేదు."
                    return f"No sales transactions were recorded for {period}."

                best_str_en = f" Your best-selling item was {best['product_name']} ({best['quantity']} {best['unit']} for ₹{best['revenue']:.2f})." if best else ""
                best_str_te = f" అత్యధికంగా అమ్ముడైన వస్తువు: {best['product_name']} ({best['quantity']} {best['unit']})." if best else ""

                if is_te:
                    return f"{period_te} మొత్తం {total_sales} లావాదేవీలలో ₹{total_rev:.2f} అమ్మకాలు జరిగాయి.{best_str_te}"
                return f"You completed {total_sales} sales for {period} with total revenue of ₹{total_rev:.2f}.{best_str_en}"

        # 4. Customer Analytics
        elif intent == "get_customer_analytics":
            has_data = business_context.get("has_customer_data", False)
            if not has_data:
                if is_te:
                    return f"{period_te} కస్టమర్ల వివరాలు ఇంకా నమోదు కాలేదు."
                return f"Customer visit information has not been recorded yet for {period}."

            total_visits = business_context.get("total_visits", 0)
            aov = business_context.get("average_order_value", 0.0)
            unique_c = business_context.get("unique_customers", 0)
            top_c = business_context.get("top_customer")
            reg_c = business_context.get("regular_customer_count", 0)

            top_str_en = f" Top customer was {top_c['name']} (₹{top_c['total_spend']:.2f})." if top_c else ""
            top_str_te = f" అత్యధికంగా కొనుగోలు చేసిన కస్టమర్: {top_c['name']} (₹{top_c['total_spend']:.2f})." if top_c else ""

            if is_te:
                return f"{period_te} మొత్తం {total_visits} మంది కస్టమర్లు వచ్చారు. సగటు కొనుగోలు ₹{aov:.2f}.{top_str_te}"
            return f"{period} you recorded {total_visits} customer visit(s) with an average order value of ₹{aov:.2f}.{top_str_en}"

        # 5. Inventory Health, Low Stock & Reordering
        elif intent == "get_inventory_health":
            tot_prod = business_context.get("total_products", 0)
            val = business_context.get("inventory_valuation", 0.0)
            low_cnt = business_context.get("low_stock_count", 0)
            out_cnt = business_context.get("out_of_stock_count", 0)
            reorder_list = business_context.get("reorder_suggestions", [])

            if tot_prod == 0:
                if is_te:
                    return "మీ ఇన్వెంటరీలో ప్రస్తుతం ఎటువంటి వస్తువులు లేవు. దయచేసి కొత్త వస్తువులను చేర్చండి."
                return "Your inventory is currently empty. Please add products to your catalog."

            reorder_names = ", ".join([r["name"] for r in reorder_list[:3]]) if reorder_list else "None"

            if is_te:
                return f"మీ ఇన్వెంటరీలో మొత్తం {tot_prod} వస్తువులు ఉన్నాయి (విలువ ₹{val:.2f}). {low_cnt} వస్తువులు తక్కువగా ఉన్నాయి, {out_cnt} వస్తువులు అయిపోయాయి. రీ-ఆర్డర్ చేయాల్సినవి: {reorder_names}."
            return f"Inventory Report: {tot_prod} active products worth ₹{val:.2f}. {low_cnt} low-stock and {out_cnt} out-of-stock items. Recommended to reorder: {reorder_names}."

        # 6. Period Comparisons
        elif intent == "compare_periods":
            p1_label = business_context.get("period1_label", "This Period")
            p2_label = business_context.get("period2_label", "Last Period")
            p1_rev = business_context.get("period1_revenue", 0.0)
            p2_rev = business_context.get("period2_revenue", 0.0)
            rev_diff = business_context.get("revenue_diff", 0.0)
            growth_pct = business_context.get("revenue_growth_pct", 0.0)
            p1_prof = business_context.get("period1_profit", 0.0)
            p2_prof = business_context.get("period2_profit", 0.0)

            direction_en = "increase" if rev_diff >= 0 else "decrease"
            direction_te = "పెరిగింది" if rev_diff >= 0 else "తగ్గింది"

            if is_te:
                return f"{p1_label}లో అమ్మకాలు ₹{p1_rev:.2f}, {p2_label}లో ₹{p2_rev:.2f} ({p2_label}తో పోల్చితే {direction_te} {abs(growth_pct)}%). లాభం ₹{p1_prof:.2f} (గతంలో ₹{p2_prof:.2f})."
            return f"{p1_label} revenue was ₹{p1_rev:.2f} vs ₹{p2_rev:.2f} in {p2_label} ({direction_en} of {abs(growth_pct)}%). Net profit was ₹{p1_prof:.2f} compared to ₹{p2_prof:.2f}."

        # 7. Business Insights
        elif intent == "get_business_insights":
            is_prof = business_context.get("is_profitable", False)
            m_prof = business_context.get("month_profit", 0.0)
            m_rev = business_context.get("month_revenue", 0.0)
            margin = business_context.get("month_margin_pct", 0.0)
            recs = business_context.get("recommendations", [])
            top_rec = recs[0] if recs else "Keep tracking your business operations daily."

            status_en = "profitable" if is_prof else "facing low margins or loss"
            status_te = "లాభాల్లో ఉంది" if is_prof else "లాభాలు తక్కువగా ఉన్నాయి"

            if is_te:
                return f"ఈ నెల మీ వ్యాపారం {status_te} (నికర లాభం: ₹{m_prof:.2f}, మార్జిన్: {margin}%). సలహా: {top_rec}"
            return f"Business Performance: Your store is {status_en} this month (Profit: ₹{m_prof:.2f}, Margin: {margin}%). Recommendation: {top_rec}"

        # 8. List Products / Catalogue / Filtered Inventory
        elif intent == "list_products":
            total = business_context.get("total_matching", 0)
            available = business_context.get("available_count", 0)
            out_of_stock = business_context.get("out_of_stock_count", 0)
            low_stock = business_context.get("low_stock_count", 0)
            filters = business_context.get("filters_applied") or intent_data.get("filters") or {}

            cat_name = filters.get("category_name")
            stock_stat = filters.get("stock_status")

            if cat_name:
                if is_te:
                    return f"మీ స్టోర్‌లో '{cat_name}' కేటగిరీకి సంబంధించి మొత్తం {total} వస్తువులు ఉన్నాయి ({available} అందుబాటులో ఉన్నాయి, {out_of_stock} నిల్వ లేవు). పూర్తి జాబితాను మీ స్క్రీన్‌పై చూపించాను."
                return f"I found {total} products in the '{cat_name}' category in your store, including {available} available products and {out_of_stock} out of stock. I've displayed the full list on your dashboard."

            elif stock_stat == "low_stock":
                if is_te:
                    return f"మీ స్టోర్‌లో ప్రస్తుతం {total} వస్తువులు కనీస నిల్వ కంటే తక్కువగా ఉన్నాయి. రీస్టాక్ చేయాల్సిన జాబితాను స్క్రీన్‌పై ప్రదర్శించాను. వీటిని రీస్టాక్ చేయాలనుకుంటున్నారా?"
                return f"You currently have {total} products running low on stock. I've displayed the full low-stock list on your dashboard. Would you like to restock them?"

            elif stock_stat == "out_of_stock":
                if is_te:
                    return f"మీ స్టోర్‌లో ప్రస్తుతం {total} వస్తువులు పూర్తిగా అయిపోయాయి (అవుట్ ఆఫ్ స్టాక్). పూర్తి జాబితాను డాష్‌బోర్డ్‌లో ప్రదర్శించాను. వీటిని ఆర్డర్ చేయాలనుకుంటున్నారా?"
                return f"You currently have {total} products that are completely out of stock in your store. I've displayed the list on your dashboard. Would you like to restock them?"

            elif stock_stat == "in_stock":
                if is_te:
                    return f"మీ స్టోర్‌లో ప్రస్తుతం {total} వస్తువులు నిల్వలో అందుబాటులో ఉన్నాయి. పూర్తి జాబితాను మీ స్క్రీన్‌పై చూపించాను."
                return f"I found {total} currently available products in your store. I've displayed the complete available catalogue on your dashboard."

            else:
                # Master Prompt Section 6.G Exact Specification
                if is_te:
                    return f"మీ స్టోర్‌లో మొత్తం {total} వస్తువులు ఉన్నాయి (అందుబాటులో ఉన్నవి: {available}, నిల్వ లేనివి: {out_of_stock}). పూర్తి ప్రోడక్ట్ కేటలాగ్‌ను మీ స్క్రీన్‌పై చూపించాను. మీరు అన్ని వస్తువులను చూడాలనుకుంటున్నారా లేదా రీస్టాక్ చేయాల్సినవి చూడాలనుకుంటున్నారా?"
                return f"I found {total} products in your store, including {available} currently available products and {out_of_stock} out-of-stock products. I've displayed the complete product catalogue on your dashboard. Would you like to see all products, only available products, or products that need restocking?"

        # 9. Product Stock Check & Conversational Scenarios (A through F)
        elif intent == "check_stock":
            inquiry_status = business_context.get("inquiry_status")
            target_product = business_context.get("product_name") or product or intent_data.get("product_query") or "వస్తువు"
            cur_stock = business_context.get("current_stock", business_context.get("remaining_stock"))
            unit_str = business_context.get("unit") or intent_data.get("unit") or "kg"
            price_val = business_context.get("selling_price") or business_context.get("unit_price") or 0.0
            thresh_val = business_context.get("threshold") or business_context.get("low_stock_threshold") or 10.0

            # Scenario A: Product is Available (In Stock)
            if inquiry_status == "AVAILABLE":
                if is_te:
                    return f"అవును! {target_product} మీ స్టోర్‌లో అందుబాటులో ఉంది. ప్రస్తుతం {cur_stock} {unit_str} స్టాక్‌లో ఉంది, అమ్మకం ధర ప్రతి {unit_str}కు ₹{price_val:.2f}."
                return f"Yes! {target_product} is available in your store. You currently have {cur_stock} {unit_str} in stock, and the selling price is ₹{price_val:.2f} per {unit_str}."

            # Scenario B: Product is Completely Unlisted (Not available in store)
            elif inquiry_status == "UNLISTED":
                if is_te:
                    return f"క్షమించండి, {target_product} ప్రస్తుతం మీ స్టోర్‌లో అందుబాటులో లేదు. మీరు ఈ వస్తువును మీ ప్రోడక్ట్ కేటలాగ్‌లో చేర్చాలనుకుంటున్నారా లేదా కొనుగోలు చేయాలనుకుంటున్నారా?"
                return f"Sorry, {target_product} is currently not available in your store. Would you be interested in adding or purchasing this product for your store?"

            # Scenario C: Product Exists but is Out of Stock
            elif inquiry_status == "OUT_OF_STOCK":
                if is_te:
                    return f"{target_product} మీ స్టోర్‌లో జాబితా చేయబడింది, కానీ ప్రస్తుతం అవుట్ ఆఫ్ స్టాక్ (నిల్వ సున్నా) ఉంది. మీరు దీన్ని రీస్టాక్ చేయాలనుకుంటున్నారా?"
                return f"{target_product} is listed in your store, but it is currently out of stock. Would you like to restock this product?"

            # Scenario D: Stock is Running Low
            elif inquiry_status == "LOW_STOCK":
                if is_te:
                    return f"మీ వద్ద {target_product} కేవలం {cur_stock} {unit_str} మాత్రమే మిగిలి ఉంది, ఇది మీ కనీస నిల్వ పరిమితి {thresh_val} {unit_str} కంటే తక్కువ. మీరు దీన్ని రీస్టాక్ చేయాలనుకుంటున్నారా?"
                return f"You currently have only {cur_stock} {unit_str} of {target_product} remaining, which is below your minimum stock level of {thresh_val} {unit_str}. Would you like to restock it?"

            # Scenario E: Multiple Matching Products
            elif inquiry_status == "MULTIPLE_MATCHES":
                m_count = business_context.get("match_count", len(business_context.get("products", [])))
                if is_te:
                    return f"మీ స్టోర్‌లో {m_count} రకాల {target_product} వస్తువులు కనుగొనబడ్డాయి. వాటి పేర్లు, పరిమాణాలు మరియు ధరలతో కూడిన పూర్తి జాబితాను డాష్‌బోర్డ్‌లో ప్రదర్శించాను. నిర్దిష్ట వస్తువు వివరాలు కావాలా?"
                return f"I found {m_count} matching {target_product} products in your store. Here are their names, available quantities, and prices. Would you like details about any particular product?"

            # Scenario F: Similar Products Found
            elif inquiry_status == "SIMILAR_FOUND":
                similar_items = business_context.get("similar_products", [])
                sim_names = ", ".join([s.get("name") for s in similar_items[:3]])
                s_count = len(similar_items)
                if is_te:
                    return f"మీ స్టోర్‌లో {target_product} పేరుతో ఖచ్చితమైన వస్తువు దొరకలేదు. అయితే అలాంటి {s_count} వస్తువులు అందుబాటులో ఉన్నాయి: {sim_names}. మీరు వీటిని చూడాలనుకుంటున్నారా, లేదా {target_product}ను స్టోర్‌లో చేర్చాలనుకుంటున్నారా?"
                return f"I couldn't find an exact match for {target_product} in your store. However, I found {s_count} similar products: {sim_names}. Would you like to check these products, or are you interested in adding {target_product} to your store?"

            # General stock check fallback
            elif cur_stock is not None:
                price_str = f" (ధర: ప్రతి {unit_str}కు ₹{price_val:.2f})" if price_val else ""
                if is_te:
                    return f"ప్రస్తుతం స్టాక్‌లో {cur_stock} {unit_str} {target_product} అందుబాటులో ఉంది{price_str}."
                return f"You currently have {cur_stock} {unit_str} of {target_product} in stock (Selling price: ₹{price_val:.2f}/{unit_str})."
            else:
                tot_p = business_context.get("total_store_products") or business_context.get("total_products")
                prods_list = business_context.get("products") or []
                if tot_p is not None and len(prods_list) == 1:
                    p_single = prods_list[0]
                    p_name = p_single.get("name", "Product")
                    p_stock = p_single.get("current_stock", 0)
                    p_unit = p_single.get("unit", "units")
                    p_price = p_single.get("selling_price", 0)
                    if is_te:
                        return f"మీ స్టోర్‌లో ప్రస్తుతం 1 వస్తువు ఉంది: {p_name} ({p_stock} {p_unit} నిల్వ అందుబాటులో ఉంది, అమ్మకం ధర ₹{p_price:.2f})."
                    return f"Your store currently has 1 product: {p_name} with {p_stock} {p_unit} in stock (Selling price: ₹{p_price:.2f}/{p_unit})."
                elif tot_p is not None:
                    avail_cnt = business_context.get("store_available_count") or business_context.get("available_count", 0)
                    out_cnt = business_context.get("store_out_of_stock_count") or business_context.get("out_of_stock_count", 0)
                    if is_te:
                        return f"మీ స్టోర్‌లో మొత్తం {tot_p} వస్తువులు ఉన్నాయి ({avail_cnt} అందుబాటులో ఉన్నాయి, {out_cnt} నిల్వ లేవు). ఏ వస్తువు యొక్క స్టాక్ వివరాలు తెలుసుకోవాలనుకుంటున్నారో చెప్పండి."
                    return f"Your store currently has {tot_p} products ({avail_cnt} available, {out_cnt} out of stock). Which product's stock would you like to check?"

                if is_te:
                    return f"ఏ వస్తువు యొక్క స్టాక్ వివరాలు తెలుసుకోవాలనుకుంటున్నారో దయచేసి చెప్పండి (ఉదాహరణకు: మెహందీ స్టాక్ ఎంత లేదా బియ్యం స్టాక్ ఎంత)."
                return "Which product's stock would you like to check? Please specify the product name (e.g. 'check mehendi stock' or 'what is the stock of rice?')."

        # 10. List Categories
        elif intent == "list_categories":
            cat_count = business_context.get("categories_count", 0)
            top_names = business_context.get("top_category_names", "")
            if is_te:
                return f"మీ స్టోర్‌లో మొత్తం {cat_count} కేటగిరీలు ఉన్నాయి. ముఖ్యమైనవి: {top_names}. పూర్తి జాబితా మీ డాష్‌బోర్డ్‌లో ఉంది."
            return f"Your store has {cat_count} product categories, including {top_names}. I've displayed the complete category list on your dashboard."

        # 11. Inventory Valuation
        elif intent == "inventory_valuation":
            val = business_context.get("total_valuation", 0.0)
            tot_p = business_context.get("total_products", 0)
            if is_te:
                return f"మీ స్టోర్‌లో మొత్తం {tot_p} వస్తువులు ఉన్నాయి. మొత్తం ఇన్వెంటరీ నిల్వల విలువ ₹{val:.2f}."
            return f"Your store has {tot_p} active products with a total inventory valuation of ₹{val:.2f}."

        # 12. Compare Stock Between Two Products
        elif intent == "compare_stock":
            p1_name = business_context.get("product1_name", intent_data.get("product1", "Product 1"))
            p2_name = business_context.get("product2_name", intent_data.get("product2", "Product 2"))
            p1_stk = business_context.get("product1_stock", 0.0)
            p2_stk = business_context.get("product2_stock", 0.0)
            p1_u = business_context.get("product1_unit", "units")
            p2_u = business_context.get("product2_unit", "units")

            if is_te:
                return f"స్టాక్ పోలిక: మీ వద్ద {p1_stk} {p1_u} {p1_name} మరియు {p2_stk} {p2_u} {p2_name} నిల్వ ఉంది."
            return f"Stock Comparison: You have {p1_stk} {p1_u} of {p1_name} compared to {p2_stk} {p2_u} of {p2_name}."

        # 13. Single Product Price Inquiry
        elif intent == "price_inquiry":
            up = business_context.get("unit_price") or business_context.get("selling_price") or 0.0
            unit = business_context.get("unit") or intent_data.get("unit", "unit")
            prod_title = business_context.get("product_name") or product or intent_data.get("product_query") or "వస్తువు"

            if business_context.get("match_count", 0) > 1:
                cnt = business_context["match_count"]
                if is_te:
                    return f"మీ స్టోర్‌లో {cnt} రకాల {prod_title} వస్తువులు ఉన్నాయి. వాటి ధరల వివరాలను స్క్రీన్‌పై చూపించాను."
                return f"I found {cnt} {prod_title} products in your store. Here are their selling prices displayed on your dashboard."

            if is_te:
                return f"{prod_title} అమ్మకం ధర ప్రతి {unit}కు ₹{up:.2f}."
            return f"The selling price of {prod_title} is ₹{up:.2f} per {unit}."

        # 10. Stock Sale Execution
        elif intent == "inventory_sale":
            qty = intent_data.get("quantity", 1.0)
            unit = intent_data.get("unit", "kg")
            total_price = business_context.get("total_price")
            remaining_stock = business_context.get("remaining_stock")

            if business_context.get("insufficient_stock"):
                if is_te:
                    return f"క్షమించండి, స్టాక్ సరిపోదు. ప్రస్తుతం కేవలం {remaining_stock} {unit} మాత్రమే ఉంది."
                return f"Sorry, insufficient stock available. Current stock is only {remaining_stock} {unit}."

            stock_str = f" మిగిలిన స్టాక్ {remaining_stock} {unit}." if remaining_stock is not None else ""
            price_str = f" మొత్తం విలువ ₹{total_price:.2f}." if total_price is not None else ""

            if is_te:
                return f"{qty} {unit} {product} అమ్మకం విజయవంతంగా రికార్డ్ చేయబడింది.{price_str}{stock_str}"
            return f"Sale of {qty} {unit} of {product} recorded successfully.{price_str}{stock_str}"

        # 11. Stock Addition / Restock
        elif intent == "inventory_add":
            qty = intent_data.get("quantity", 1.0)
            unit = intent_data.get("unit", "kg")
            remaining_stock = business_context.get("remaining_stock")

            if is_te:
                return f"{qty} {unit} {product} స్టాక్‌లో విజయవంతంగా చేర్చబడింది. ప్రస్తుత నిల్వ: {remaining_stock} {unit}."
            return f"Added {qty} {unit} of {product} to inventory. Current stock is now {remaining_stock} {unit}."

        # Fallback
        else:
            if is_te:
                return "క్షమించండి, మీ ప్రశ్న అర్థం కాలేదు. దయచేసి వ్యాపార ప్రశ్నలు లేదా సేల్స్ ఆదేశాలను స్పష్టంగా చెప్పండి."
            return "I couldn't clearly understand that instruction. Please ask a business question or specify a transaction."

voice_nlu_engine = MultilingualVoiceNLU()
