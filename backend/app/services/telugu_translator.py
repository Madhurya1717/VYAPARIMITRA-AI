"""
VyapariMitra AI — Telugu Product Title Translation Service
Provides automatic natural Telugu title generation for Kirana and grocery products.
Preserves brand names, handles regional synonyms, and falls back gracefully.
"""

import json
import logging
import urllib.request
import urllib.parse
from typing import Optional

logger = logging.getLogger(__name__)

KIRANA_GLOSSARY = {
    "rice": "బియ్యం",
    "sona masoori rice": "సోనా మసూరి బియ్యం",
    "basmati rice": "బాస్మతి బియ్యం",
    "brown rice": "బ్రౌన్ రైస్",
    "toor dal": "కందిపప్పు",
    "moong dal": "పెసరపప్పు",
    "urad dal": "మినప్పప్పు",
    "chana dal": "శనగపప్పు",
    "dal": "పప్పు",
    "sugar": "చక్కెర",
    "refined sugar": "పంచదార",
    "jaggery": "బెల్లం",
    "salt": "ఉప్పు",
    "atta": "గోధుమపిండి",
    "wheat flour": "గోధుమ పిండి",
    "maida": "మైదా పిండి",
    "sunflower oil": "సన్‌ఫ్లవర్ నూనె",
    "cooking oil": "వంట నూనె",
    "mustard oil": "ఆవ నూనె",
    "groundnut oil": "వేరుశనగ నూనె",
    "coconut oil": "కొబ్బరి నూనె",
    "ghee": "నెయ్యి",
    "butter": "వెన్న",
    "milk": "పాలు",
    "whole milk": "సంపూర్ణ పాలు",
    "almond milk": "బాదం పాలు",
    "soy milk": "సోయా పాలు",
    "curd": "పెరుగు",
    "yogurt": "పెరుగు",
    "paneer": "పన్నీర్",
    "cheese": "జున్ను",
    "tea": "టీ పొడి",
    "coffee": "కాఫీ పొడి",
    "chilli powder": "కారం పొడి",
    "turmeric powder": "పసుపు పొడి",
    "coriander powder": "ధనియాల పొడి",
    "cumin seeds": "జీలకర్ర",
    "mustard seeds": "ఆవాలు",
    "fenugreek seeds": "మెంతులు",
    "garam masala": "గరం మసాలా",
    "onion": "ఉల్లిపాయ",
    "yellow onion": "పసుపు ఉల్లిపాయ",
    "red onion": "ఎర్ర ఉల్లిపాయ",
    "potato": "బంగాళాదుంప",
    "tomato": "టమోటా",
    "garlic": "వెల్లుల్లి",
    "ginger": "అల్లం",
    "lemon": "నిమ్మకాయ",
    "lime": "నిమ్మకాయ",
    "banana": "అరటిపండు",
    "apple": "ఆపిల్",
    "green apple": "గ్రీన్ ఆపిల్",
    "mango": "మామిడిపండు",
    "grapes": "ద్రాక్ష",
    "red grapes": "ఎర్ర ద్రాక్ష",
    "green grapes": "ఆకుపచ్చ ద్రాక్ష",
    "watermelon": "పుచ్చకాయ",
    "papaya": "బొప్పాయి",
    "cucumber": "దోసకాయ",
    "carrot": "క్యారెట్",
    "cabbage": "క్యాబేజీ",
    "cauliflower": "కాలీఫ్లవర్",
    "spinach": "పాలకూర",
    "coriander": "కొత్తిమీర",
    "mint": "పుదీనా",
    "curry leaves": "కరివేపాకు",
    "green chilli": "పచ్చిమిర్చి",
    "spring water": "సహజ ఊట నీరు",
    "natural spring water": "సహజ ఊట నీరు",
    "mineral water": "మినరల్ వాటర్",
    "drinking water": "తాగునీరు",
    "bread": "బ్రెడ్",
    "eggs": "గుడ్లు",
    "soap": "సబ్బు",
    "shampoo": "షాంపూ",
    "toothpaste": "టూత్‌పేస్ట్",
    "mehendi": "మెహందీ",
}

def translate_product_to_telugu(english_name: str) -> str:
    """
    Translates an English product name into an accurate, natural Telugu title.
    Preserves brand names and applies regional kirana vocabulary.
    """
    cleaned = (english_name or "").strip()
    if not cleaned:
        return ""

    lower = cleaned.lower()

    # 1. Exact glossary match
    if lower in KIRANA_GLOSSARY:
        return KIRANA_GLOSSARY[lower]

    # 2. Check for organic prefix
    if lower.startswith("organic "):
        base_item = lower[len("organic "):].strip()
        if base_item in KIRANA_GLOSSARY:
            return f"సేంద్రీయ {KIRANA_GLOSSARY[base_item]}"

    # 3. Dynamic online translation query
    try:
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=te&dt=t&q={urllib.parse.quote(cleaned)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VyapariMitra/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            parts = [part[0] for part in data[0] if part and part[0]]
            trans = "".join(parts).strip().rstrip(".,;! ")
            if trans:
                return trans
    except Exception as e:
        logger.warning(f"Dynamic Telugu translation failed for '{cleaned}': {e}")

    return cleaned

