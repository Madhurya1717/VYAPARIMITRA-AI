import asyncio
import sys
import os

# Ensure project root in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.config import settings
from backend.app.services.gnani_stt import gnani_stt_service
from backend.app.services.gnani_tts import gnani_tts_service
from backend.app.services.voice_nlu import voice_nlu_engine

async def test_live_gnani():
    print("=" * 65)
    print("VYAPARIMITRA AI — GNANI.AI LIVE API COMPREHENSIVE VERIFICATION")
    print("=" * 65)
    print(f"API Base URL: {settings.GNANI_API_BASE_URL}")
    print(f"STT Endpoint: {settings.GNANI_STT_ENDPOINT}")
    print(f"TTS Endpoint: {settings.GNANI_TTS_ENDPOINT}")
    print(f"API Key Length: {len(settings.GNANI_API_KEY)} chars")
    masked_key = settings.GNANI_API_KEY[:10] + "..." + settings.GNANI_API_KEY[-6:]
    print(f"Configured Key Masked: {masked_key}")
    print("-" * 65)

    test_cases = [
        ("Pure Telugu (తెలుగు)", "te-IN", "ఈరోజు పది కిలోల బియ్యం అమ్మాను"),
        ("Indian English", "en-IN", "I sold 10 kilograms of rice today"),
        ("Tenglish (Code-Mixed)", "te-IN", "Today 10 kilos rice sell chesanu")
    ]

    all_passed = True

    for name, lang, text in test_cases:
        print(f"\n--- Testing: {name} ---")
        print(f"Input Prompt: \"{text}\" (lang={lang})")
        
        # 1. Test Timbre Live TTS
        tts_res = await gnani_tts_service.synthesize_speech(text=text, language=lang)
        is_live_tts = tts_res.get("is_live_api", False)
        audio_bytes = tts_res.get("audio_bytes", b"")
        print(f"[TTS Live Synthesis] Success: {tts_res.get('success')} | Live API: {is_live_tts} | Audio Size: {len(audio_bytes)} bytes")
        
        if not is_live_tts or len(audio_bytes) < 1000:
            print(f"[TTS WARNING] Timbre did not return live cloud audio. Error: {tts_res.get('error')}")
            all_passed = False

        # 2. Test Prisma Live STT
        stt_res = await gnani_stt_service.transcribe_audio(
            audio_bytes=audio_bytes,
            filename=f"{lang}_sample.wav",
            language_code=lang
        )
        is_live_stt = stt_res.get("is_live_api", False)
        transcript = stt_res.get("transcript", "")
        print(f"[STT Live Transcription] Success: {stt_res.get('success')} | Live API: {is_live_stt} | Request ID: {stt_res.get('request_id')}")
        print(f"[Recognized Transcript]: \"{transcript}\"")

        if not is_live_stt or not transcript:
            print(f"[STT WARNING] Prisma did not return valid live transcript. Error: {stt_res.get('error')}")
            all_passed = False

        # 3. Test NLU Engine
        nlu_res = voice_nlu_engine.parse_command(transcript)
        intent = nlu_res.get("intent")
        prod = nlu_res.get("product_name")
        qty = nlu_res.get("quantity")
        unit = nlu_res.get("unit")
        print(f"[NLU Interpretation] Intent: {intent} | Product: {prod} | Quantity: {qty} {unit}")
        print(f"[Spoken Response Feedback]: \"{nlu_res.get('spoken_response')}\"")

    print("\n" + "=" * 65)
    if all_passed:
        print("ALL MULTILINGUAL LIVE GNANI.AI API TESTS PASSED SUCCESSFULLY (100% LIVE CLOUD)!")
    else:
        print("SOME TESTS REPORTED ISSUES (See above)")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(test_live_gnani())

