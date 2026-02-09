import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.font_manager as fm
import numpy as np
import base64
import io
import sys
import traceback
import logging
from io import StringIO
from mpl_toolkits.mplot3d import Axes3D
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from mpl_toolkits import mplot3d

from app.models.geometry import GeometryResponse, CustomGeometryResponse, PythonExecuteResponse

logger = logging.getLogger(__name__)


def _setup_japanese_font() -> str | None:
    japanese_fonts = [
        "Noto Sans CJK JP",
        "Noto Sans JP",
        "IPAexGothic",
        "IPAGothic",
        "TakaoPGothic",
        "VL Gothic",
        "DejaVu Sans",
    ]
    available_fonts = [f.name for f in fm.fontManager.ttflist]
    for font_name in japanese_fonts:
        if font_name in available_fonts:
            plt.rcParams["font.family"] = font_name
            return font_name
    plt.rcParams["axes.unicode_minus"] = False
    return None


_setup_japanese_font()


class GeometryService:
    async def generate_geometry(
        self, shape_type: str, parameters: dict, labels: dict | None = None
    ) -> GeometryResponse:
        try:
            if shape_type == "cuboid":
                return await self._draw_cuboid_3d(parameters, labels)

            fig, ax = plt.subplots(1, 1, figsize=(8, 6))
            draw_fn = {
                "triangle": self._draw_triangle,
                "rectangle": self._draw_rectangle,
                "circle": self._draw_circle,
                "square": self._draw_square,
            }.get(shape_type, self._draw_square)

            draw_fn(ax, parameters, labels)
            ax.set_aspect("equal")
            ax.grid(True, alpha=0.3)
            plt.tight_layout()

            image_base64 = self._fig_to_base64(fig)
            return GeometryResponse(success=True, image_base64=image_base64, shape_type=shape_type)
        except Exception as e:
            logger.exception("generate_geometry failed")
            plt.close("all")
            return GeometryResponse(success=False, error=str(e))

    async def generate_custom_geometry(
        self, python_code: str, problem_text: str = ""
    ) -> CustomGeometryResponse:
        try:
            _setup_japanese_font()
            safe_globals = self._build_safe_globals()
            exec(python_code, safe_globals)
            image_base64 = self._fig_to_base64()
            return CustomGeometryResponse(
                success=True, image_base64=image_base64, problem_text=problem_text
            )
        except Exception as e:
            logger.exception("generate_custom_geometry failed")
            plt.close("all")
            return CustomGeometryResponse(
                success=False, problem_text=problem_text, error=str(e)
            )

    async def execute_python_code(self, python_code: str) -> PythonExecuteResponse:
        try:
            old_stdout = sys.stdout
            sys.stdout = captured = StringIO()
            safe_globals = self._build_safe_globals()
            exec(python_code, safe_globals)
            sys.stdout = old_stdout
            output = captured.getvalue()
            return PythonExecuteResponse(success=True, output=output)
        except Exception as e:
            sys.stdout = sys.__stdout__
            logger.exception("execute_python_code failed")
            return PythonExecuteResponse(success=False, error=f"{type(e).__name__}: {e}")

    # ── drawing helpers ──

    def _draw_triangle(self, ax, params, labels):
        w = params.get("width", 5)
        h = params.get("height", 4)
        tri = patches.Polygon([(0, 0), (w, 0), (w / 2, h)], closed=True, fill=False, edgecolor="blue", linewidth=2)
        ax.add_patch(tri)
        if labels:
            ax.text(0, -0.3, "A", fontsize=12, ha="center")
            ax.text(w, -0.3, "B", fontsize=12, ha="center")
            ax.text(w / 2, h + 0.2, "C", fontsize=12, ha="center")
        ax.set_xlim(-1, w + 1)
        ax.set_ylim(-1, h + 1)

    def _draw_rectangle(self, ax, params, labels):
        w = params.get("width", 6)
        h = params.get("height", 4)
        rect = patches.Rectangle((0, 0), w, h, fill=False, edgecolor="blue", linewidth=2)
        ax.add_patch(rect)
        if labels:
            for pos, lbl in [((0, -0.3), "A"), ((w, -0.3), "B"), ((w, h + 0.2), "C"), ((0, h + 0.2), "D")]:
                ax.text(*pos, lbl, fontsize=12, ha="center")
        ax.set_xlim(-1, w + 1)
        ax.set_ylim(-1, h + 1)

    def _draw_square(self, ax, params, labels):
        s = params.get("side", 5)
        self._draw_rectangle(ax, {"width": s, "height": s}, labels)

    def _draw_circle(self, ax, params, labels):
        r = params.get("radius", 3)
        circ = patches.Circle((0, 0), r, fill=False, edgecolor="blue", linewidth=2)
        ax.add_patch(circ)
        ax.plot(0, 0, "ro", markersize=4)
        if labels:
            ax.text(0, -0.3, "O", fontsize=12, ha="center")
        ax.set_xlim(-r - 1, r + 1)
        ax.set_ylim(-r - 1, r + 1)

    async def _draw_cuboid_3d(self, params, labels) -> GeometryResponse:
        try:
            w = params.get("width", 6)
            d = params.get("depth", 6)
            h = params.get("height", 8)
            fig = plt.figure(figsize=(10, 8))
            ax = fig.add_subplot(111, projection="3d")
            verts = np.array([
                [0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0],
                [0, 0, h], [w, 0, h], [w, d, h], [0, d, h],
            ])
            faces_idx = [
                [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
                [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5],
            ]
            for fi in faces_idx:
                poly = [verts[i].tolist() for i in fi]
                ax.add_collection3d(Poly3DCollection([poly], alpha=0.1, facecolor="lightblue", edgecolor="blue", linewidth=1.5))
            edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
            for e in edges:
                pts = verts[e]
                ax.plot3D(*pts.T, "b-", linewidth=2)
            if labels:
                for v, l in zip(verts, "ABCDEFGH"):
                    ax.text(v[0], v[1], v[2], l, size=14, color="red", weight="bold")
            mx = max(w, d, h)
            ax.set_xlim([-1, mx + 1])
            ax.set_ylim([-1, mx + 1])
            ax.set_zlim([-1, mx + 1])
            ax.view_init(elev=20, azim=-75)
            ax.grid(True, alpha=0.3)
            plt.tight_layout()
            img = self._fig_to_base64(fig)
            return GeometryResponse(success=True, image_base64=img, shape_type="cuboid")
        except Exception as e:
            plt.close("all")
            return GeometryResponse(success=False, error=str(e))

    # ── utilities ──

    def _fig_to_base64(self, fig=None) -> str:
        buf = io.BytesIO()
        if fig:
            fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
            plt.close(fig)
        else:
            plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
            plt.close()
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode()

    def _build_safe_globals(self) -> dict:
        return {
            "plt": plt,
            "patches": patches,
            "np": np,
            "numpy": np,
            "Axes3D": Axes3D,
            "Poly3DCollection": Poly3DCollection,
            "matplotlib": matplotlib,
            "mplot3d": mplot3d,
            "io": io,
            "base64": base64,
            "Polygon": patches.Polygon,
            "__builtins__": {
                "__import__": __import__,
                "len": len, "range": range, "enumerate": enumerate, "zip": zip,
                "map": map, "filter": filter, "list": list, "dict": dict,
                "tuple": tuple, "set": set, "str": str, "int": int, "float": float,
                "bool": bool, "min": min, "max": max, "abs": abs, "round": round,
                "sum": sum, "print": print, "ord": ord, "chr": chr,
            },
        }
