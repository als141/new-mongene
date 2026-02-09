import httpx
from fastapi import HTTPException, Request
from app.config.settings import get_settings


async def get_current_user(request: Request) -> dict:
    """Clerk JWTからユーザー情報を取得"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="認証が必要です")

    token = auth_header.split(" ", 1)[1]
    settings = get_settings()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.clerk.com/v1/sessions/verify",
                headers={
                    "Authorization": f"Bearer {settings.clerk_secret_key}",
                    "Content-Type": "application/json",
                },
                params={"token": token},
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="無効なトークンです")
        return resp.json()
    except httpx.HTTPError:
        raise HTTPException(status_code=401, detail="認証サーバーに接続できません")


async def verify_clerk_token(request: Request) -> dict | None:
    """Clerkセッショントークンを検証し、ユーザー情報を返す。
    フロントエンドからは __session cookie または Authorization header で送られる。
    """
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    if not token:
        token = request.cookies.get("__session")

    if not token:
        return None

    settings = get_settings()
    if not settings.clerk_secret_key:
        return None

    try:
        from jose import jwt as jose_jwt

        payload = jose_jwt.decode(
            token,
            settings.clerk_secret_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return {
            "user_id": payload.get("sub"),
            "email": payload.get("email"),
            "session_id": payload.get("sid"),
        }
    except Exception:
        return None
