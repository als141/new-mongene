import os
import re
import logging

logger = logging.getLogger(__name__)

PROMPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "prompts")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")


def load_prompt(filename: str, variables: dict[str, str] | None = None) -> str:
    """プロンプトファイルを読み込み、変数を置換する"""
    filepath = os.path.join(PROMPTS_DIR, filename)
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        if variables:
            for key, value in variables.items():
                content = content.replace(f"{{{key}}}", str(value))
        return content
    except FileNotFoundError:
        logger.error(f"Prompt file not found: {filepath}")
        return ""


def load_sample_problems() -> list[dict]:
    """サンプル問題ファイル（空間図形*.md）を読み込む"""
    samples = []
    for filename in sorted(os.listdir(DATA_DIR)):
        if filename.endswith(".md"):
            filepath = os.path.join(DATA_DIR, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                samples.append({"filename": filename, "content": content})
            except Exception as e:
                logger.error(f"Failed to load sample {filename}: {e}")
    return samples


def extract_python_code(text: str) -> str:
    """テキストからPythonコードブロックを抽出する"""
    pattern = r"```python\s*\n(.*?)```"
    matches = re.findall(pattern, text, re.DOTALL)
    return matches[0].strip() if matches else ""


def extract_problem_text(text: str) -> str:
    """問題文を抽出する"""
    patterns = [
        r"【問題文】\s*\n(.*?)(?=【|$)",
        r"## 問題文\s*\n(.*?)(?=##|$)",
        r"問題[：:]\s*\n?(.*?)(?=解答|解説|$)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
    return text.strip()


def extract_solution_text(text: str) -> str:
    """解答・解説を抽出する"""
    patterns = [
        r"【解答・解説】\s*\n(.*?)$",
        r"## 解答\s*\n(.*?)$",
        r"解答[：:]\s*\n?(.*?)$",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            return match.group(1).strip()
    return ""


def remove_import_statements(code: str) -> str:
    """Pythonコードからimport文を除去する（実行環境で提供済みのため）"""
    lines = code.split("\n")
    filtered = [
        line for line in lines
        if not line.strip().startswith("import ") and not line.strip().startswith("from ")
    ]
    return "\n".join(filtered)
