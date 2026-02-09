from fastapi import APIRouter, HTTPException
from app.models.geometry import GeometryDrawRequest, CustomGeometryRequest, PythonExecuteRequest
from app.services.geometry_service import GeometryService

router = APIRouter()
_geo_service = GeometryService()


@router.post("/draw-geometry")
async def draw_geometry(req: GeometryDrawRequest):
    result = await _geo_service.generate_geometry(req.shape_type, req.parameters, req.labels)
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error or "図形生成に失敗しました")
    return result


@router.post("/draw-custom-geometry")
async def draw_custom_geometry(req: CustomGeometryRequest):
    result = await _geo_service.generate_custom_geometry(req.python_code, req.problem_text)
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error or "カスタム図形生成に失敗しました")
    return result


@router.post("/execute-python")
async def execute_python(req: PythonExecuteRequest):
    result = await _geo_service.execute_python_code(req.python_code)
    return result
