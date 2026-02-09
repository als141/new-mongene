"""OpenAI API client wrapper."""

import logging

import openai

logger = logging.getLogger(__name__)

_MODEL_MAP: dict[str, str] = {
    "gpt-5": "gpt-4o",
    "gpt-5-mini": "gpt-4o-mini",
}


class OpenAIClient:
    """Async wrapper around the OpenAI Python SDK."""

    def __init__(self, api_key: str) -> None:
        self.client = openai.AsyncOpenAI(api_key=api_key)

    def _map_model(self, model: str) -> str:
        """Map friendly model names to actual OpenAI model IDs.

        Args:
            model: Friendly name or actual model ID.

        Returns:
            Resolved model ID.
        """
        return _MODEL_MAP.get(model, model)

    async def generate_content(
        self,
        prompt: str,
        model: str = "gpt-4o",
        system: str = "",
    ) -> str:
        """Generate text from a single prompt.

        Args:
            prompt: The user prompt.
            model: OpenAI model name (friendly or actual).
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            resolved_model = self._map_model(model)
            messages: list[dict] = []
            if system:
                messages.append({"role": "system", "content": system})
            messages.append({"role": "user", "content": prompt})

            response = await self.client.chat.completions.create(
                model=resolved_model,
                max_tokens=5000,
                messages=messages,
            )
            return response.choices[0].message.content or ""
        except Exception:
            logger.exception("OpenAI generate_content failed")
            return ""

    async def generate_with_history(
        self,
        messages: list[dict],
        model: str = "gpt-4o",
        system: str = "",
    ) -> str:
        """Generate text using a multi-turn conversation history.

        Args:
            messages: List of dicts with ``role`` and ``content`` keys.
            model: OpenAI model name (friendly or actual).
            system: Optional system instruction.

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            resolved_model = self._map_model(model)
            formatted: list[dict] = []
            if system:
                formatted.append({"role": "system", "content": system})
            for m in messages:
                role = m.get("role", "user")
                if role in ("user", "assistant", "system"):
                    formatted.append({"role": role, "content": m["content"]})

            if not any(m["role"] != "system" for m in formatted):
                logger.warning("No valid messages provided to generate_with_history")
                return ""

            response = await self.client.chat.completions.create(
                model=resolved_model,
                max_tokens=5000,
                messages=formatted,
            )
            return response.choices[0].message.content or ""
        except Exception:
            logger.exception("OpenAI generate_with_history failed")
            return ""

    async def generate_multimodal(
        self,
        prompt: str,
        image_base64: str,
        model: str = "gpt-4o",
    ) -> str:
        """Generate text from an image + text prompt.

        Args:
            prompt: Text prompt describing what to do with the image.
            image_base64: Base64-encoded image data.
            model: OpenAI model name (friendly or actual).

        Returns:
            Generated text, or empty string on failure.
        """
        try:
            resolved_model = self._map_model(model)
            response = await self.client.chat.completions.create(
                model=resolved_model,
                max_tokens=5000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}",
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
            return response.choices[0].message.content or ""
        except Exception:
            logger.exception("OpenAI generate_multimodal failed")
            return ""
