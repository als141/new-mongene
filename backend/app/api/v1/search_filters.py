import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_supabase_client
from app.core.auth import verify_clerk_token

router = APIRouter()
logger = logging.getLogger(__name__)


class SearchFilterCreate(BaseModel):
    name: str
    keyword: Optional[str] = None
    subject: Optional[str] = None
    units: Optional[list[str]] = None
    year: Optional[str] = None
    exam_session: Optional[str] = None
    is_checked: Optional[bool] = None


class SearchFilterUpdate(BaseModel):
    name: Optional[str] = None
    keyword: Optional[str] = None
    subject: Optional[str] = None
    units: Optional[list[str]] = None
    year: Optional[str] = None
    exam_session: Optional[str] = None
    is_checked: Optional[bool] = None


async def _require_user(request: Request) -> dict:
    user = await verify_clerk_token(request)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="認証が必要です")
    return user


@router.post("/search-filters")
async def create_search_filter(body: SearchFilterCreate, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    data = body.model_dump()
    data["user_id"] = user["user_id"]
    result = db.table("search_filters").insert(data).execute()
    return result.data[0] if result.data else {}


@router.get("/search-filters")
async def list_search_filters(request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    result = db.table("search_filters").select("*").eq("user_id", user["user_id"]).order("created_at", desc=True).execute()
    return result.data or []


@router.get("/search-filters/{filter_id}")
async def get_search_filter(filter_id: int, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    result = db.table("search_filters").select("*").eq("id", filter_id).eq("user_id", user["user_id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="フィルタが見つかりません")
    return result.data


@router.put("/search-filters/{filter_id}")
async def update_search_filter(filter_id: int, body: SearchFilterUpdate, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    result = db.table("search_filters").update(update_data).eq("id", filter_id).eq("user_id", user["user_id"]).execute()
    return result.data[0] if result.data else {}


@router.delete("/search-filters/{filter_id}")
async def delete_search_filter(filter_id: int, request: Request):
    user = await _require_user(request)
    db = get_supabase_client()
    db.table("search_filters").delete().eq("id", filter_id).eq("user_id", user["user_id"]).execute()
    return {"success": True}
