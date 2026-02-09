"""Google Gemini API client wrapper."""

import base64
import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


class GoogleClient:
    """Async wrapper around the Google GenAI Python SDK."""

    def __init__(self, api_key: str) -> None:
        self.client = genai.Client(api_key=api_key)

    async def generate_content(
        self,
        prompt: str,
        model: str = "gemini-2.5-flash",
        system: str = "",
    ) -> str:
        """Generate text from a single prompt.

        Args:
            prompt: The user prompt.
            model: Gemini model ID.
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            config = types.GenerateContentConfig()
            if system:
                config.system_instruction = system

            response = await self.client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=config,
            )
            return response.text or ""
        except Exception:
            logger.exception("Google generate_content failed")
            return ""

    async def generate_with_history(
        self,
        messages: list[dict],
        model: str = "gemini-2.5-flash",
        system: str = "",
    ) -> str:
        """Generate text using a multi-turn conversation history.

        Args:
            messages: List of dicts with ``role`` (user/assistant) and ``content`` keys.
            model: Gemini model ID.
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            contents: list[types.Content] = []
            for m in messages:
                role = m.get("role", "user")
                # Gemini uses "model" instead of "assistant"
                gemini_role = "model" if role == "assistant" else "user"
                contents.append(
                    types.Content(
                        role=gemini_role,
                        parts=[types.Part.from_text(text=m["content"])],
                    )
                )

            if not contents:
                logger.warning("No valid messages provided to generate_with_history")
                return ""

            config = types.GenerateContentConfig()
            if system:
                config.system_instruction = system

            response = await self.client.aio.models.generate_content(
                model=model,
                contents=contents,
                config=config,
            )
            return response.text or ""
        except Exception:
            logger.exception("Google generate_with_history failed")
            return ""

    async def generate_multimodal(
        self,
        prompt: str,
        image_base64: str,
        model: str = "gemini-2.5-flash",
    ) -> str:
        """Generate text from an image + text prompt.

        Args:
            prompt: Text prompt describing what to do with the image.
            image_base64: Base64-encoded image data.
            model: Gemini model ID.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            image_bytes = base64.b64decode(image_base64)
            image_part = types.Part.from_bytes(
                data=image_bytes,
                mime_type="image/png",
            )
            text_part = types.Part.from_text(text=prompt)

            response = await self.client.aio.models.generate_content(
                model=model,
                contents=[image_part, text_part],
            )
            return response.text or ""
        except Exception:
            logger.exception("Google generate_multimodal failed")
            return ""

    async def generate_with_pdf(
        self,
        prompt: str,
        pdf_base64: str,
        model: str = "gemini-2.5-flash",
    ) -> str:
        """Generate text from a PDF document + text prompt.

        Args:
            prompt: Text prompt describing what to do with the PDF.
            pdf_base64: Base64-encoded PDF data.
            model: Gemini model ID.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            pdf_bytes = base64.b64decode(pdf_base64)
            pdf_part = types.Part.from_bytes(
                data=pdf_bytes,
                mime_type="application/pdf",
            )
            text_part = types.Part.from_text(text=prompt)

            response = await self.client.aio.models.generate_content(
                model=model,
                contents=[pdf_part, text_part],
            )
            return response.text or ""
        except Exception:
            logger.exception("Google generate_with_pdf failed")
            return ""
