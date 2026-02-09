from fastapi import APIRouter, HTTPException
from app.models.pdf import PDFGenerateRequest
from app.services.pdf_service import PDFService

router = APIRouter()
_pdf_service = PDFService()


@router.post("/generate-pdf")
async def generate_pdf(req: PDFGenerateRequest):
    result = await _pdf_service.generate_pdf(req.problem_text, req.image_base64, req.solution_text)
    if not result.success:
        raise HTTPException(status_code=500, detail=result.error or "PDF生成に失敗しました")
    return result
