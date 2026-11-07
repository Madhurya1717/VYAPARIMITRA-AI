import logging
import httpx
from typing import Dict, Any, Optional
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class GnaniPrismaSTTService:
    """
    Official Client Integration for Gnani Prisma Speech-to-Text.
    Supports Prisma v2.5 and Prisma v3.0 via REST POST https://api.vachana.ai/stt/v3.
    """

    def __init__(self):
        self.api_key = settings.GNANI_API_KEY
        self.endpoint = settings.GNANI_STT_ENDPOINT
        self.default_model = settings.GNANI_STT_DEFAULT_MODEL
        self.default_lang = settings.GNANI_STT_DEFAULT_LANG

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        content_type: str = "audio/wav",
        language_code: Optional[str] = None,
        model: Optional[str] = None,
        output_format: str = "transcribe"
    ) -> Dict[str, Any]:
        """
        Sends audio to Gnani Prisma STT API.
        If GNANI_API_KEY is not configured or in offline test mode,
        falls back to documented synthetic fixtures with clear attribution.
        """
        target_lang = language_code or self.default_lang
        target_model = model or self.default_model

        # Check if live credentials are configured
        if self.api_key and self.api_key.strip():
            headers = {
                "X-API-Key-ID": self.api_key.strip()
            }
            files = {
                "audio_file": (filename, audio_bytes, content_type)
            }
            data = {
                "language_code": target_lang,
                "model": target_model,
                "format": output_format
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        self.endpoint,
                        headers=headers,
                        files=files,
                        data=data
                    )
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        logger.info(f"Gnani Prisma STT success: req_id={res_json.get('request_id')}")
                        return {
                            "success": True,
                            "is_live_api": True,
                            "transcript": res_json.get("transcript", ""),
                            "request_id": res_json.get("request_id"),
                            "model": res_json.get("model", target_model),
                            "detected_language_code": res_json.get("detected_language_code", target_lang),
                            "processing_time": res_json.get("processing_time", 0.0),
                            "error": None
                        }
                    else:
                        logger.warning(f"Gnani STT returned HTTP {response.status_code}: {response.text}")
                        return {
                            "success": False,
                            "is_live_api": True,
                            "transcript": "",
                            "error": f"Gnani STT API error {response.status_code}: {response.text}",
                            "status_code": response.status_code
                        }
            except Exception as e:
                logger.error(f"Failed to communicate with Gnani STT API: {str(e)}")
                # If network fails or exception occurs, report transparently
                return {
                    "success": False,
                    "is_live_api": True,
                    "transcript": "",
                    "error": f"Gnani STT Network exception: {str(e)}"
                }

        # Offline / Demo Mode with realistic synthetic mapping
        logger.info("GNANI_API_KEY not configured. Utilizing offline test fixture resolver.")
        simulated_transcript = self._resolve_simulated_transcript(audio_bytes, target_lang)
        return {
            "success": True,
            "is_live_api": False,
            "transcript": simulated_transcript,
            "request_id": "simulated-prisma-stt-local-dev",
            "model": f"{target_model} (simulation-mode: please set GNANI_API_KEY in .env for live cloud inference)",
            "detected_language_code": target_lang,
            "processing_time": 0.42,
            "error": None
        }

    def _resolve_simulated_transcript(self, audio_bytes: bytes, language: str) -> str:
        """
        Provides realistic sample transcriptions for automated testing and zero-credential demos.
        """
        # If byte length indicates specific test pattern or default
        if "en" in language.lower():
            return "I sold 10 kilograms of rice today"
        elif "tenglish" in language.lower():
            return "Today 10 kilos rice sell chesanu"
        else:
            return "ఈరోజు 10 కిలోల బియ్యం అమ్మాను"

gnani_stt_service = GnaniPrismaSTTService()

