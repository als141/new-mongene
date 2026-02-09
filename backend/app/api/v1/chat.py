"""ラボラトリー: マルチモデルAIチャット API"""
import logging
from fastapi import APIRouter, HTTPException, Request

from app.core.auth import verify_clerk_token
from app.core.database import get_supabase_client
from app.config.settings import get_settings
from app.clients.anthropic_client import AnthropicClient
from app.clients.openai_client import OpenAIClient
from app.clients.google_client import GoogleClient
from app.models.chat import ChatRequest, ChatResponse

router = APIRouter()
logger = logging.getLogger(__name__)

_clients: dict | None = None


def _get_clients() -> dict:
    global _clients
    if _clients is None:
        s = get_settings()
        _clients = {}
        if s.anthropic_api_key:
            _clients["claude"] = AnthropicClient(s.anthropic_api_key)
        if s.openai_api_key:
            _clients["openai"] = OpenAIClient(s.openai_api_key)
        if s.google_api_key:
            _clients["gemini"] = GoogleClient(s.google_api_key)
    return _clients


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request):
    user = await verify_clerk_token(request)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="認証が必要です")

    # admin権限チェック
    db = get_supabase_client()
    user_data = db.table("users").select("role").eq("id", user["user_id"]).single().execute()
    if not user_data.data or user_data.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    clients = _get_clients()
    client = clients.get(body.api)
    if not client:
        raise HTTPException(status_code=400, detail=f"APIプロバイダー '{body.api}' が設定されていません")

    try:
        if body.files:
            # マルチモーダル
            content = await client.generate_multimodal(body.message, body.files[0], model=body.model)
        elif body.history:
            messages = [{"role": m.role, "content": m.content} for m in body.history]
            messages.append({"role": "user", "content": body.message})
            content = await client.generate_with_history(messages, model=body.model)
        else:
            content = await client.generate_content(body.message, model=body.model)

        return ChatResponse(success=True, content=content)
    except Exception as e:
        logger.exception("Chat failed")
        return ChatResponse(success=False, error=str(e))
