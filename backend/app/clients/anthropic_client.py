"""Anthropic Claude API client wrapper."""

import logging

import anthropic

logger = logging.getLogger(__name__)


class AnthropicClient:
    """Async wrapper around the Anthropic Python SDK."""

    def __init__(self, api_key: str) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def generate_content(
        self,
        prompt: str,
        model: str = "claude-sonnet-4-20250514",
        system: str = "",
    ) -> str:
        """Generate text from a single prompt.

        Args:
            prompt: The user prompt.
            model: Anthropic model ID.
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            kwargs: dict = {
                "model": model,
                "max_tokens": 8192,
                "messages": [{"role": "user", "content": prompt}],
            }
            if system:
                kwargs["system"] = system

            response = await self.client.messages.create(**kwargs)
            return response.content[0].text
        except Exception:
            logger.exception("Anthropic generate_content failed")
            return ""

    async def generate_with_history(
        self,
        messages: list[dict],
        model: str = "claude-sonnet-4-20250514",
        system: str = "",
    ) -> str:
        """Generate text using a multi-turn conversation history.

        Args:
            messages: List of dicts with ``role`` (user/assistant) and ``content`` keys.
            model: Anthropic model ID.
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            formatted = [
                {"role": m["role"], "content": m["content"]}
                for m in messages
                if m.get("role") in ("user", "assistant")
            ]
            if not formatted:
                logger.warning("No valid messages provided to generate_with_history")
                return ""

            kwargs: dict = {
                "model": model,
                "max_tokens": 8192,
                "messages": formatted,
            }
            if system:
                kwargs["system"] = system

            response = await self.client.messages.create(**kwargs)
            return response.content[0].text
        except Exception:
            logger.exception("Anthropic generate_with_history failed")
            return ""

    async def generate_multimodal(
        self,
        prompt: str,
        image_base64: str,
        model: str = "claude-sonnet-4-20250514",
    ) -> str:
        """Generate text from an image + text prompt.

        Args:
            prompt: Text prompt describing what to do with the image.
            image_base64: Base64-encoded PNG image data.
            model: Anthropic model ID.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            response = await self.client.messages.create(
                model=model,
                max_tokens=8192,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": image_base64,
                                },
                            },
                            {
                                "type": "text",
                                "text": prompt,
                            },
                        ],
                    }
                ],
            )
            return response.content[0].text
        except Exception:
            logger.exception("Anthropic generate_multimodal failed")
            return ""
