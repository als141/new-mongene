from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class OpinionProfileV2(BaseModel):
    text_length_min: Optional[int] = None
    text_length_max: Optional[int] = None
    sub_problem_count_min: Optional[int] = None
    sub_problem_count_max: Optional[int] = None
    given_values_count_min: Optional[int] = None
    given_values_count_max: Optional[int] = None
    solid_composition: Optional[str] = None
    answer_format: Optional[list[str]] = None
    answer_unit: Optional[str] = None
    auxiliary_points: Optional[bool] = None
    setup_units: Optional[list[str]] = None
    solution_units: Optional[list[str]] = None
    vertices_count_min: Optional[int] = None
    vertices_count_max: Optional[int] = None
    moving_point: Optional[bool] = None
    figure_values_count_min: Optional[int] = None
    figure_values_count_max: Optional[int] = None
    solution_steps_min: Optional[int] = None
    solution_steps_max: Optional[int] = None
    logical_branching: Optional[bool] = None
    theorem_count_min: Optional[int] = None
    theorem_count_max: Optional[int] = None
    multi_unit_integration: Optional[bool] = None
    irrelevant_info: Optional[bool] = None


class CheckInfo(BaseModel):
    problem_text_ok: bool = False
    solution_ok: bool = False
    figure_ok: bool = False
    units: Optional[list[str]] = None
    year: Optional[str] = None
    exam_session: Optional[str] = None
    tags: Optional[list[str]] = None


class Problem(BaseModel):
    id: Optional[int] = None
    user_id: str
    subject: str = "math"
    prompt: Optional[str] = None
    content: Optional[str] = None
    solution: Optional[str] = None
    image_base64: Optional[str] = None
    conversation_history: Optional[list[dict[str, Any]]] = None
    check_info: Optional[CheckInfo] = None
    opinion_profile: Optional[dict[str, Any]] = None
    opinion_profile_v2: Optional[OpinionProfileV2] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ProblemGenerateRequest(BaseModel):
    prompt: str = ""
    subject: str = "math"
    units: Optional[list[str]] = None
    excluded_units: Optional[list[str]] = None
    difficulty: Optional[str] = None
    formula_count: Optional[str] = None
    calculation_complexity: Optional[str] = None
    number_complexity: Optional[str] = None
    text_length: Optional[str] = None
    opinion_profile_v2: Optional[OpinionProfileV2] = None
    preferred_api: Optional[str] = None
    preferred_model: Optional[str] = None


class ThreeProblemRequest(BaseModel):
    problem_files: Optional[list[str]] = None  # base64 encoded files
    solution_files: Optional[list[str]] = None
    excluded_units: Optional[list[str]] = None
    preferred_api: Optional[str] = None
    preferred_model: Optional[str] = None


class FiveStageRequest(BaseModel):
    prompt: str = ""
    subject: str = "math"
    units: Optional[list[str]] = None
    excluded_units: Optional[list[str]] = None
    opinion_profile_v2: Optional[OpinionProfileV2] = None
    preferred_api: Optional[str] = None
    preferred_model: Optional[str] = None


class ProblemSearchRequest(BaseModel):
    keyword: Optional[str] = None
    subject: Optional[str] = None
    units: Optional[list[str]] = None
    year: Optional[str] = None
    exam_session: Optional[str] = None
    is_checked: Optional[bool] = None
    opinion_profile_v2: Optional[OpinionProfileV2] = None


class SearchFilter(BaseModel):
    id: Optional[int] = None
    user_id: str
    name: str
    keyword: Optional[str] = None
    subject: Optional[str] = None
    units: Optional[list[str]] = None
    year: Optional[str] = None
    exam_session: Optional[str] = None
    is_checked: Optional[bool] = None
    created_at: Optional[datetime] = None


class SourceListItem(BaseModel):
    id: Optional[int] = None
    user_id: str
    year: str
    exam_session: str
    created_at: Optional[datetime] = None
