import openai
import io
from app.core.config import settings
from app.models.schemas import NutritionInfo, VoiceAnalysisResponse
from app.services.gemini_service import analyze_food_text

client = openai.AsyncOpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    if not client:
        raise ValueError("OpenAI API key not configured")

    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="en",
    )
    return transcript.text


async def analyze_voice_message(audio_bytes: bytes, filename: str = "audio.webm") -> VoiceAnalysisResponse:
    transcript = await transcribe_audio(audio_bytes, filename)
    nutrition = await analyze_food_text(transcript)
    return VoiceAnalysisResponse(transcript=transcript, nutrition=nutrition)
