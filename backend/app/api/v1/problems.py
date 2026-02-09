"""問題 CRUD・生成・検索 API"""
import json
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app.core.auth import verify_clerk_token
from app.services.problem_service import ProblemService
from app.models.problem import (
    ProblemGenerateRequest,
    FiveStageRequest,
    ThreeProblemRequest,
    ProblemSearchRequest,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_problem_service: ProblemService | None = None


def _get_problem_service() -> ProblemService:
    global _problem_service
    if _problem_service is None:
        _problem_service = ProblemService()
    return _problem_service


async def _require_user(request: Request) -> dict:
    user = await verify_clerk_token(request)
    if not user or not user.get("user_id"):
        raise HTTPException(status_code=401, detail="認証が必要です")
    return user


# ── CRUD ──


@router.get("/problems")
async def list_problems(request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    return await svc.get_user_problems(user["user_id"])


@router.get("/problems/{problem_id}")
async def get_problem(problem_id: int, request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    problem = await svc.get_problem(problem_id, user["user_id"])
    if not problem:
        raise HTTPException(status_code=404, detail="問題が見つかりません")
    return problem


@router.put("/problems/{problem_id}")
async def update_problem(problem_id: int, request: Request):
    user = await _require_user(request)
    body = await request.json()
    svc = _get_problem_service()
    result = await svc.update_problem(problem_id, user["user_id"], body)
    if not result:
        raise HTTPException(status_code=404, detail="問題が見つかりません")
    return result


@router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: int, request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    deleted = await svc.delete_problem(problem_id, user["user_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="問題が見つかりません")
    return {"success": True}


@router.put("/problems/{problem_id}/check-info")
async def update_check_info(problem_id: int, request: Request):
    user = await _require_user(request)
    body = await request.json()
    svc = _get_problem_service()
    result = await svc.update_check_info(problem_id, user["user_id"], body)
    if not result:
        raise HTTPException(status_code=404, detail="問題が見つかりません")
    return result


# ── 検索 ──


@router.post("/problems/search")
async def search_problems(body: ProblemSearchRequest, request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    return await svc.search_problems(user["user_id"], body.model_dump(exclude_none=True))


# ── 生成 ──


@router.post("/generate-problem")
async def generate_problem(body: ProblemGenerateRequest, request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    result = await svc.generate_problem(
        user["user_id"],
        body.prompt,
        api=body.preferred_api,
        model=body.preferred_model,
        subject=body.subject,
        units=body.units,
        excluded_units=body.excluded_units,
        difficulty=body.difficulty,
    )
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


@router.post("/generate-problem-sse")
async def generate_five_stage_sse(body: FiveStageRequest, request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()

    async def event_stream():
        async for event in svc.generate_five_stage_sse(
            user["user_id"],
            body.prompt,
            api=body.preferred_api,
            model=body.preferred_model,
            subject=body.subject,
            units=body.units,
            excluded_units=body.excluded_units,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/generate-three-problems-sse")
async def generate_three_problems_sse(request: Request):
    user = await _require_user(request)
    form = await request.form()
    excluded_units_raw = form.get("excluded_units", "[]")
    try:
        excluded_units = json.loads(excluded_units_raw) if isinstance(excluded_units_raw, str) else []
    except json.JSONDecodeError:
        excluded_units = []

    preferred_api = form.get("preferred_api")
    preferred_model = form.get("preferred_model")

    # ファイル処理
    import base64
    problem_files = []
    solution_files = []
    for key in form:
        if key.startswith("problem_file"):
            f = form[key]
            data = await f.read()
            problem_files.append(base64.b64encode(data).decode())
        elif key.startswith("solution_file"):
            f = form[key]
            data = await f.read()
            solution_files.append(base64.b64encode(data).decode())

    svc = _get_problem_service()

    async def event_stream():
        async for event in svc.generate_three_problems_sse(
            user["user_id"],
            problem_files=problem_files or None,
            solution_files=solution_files or None,
            excluded_units=excluded_units or None,
            api=preferred_api,
            model=preferred_model,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── 図形再生成 ──


@router.post("/problems/{problem_id}/regenerate-geometry")
async def regenerate_geometry(problem_id: int, request: Request):
    user = await _require_user(request)
    body = await request.json()
    svc = _get_problem_service()
    result = await svc.regenerate_geometry(
        problem_id, user["user_id"],
        api=body.get("preferred_api"),
        model=body.get("preferred_model"),
    )
    return result


# ── PDFプレビュー ──


@router.post("/preview-pdf-content")
async def preview_pdf_content(request: Request):
    user = await _require_user(request)
    svc = _get_problem_service()
    await svc.increment_preview_count(user["user_id"])

    form = await request.form()
    import base64
    files = []
    for key in form:
        if key.startswith("file"):
            f = form[key]
            data = await f.read()
            files.append(base64.b64encode(data).decode())

    if not files:
        raise HTTPException(status_code=400, detail="ファイルが必要です")

    google_client = svc.clients.get("gemini")
    if not google_client:
        raise HTTPException(status_code=500, detail="Gemini APIが設定されていません")

    results = []
    for f_data in files:
        try:
            text = await google_client.generate_with_pdf(
                "この数学の問題を正確にテキストとして書き起こしてください。数式はLaTeX形式で表現してください。",
                f_data,
            )
            results.append(text)
        except Exception as e:
            results.append(f"抽出エラー: {e}")

    return {"texts": results}
