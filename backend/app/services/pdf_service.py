import base64
import io
import logging
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from app.models.pdf import PDFGenerateResponse

logger = logging.getLogger(__name__)


class PDFService:
    def __init__(self):
        self.japanese_font = "Helvetica"
        for font_path, font_name in [
            ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "NotoSansCJK"),
            ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans"),
        ]:
            try:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                self.japanese_font = font_name
                break
            except Exception:
                continue

    async def generate_pdf(
        self,
        problem_text: str,
        image_base64: str | None = None,
        solution_text: str | None = None,
    ) -> PDFGenerateResponse:
        try:
            buf = io.BytesIO()
            doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
            styles = getSampleStyleSheet()

            title_style = ParagraphStyle(
                "CustomTitle", parent=styles["Heading1"],
                fontName=self.japanese_font, fontSize=16, spaceAfter=30, alignment=TA_CENTER,
            )
            body_style = ParagraphStyle(
                "CustomBody", parent=styles["Normal"],
                fontName=self.japanese_font, fontSize=12, spaceAfter=12, alignment=TA_LEFT, leading=18,
            )

            story = [Paragraph("数学問題", title_style), Spacer(1, 20)]

            for para in problem_text.split("\n\n"):
                if para.strip():
                    story.append(Paragraph(para.replace("\n", "<br/>"), body_style))
                    story.append(Spacer(1, 12))

            if image_base64 and image_base64 != "mock_image_data":
                try:
                    img_data = base64.b64decode(image_base64)
                    pil_img = PILImage.open(io.BytesIO(img_data))
                    pil_img.thumbnail((400, 300), PILImage.Resampling.LANCZOS)
                    img_buf = io.BytesIO()
                    pil_img.save(img_buf, format="PNG")
                    img_buf.seek(0)
                    story.extend([Spacer(1, 20), Image(img_buf, width=pil_img.width, height=pil_img.height), Spacer(1, 20)])
                except Exception as e:
                    logger.warning(f"Image processing error: {e}")

            if solution_text and solution_text.strip():
                story.append(PageBreak())
                sol_title = ParagraphStyle(
                    "SolTitle", parent=styles["Heading1"],
                    fontName=self.japanese_font, fontSize=16, spaceAfter=30, alignment=TA_CENTER,
                )
                story.append(Paragraph("解答・解説", sol_title))
                story.append(Spacer(1, 20))
                for para in solution_text.split("\n\n"):
                    if para.strip():
                        story.append(Paragraph(para.replace("\n", "<br/>"), body_style))
                        story.append(Spacer(1, 12))

            doc.build(story)
            buf.seek(0)
            return PDFGenerateResponse(success=True, pdf_base64=base64.b64encode(buf.getvalue()).decode())
        except Exception as e:
            logger.exception("PDF generation failed")
            return PDFGenerateResponse(success=False, error=str(e))
