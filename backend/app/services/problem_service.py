"""問題生成サービス — 5段階/3問題生成、検索、CRUDを統合"""
import json
import re
import logging
from typing import AsyncGenerator, Any
from datetime import datetime, timezone

from app.config.settings import get_settings
from app.core.database import get_supabase_client
from app.clients.anthropic_client import AnthropicClient
from app.clients.openai_client import OpenAIClient
from app.clients.google_client import GoogleClient
from app.services.geometry_service import GeometryService
from app.utils.prompt_loader import (
    load_prompt,
    load_sample_problems,
    extract_python_code,
    extract_problem_text,
    extract_solution_text,
    remove_import_statements,
)

logger = logging.getLogger(__name__)


class ProblemService:
    def __init__(self):
        settings = get_settings()
        self.clients: dict[str, Any] = {}
        if settings.anthropic_api_key:
            self.clients["claude"] = AnthropicClient(settings.anthropic_api_key)
        if settings.openai_api_key:
            self.clients["openai"] = OpenAIClient(settings.openai_api_key)
        if settings.google_api_key:
            self.clients["gemini"] = GoogleClient(settings.google_api_key)
        self.geometry_service = GeometryService()
        self.db = get_supabase_client()

    def _get_client(self, api: str | None = None):
        api = api or get_settings().default_ai_provider
        client = self.clients.get(api)
        if not client:
            for c in self.clients.values():
                return c
            raise RuntimeError("AIクライアントが設定されていません")
        return client

    # ── CRUD ──

    async def create_problem(self, user_id: str, data: dict) -> dict:
        data["user_id"] = user_id
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = data["created_at"]
        result = self.db.table("problems").insert(data).execute()
        return result.data[0] if result.data else {}

    async def get_user_problems(self, user_id: str) -> list[dict]:
        result = self.db.table("problems").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return result.data or []

    async def get_problem(self, problem_id: int, user_id: str) -> dict | None:
        result = self.db.table("problems").select("*").eq("id", problem_id).eq("user_id", user_id).single().execute()
        return result.data

    async def update_problem(self, problem_id: int, user_id: str, data: dict) -> dict | None:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = self.db.table("problems").update(data).eq("id", problem_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    async def delete_problem(self, problem_id: int, user_id: str) -> bool:
        result = self.db.table("problems").delete().eq("id", problem_id).eq("user_id", user_id).execute()
        return bool(result.data)

    async def update_check_info(self, problem_id: int, user_id: str, check_info: dict) -> dict | None:
        return await self.update_problem(problem_id, user_id, {"check_info": check_info})

    # ── 検索 ──

    async def search_problems(self, user_id: str, params: dict) -> list[dict]:
        query = self.db.table("problems").select("*").eq("user_id", user_id)
        if params.get("keyword"):
            query = query.ilike("content", f"%{params['keyword']}%")
        if params.get("subject"):
            query = query.eq("subject", params["subject"])
        result = query.order("created_at", desc=True).execute()
        problems = result.data or []

        # アプリレベルフィルタ (check_info, units, year, opinion_profile_v2)
        if params.get("units"):
            problems = [p for p in problems if self._matches_units(p, params["units"])]
        if params.get("year"):
            problems = [p for p in problems if self._matches_year(p, params["year"])]
        if params.get("exam_session"):
            problems = [p for p in problems if self._matches_exam_session(p, params["exam_session"])]
        if params.get("is_checked") is not None:
            problems = [p for p in problems if self._matches_checked(p, params["is_checked"])]
        return problems

    def _matches_units(self, problem: dict, units: list[str]) -> bool:
        ci = problem.get("check_info") or {}
        p_units = ci.get("units") or []
        return any(u in p_units for u in units)

    def _matches_year(self, problem: dict, year: str) -> bool:
        ci = problem.get("check_info") or {}
        return ci.get("year") == year

    def _matches_exam_session(self, problem: dict, session: str) -> bool:
        ci = problem.get("check_info") or {}
        return ci.get("exam_session") == session

    def _matches_checked(self, problem: dict, is_checked: bool) -> bool:
        ci = problem.get("check_info") or {}
        all_ok = ci.get("problem_text_ok") and ci.get("solution_ok") and ci.get("figure_ok")
        return bool(all_ok) == is_checked

    # ── 単一問題生成 ──

    async def generate_problem(
        self,
        user_id: str,
        prompt: str,
        api: str | None = None,
        model: str | None = None,
        **kwargs,
    ) -> dict:
        client = self._get_client(api)
        model = model or get_settings().default_ai_model
        system = self._build_generation_system_prompt(kwargs)
        try:
            response = await client.generate_content(prompt, model=model, system=system)
            content = extract_problem_text(response)
            solution = extract_solution_text(response)
            python_code = extract_python_code(response)

            image_base64 = None
            if python_code:
                code = remove_import_statements(python_code)
                geo_result = await self.geometry_service.generate_custom_geometry(code, content)
                if geo_result.success:
                    image_base64 = geo_result.image_base64

            problem_data = {
                "user_id": user_id,
                "subject": kwargs.get("subject", "math"),
                "prompt": prompt,
                "content": content or response,
                "solution": solution,
                "image_base64": image_base64,
                "conversation_history": [
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": response},
                ],
            }
            saved = await self.create_problem(user_id, problem_data)
            await self._increment_generation_count(user_id)
            return saved
        except Exception as e:
            logger.exception("generate_problem failed")
            return {"error": str(e)}

    # ── 5段階問題生成 (SSE) ──

    async def generate_five_stage_sse(
        self,
        user_id: str,
        prompt: str,
        api: str | None = None,
        model: str | None = None,
        **kwargs,
    ) -> AsyncGenerator[dict, None]:
        client = self._get_client(api)
        model = model or get_settings().default_ai_model

        samples = load_sample_problems()
        sample_text = "\n\n---\n\n".join(s["content"] for s in samples[:3])

        variables = {
            "SAMPLE_PROBLEMS": sample_text,
            "USER_PROMPT": prompt,
            "UNITS": ", ".join(kwargs.get("units", [])),
            "EXCLUDED_UNITS": ", ".join(kwargs.get("excluded_units", [])),
        }
        initial_prompt = load_prompt("five_stage_initial.txt", variables)
        trigger = load_prompt("stage_trigger.txt")

        history = []
        full_content = ""
        image_base64 = None

        for stage in range(1, 6):
            yield {"event": "stage", "data": {"stage": stage, "total": 5, "message": self._stage_message(stage)}}

            if stage == 1:
                msg = initial_prompt if initial_prompt else prompt
            else:
                msg = trigger

            history.append({"role": "user", "content": msg})
            try:
                response = await client.generate_with_history(history, model=model)
            except Exception as e:
                yield {"event": "error", "data": {"stage": stage, "error": str(e)}}
                return

            history.append({"role": "assistant", "content": response})
            full_content += f"\n\n--- ステージ{stage} ---\n{response}"

            # ステージ3: 図形描画
            if stage == 3:
                code = extract_python_code(response)
                if code:
                    code = remove_import_statements(code)
                    geo = await self.geometry_service.generate_custom_geometry(code, "")
                    if geo.success:
                        image_base64 = geo.image_base64
                        yield {"event": "figure", "data": {"image_base64": image_base64}}

            yield {"event": "stage_complete", "data": {"stage": stage, "content": response[:500]}}

        # 保存
        problem_text = extract_problem_text(full_content)
        solution = extract_solution_text(full_content)
        saved = await self.create_problem(user_id, {
            "subject": kwargs.get("subject", "math"),
            "prompt": prompt,
            "content": problem_text or full_content,
            "solution": solution,
            "image_base64": image_base64,
            "conversation_history": history,
        })
        await self._increment_generation_count(user_id)
        yield {"event": "complete", "data": saved}

    # ── 3問題生成 (SSE) ──

    async def generate_three_problems_sse(
        self,
        user_id: str,
        problem_files: list[str] | None = None,
        solution_files: list[str] | None = None,
        excluded_units: list[str] | None = None,
        api: str | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        client = self._get_client(api)
        model = model or get_settings().default_ai_model

        # PDFファイルからテキスト抽出（Geminiを使用）
        extracted_text = ""
        if problem_files:
            google_client = self.clients.get("gemini")
            if google_client and hasattr(google_client, "generate_with_pdf"):
                for f in problem_files:
                    try:
                        result = await google_client.generate_with_pdf(
                            "この数学の問題を正確にテキストとして書き起こしてください。", f, model=model,
                        )
                        extracted_text += result + "\n\n"
                    except Exception as e:
                        logger.warning(f"PDF extraction failed: {e}")

        samples = load_sample_problems()
        sample_text = "\n\n---\n\n".join(s["content"] for s in samples[:3])

        variables = {
            "SAMPLE_PROBLEMS": sample_text,
            "ORIGINAL_PROBLEM": extracted_text or "（問題テキスト未提供）",
            "EXCLUDED_UNITS": ", ".join(excluded_units or []),
        }
        initial_prompt = load_prompt("three_problem_generation.txt", variables)

        patterns = ["A", "B", "C"]
        results: dict[str, dict] = {}

        for pi, pattern in enumerate(patterns):
            history: list[dict] = []
            pattern_content = ""
            pattern_image = None

            for stage in range(1, 6):
                global_stage = pi * 5 + stage
                yield {
                    "event": "stage",
                    "data": {
                        "stage": global_stage,
                        "total": 15,
                        "pattern": pattern,
                        "pattern_stage": stage,
                        "message": f"パターン{pattern} - {self._stage_message(stage)}",
                    },
                }

                if stage == 1 and pi == 0:
                    msg = initial_prompt
                elif stage == 1:
                    msg = f"パターン{pattern}の生成を開始してください。"
                else:
                    msg = load_prompt("stage_trigger.txt")

                history.append({"role": "user", "content": msg})
                try:
                    response = await client.generate_with_history(history, model=model)
                except Exception as e:
                    yield {"event": "error", "data": {"stage": global_stage, "pattern": pattern, "error": str(e)}}
                    break

                history.append({"role": "assistant", "content": response})
                pattern_content += f"\n\n--- Stage {stage} ---\n{response}"

                if stage == 3:
                    code = extract_python_code(response)
                    if code:
                        code = remove_import_statements(code)
                        geo = await self.geometry_service.generate_custom_geometry(code, "")
                        if geo.success:
                            pattern_image = geo.image_base64

                yield {"event": "stage_complete", "data": {"stage": global_stage, "pattern": pattern, "pattern_stage": stage}}

            results[pattern] = {
                "content": extract_problem_text(pattern_content) or pattern_content,
                "solution": extract_solution_text(pattern_content),
                "image_base64": pattern_image,
            }

        # 保存
        saved_problems = []
        for pattern, data in results.items():
            saved = await self.create_problem(user_id, {
                "subject": "math",
                "prompt": f"3問題生成 パターン{pattern}",
                "content": data["content"],
                "solution": data["solution"],
                "image_base64": data["image_base64"],
            })
            saved_problems.append(saved)

        await self._increment_generation_count(user_id)
        yield {"event": "complete", "data": {"problems": saved_problems}}

    # ── 図形再生成 ──

    async def regenerate_geometry(
        self,
        problem_id: int,
        user_id: str,
        api: str | None = None,
        model: str | None = None,
    ) -> dict:
        problem = await self.get_problem(problem_id, user_id)
        if not problem:
            return {"error": "問題が見つかりません"}

        client = self._get_client(api)
        model = model or get_settings().default_ai_model

        variables = {"PROBLEM_TEXT": problem.get("content", "")}
        prompt_text = load_prompt("geometry_regeneration.txt", variables)

        history = problem.get("conversation_history") or []
        history.append({"role": "user", "content": prompt_text})

        try:
            response = await client.generate_with_history(history, model=model)
            code = extract_python_code(response)
            if code:
                code = remove_import_statements(code)
                geo = await self.geometry_service.generate_custom_geometry(code, "")
                if geo.success:
                    history.append({"role": "assistant", "content": response})
                    await self.update_problem(problem_id, user_id, {
                        "image_base64": geo.image_base64,
                        "conversation_history": history,
                    })
                    await self._increment_figure_regen_count(user_id)
                    return {"success": True, "image_base64": geo.image_base64}
            return {"success": False, "error": "図形コードを抽出できませんでした"}
        except Exception as e:
            logger.exception("regenerate_geometry failed")
            return {"success": False, "error": str(e)}

    # ── ユーザーカウント管理 ──

    async def _increment_generation_count(self, user_id: str):
        try:
            result = self.db.table("users").select("problem_generation_count").eq("id", user_id).single().execute()
            if result.data:
                count = (result.data.get("problem_generation_count") or 0) + 1
                self.db.table("users").update({"problem_generation_count": count}).eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to increment generation count: {e}")

    async def _increment_figure_regen_count(self, user_id: str):
        try:
            result = self.db.table("users").select("figure_regeneration_count").eq("id", user_id).single().execute()
            if result.data:
                count = (result.data.get("figure_regeneration_count") or 0) + 1
                self.db.table("users").update({"figure_regeneration_count": count}).eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to increment figure regen count: {e}")

    async def increment_preview_count(self, user_id: str):
        try:
            result = self.db.table("users").select("preview_count").eq("id", user_id).single().execute()
            if result.data:
                count = (result.data.get("preview_count") or 0) + 1
                self.db.table("users").update({"preview_count": count}).eq("id", user_id).execute()
        except Exception as e:
            logger.warning(f"Failed to increment preview count: {e}")

    # ── ヘルパー ──

    @staticmethod
    def _stage_message(stage: int) -> str:
        return {
            1: "問題の骨格を設計中...",
            2: "パラメータ設定・動的検証中...",
            3: "図形を描画中...",
            4: "完全な問題文を生成中...",
            5: "解答・解説を作成中...",
        }.get(stage, f"ステージ{stage}処理中...")

    @staticmethod
    def _build_generation_system_prompt(kwargs: dict) -> str:
        parts = ["あなたは数学教育の専門家です。指定された条件に基づいて数学の問題を生成してください。"]
        if kwargs.get("difficulty"):
            parts.append(f"難易度: {kwargs['difficulty']}")
        if kwargs.get("units"):
            parts.append(f"単元: {', '.join(kwargs['units'])}")
        if kwargs.get("excluded_units"):
            parts.append(f"使用禁止単元: {', '.join(kwargs['excluded_units'])}")
        return "\n".join(parts)
