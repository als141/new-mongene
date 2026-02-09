"""認証・ユーザー管理 API — Clerkとの連携"""
import logging
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_supabase_client
from app.core.auth import verify_clerk_token

router = APIRouter()
logger = logging.getLogger(__name__)


class UserProfileUpdate(BaseModel):
    preferred_api: Optional[str] = None
    preferred_model: Optional[str] = None
    profile_image: Optional[str] = None
    email: Optional[str] = None


class ClerkWebhookPayload(BaseModel):
    type: str
    data: dict


async def _get_user_from_request(request: Request) -> dict:
    user = await verify_clerk_token(request)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="認証が必要です")
    return user


@router.get("/user-info")
async def get_user_info(request: Request):
    user = await _get_user_from_request(request)
    db = get_supabase_client()
    result = db.table("users").select("*").eq("id", user["user_id"]).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")
    return result.data


@router.get("/user-profile")
async def get_user_profile(request: Request):
    return await get_user_info(request)


@router.put("/user-settings")
async def update_user_settings(body: UserProfileUpdate, request: Request):
    user = await _get_user_from_request(request)
    db = get_supabase_client()
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="更新するフィールドがありません")
    result = db.table("users").update(update_data).eq("id", user["user_id"]).execute()
    return result.data[0] if result.data else {"success": True}


@router.put("/profile-image")
async def update_profile_image(request: Request):
    user = await _get_user_from_request(request)
    body = await request.json()
    image = body.get("profile_image")
    if not image:
        raise HTTPException(status_code=400, detail="画像データが必要です")
    db = get_supabase_client()
    db.table("users").update({"profile_image": image}).eq("id", user["user_id"]).execute()
    return {"success": True}


@router.delete("/profile-image")
async def delete_profile_image(request: Request):
    user = await _get_user_from_request(request)
    db = get_supabase_client()
    db.table("users").update({"profile_image": None}).eq("id", user["user_id"]).execute()
    return {"success": True}


@router.post("/webhook/clerk")
async def clerk_webhook(payload: ClerkWebhookPayload):
    """Clerk Webhookでユーザー作成/更新を同期"""
    db = get_supabase_client()
    event_type = payload.type
    data = payload.data

    if event_type == "user.created":
        user_data = {
            "id": data.get("id"),
            "email": (data.get("email_addresses") or [{}])[0].get("email_address", ""),
            "school_code": data.get("public_metadata", {}).get("school_code", ""),
            "role": data.get("public_metadata", {}).get("role", "teacher"),
        }
        db.table("users").upsert(user_data).execute()
        return {"success": True}
    elif event_type == "user.updated":
        user_data = {
            "id": data.get("id"),
            "email": (data.get("email_addresses") or [{}])[0].get("email_address", ""),
        }
        db.table("users").upsert(user_data).execute()
        return {"success": True}
    elif event_type == "user.deleted":
        db.table("users").delete().eq("id", data.get("id")).execute()
        return {"success": True}

    return {"success": True}
