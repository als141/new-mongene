from pydantic import BaseModel
from typing import Optional, Any


class ProblemAnalysisRequest(BaseModel):
    problem_text: str
    unit_parameters: dict[str, Any] = {}
    subject: str = "math"


class ProblemAnalysisResponse(BaseModel):
    success: bool
    needs_geometry: bool
    detected_shapes: list[str]
    suggested_parameters: dict[str, dict[str, Any]]
    error: Optional[str] = None
