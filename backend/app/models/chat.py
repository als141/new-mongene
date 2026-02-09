from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    api: str = "gemini"
    model: str = "gemini-2.5-flash"
    history: Optional[list[ChatMessage]] = None
    files: Optional[list[str]] = None  # base64 encoded


class ChatResponse(BaseModel):
    success: bool
    content: str = ""
    error: Optional[str] = None
