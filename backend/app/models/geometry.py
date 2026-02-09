from pydantic import BaseModel
from typing import Optional, Any


class GeometryDrawRequest(BaseModel):
    shape_type: str
    parameters: dict[str, Any]
    labels: Optional[dict[str, str]] = None


class GeometryResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    shape_type: Optional[str] = None
    error: Optional[str] = None


class CustomGeometryRequest(BaseModel):
    python_code: str
    problem_text: str = ""


class CustomGeometryResponse(BaseModel):
    success: bool
    image_base64: Optional[str] = None
    problem_text: Optional[str] = None
    error: Optional[str] = None


class PythonExecuteRequest(BaseModel):
    python_code: str


class PythonExecuteResponse(BaseModel):
    success: bool
    output: str = ""
    error: Optional[str] = None
