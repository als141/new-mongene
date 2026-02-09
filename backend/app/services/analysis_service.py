import re
from app.models.analysis import ProblemAnalysisResponse


class AnalysisService:
    GEOMETRY_KEYWORDS = [
        "図形", "三角形", "四角形", "正方形", "長方形", "円", "楕円",
        "グラフ", "座標", "面積", "体積", "周囲", "直線", "曲線",
        "立方体", "直方体", "円錐", "球", "角度", "辺", "頂点",
        "対角線", "半径", "直径", "高さ", "底面", "側面",
        "三角柱", "四角柱", "円柱", "角柱", "柱", "錐",
        "上面", "下面", "断面", "切断", "立体", "空間", "3D", "三次元",
        "ABCD-EFGH", "直方体ABCD", "頂点A", "点P", "点Q", "点R",
    ]

    async def analyze_problem(
        self, problem_text: str, unit_parameters: dict | None = None, subject: str = "math"
    ) -> ProblemAnalysisResponse:
        needs_geometry = any(kw in problem_text for kw in self.GEOMETRY_KEYWORDS)
        detected_shapes: list[str] = []
        suggested_params: dict = {}

        if needs_geometry:
            numbers = self._extract_numbers(problem_text)
            if any(w in problem_text for w in ["三角形", "triangle"]):
                detected_shapes.append("triangle")
                suggested_params["triangle"] = {
                    "width": numbers[0] if len(numbers) >= 1 else 5,
                    "height": numbers[1] if len(numbers) >= 2 else 4,
                }
            if any(w in problem_text for w in ["四角形", "正方形", "長方形", "rectangle", "square"]):
                if "正方形" in problem_text or "square" in problem_text:
                    detected_shapes.append("square")
                    suggested_params["square"] = {"side": numbers[0] if numbers else 5}
                else:
                    detected_shapes.append("rectangle")
                    suggested_params["rectangle"] = {
                        "width": numbers[0] if len(numbers) >= 1 else 6,
                        "height": numbers[1] if len(numbers) >= 2 else 4,
                    }
            if any(w in problem_text for w in ["円", "circle"]):
                detected_shapes.append("circle")
                suggested_params["circle"] = {"radius": numbers[0] if numbers else 3}
            if any(w in problem_text for w in ["直方体", "立方体", "cuboid", "cube", "ABCD-EFGH"]):
                detected_shapes.append("cuboid")
                if len(numbers) >= 3:
                    suggested_params["cuboid"] = {"width": numbers[0], "depth": numbers[1], "height": numbers[2]}
                elif len(numbers) >= 1:
                    suggested_params["cuboid"] = {"width": numbers[0], "depth": numbers[0], "height": numbers[0]}
                else:
                    suggested_params["cuboid"] = {"width": 6, "depth": 6, "height": 8}

        return ProblemAnalysisResponse(
            success=True,
            needs_geometry=needs_geometry,
            detected_shapes=detected_shapes,
            suggested_parameters=suggested_params,
        )

    @staticmethod
    def _extract_numbers(text: str) -> list[float]:
        return [float(n) for n in re.findall(r"\d+\.?\d*", text) if float(n) > 0]
