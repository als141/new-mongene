import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.database import get_supabase_client
from app.core.auth import verify_clerk_token

router = APIRouter()
logger = logging.getLogger(__name__)


class SourceListCreate(BaseModel):
    year: str
    exam_session: str


async def _require_user(request: Request) -> dict:
    user = await verify_clerk_token(request)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="認証が必要です")
    return user


@router.post("/source-list")
async def add_source_item(body: SourceListCreate, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    data = body.model_dump()
    data["user_id"] = user["user_id"]
    result = db.table("source_list").upsert(data, on_conflict="user_id,year,exam_session").execute()
    return result.data[0] if result.data else {}


@router.get("/source-list")
async def list_source_items(request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    result = db.table("source_list").select("*").eq("user_id", user["user_id"]).order("year", desc=True).execute()
    return result.data or []


@router.delete("/source-list/{item_id}")
async def delete_source_item(item_id: int, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    db.table("source_list").delete().eq("id", item_id).eq("user_id", user["user_id"]).execute()
    return {"success": True}
