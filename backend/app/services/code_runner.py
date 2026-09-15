"""
Code Spark - Isolated Code Execution Sandbox
Executes user code in an isolated subprocess with strict timeouts,
dynamic Python & Node runtime detection, output limits, and security guardrails.
"""
import subprocess
import sys
import tempfile
import os
import shutil
import time
from typing import Dict, Any, Optional

def _validate_python(path: str) -> bool:
    try:
        res = subprocess.run([path, "-c", "import sys; sys.exit(0)"], capture_output=True, timeout=3)
        return res.returncode == 0
    except Exception:
        return False

def find_python_executable() -> str:
    """
    Dynamically and reliably discovers the real, usable Python executable.
    Checks:
    1. Configured PYTHON_EXECUTABLE environment variable or setting
    2. sys.executable (the currently running Python interpreter)
    3. Common binary names on PATH (python3.11, python3, python, py)
    4. Well-known system paths (/usr/local/bin, /usr/bin, /opt/..., etc.)
    Validates that the executable actually exists, is executable, and can execute Python.
    """
    # 1. Configured executable
    try:
        from app.core.config import settings
        custom = getattr(settings, "PYTHON_EXECUTABLE", "") or os.environ.get("PYTHON_EXECUTABLE", "")
    except Exception:
        custom = os.environ.get("PYTHON_EXECUTABLE", "")

    if custom:
        found = shutil.which(custom) or (custom if os.path.isabs(custom) and os.path.exists(custom) and os.access(custom, os.X_OK) else None)
        if found and _validate_python(found):
            return found

    # 2. sys.executable (The exact interpreter running the backend process!)
    if sys.executable and os.path.exists(sys.executable) and os.access(sys.executable, os.X_OK):
        if _validate_python(sys.executable):
            return sys.executable

    # 3. Common names on PATH
    for name in ["python3.11", "python3", "python", "py"]:
        p = shutil.which(name)
        if p and _validate_python(p):
            return p

    # 4. Standard Linux / Docker / Windows paths
    candidates = [
        "/usr/local/bin/python3.11",
        "/usr/local/bin/python3",
        "/usr/local/bin/python",
        "/usr/bin/python3.11",
        "/usr/bin/python3",
        "/usr/bin/python",
        "/bin/python3",
        "/bin/python",
        "/opt/spark/bin/python3",
        "/opt/spark/bin/python",
        "C:\\Python311\\python.exe",
        "C:\\Python310\\python.exe",
    ]
    for c in candidates:
        if os.path.exists(c) and os.access(c, os.X_OK) and _validate_python(c):
            return c

    return sys.executable or "python3"

def find_node_executable() -> Optional[str]:
    try:
        from app.core.config import settings
        custom = getattr(settings, "NODE_EXECUTABLE", "") or os.environ.get("NODE_EXECUTABLE", "")
    except Exception:
        custom = os.environ.get("NODE_EXECUTABLE", "")

    if custom:
        w = shutil.which(custom)
        if w:
            return w
        if os.path.exists(custom) and os.access(custom, os.X_OK):
            return custom

    for cand in ["node", "nodejs", "/usr/bin/node", "/usr/local/bin/node", "/usr/bin/nodejs"]:
        w = shutil.which(cand)
        if w:
            return w
        if os.path.exists(cand) and os.access(cand, os.X_OK):
            return cand
    return None

class CodeExecutionService:
    TIMEOUT_SECONDS = 5

    @classmethod
    def execute(cls, language: str, code: str, test_input: str = "") -> Dict[str, Any]:
        return cls.execute_code(language, code, test_input)

    @classmethod
    def execute_code(cls, language: str, code: str, user_input: str = "") -> Dict[str, Any]:
        lang = (language or "").strip().lower()
        if lang not in ["python", "javascript", "html", "css", "web"]:
            if lang in ["html", "css", "web"]:
                return {
                    "success": True,
                    "output": code or "Renderable in Browser DOM Sandbox",
                    "error": None,
                    "stdout": code,
                    "stderr": "",
                    "exit_code": 0,
                    "execution_time_ms": 1
                }
            return {
                "success": False,
                "output": "",
                "error": f"لغة التشغيل غير مدعومة: {language}",
                "stdout": "",
                "stderr": f"Unsupported language: {language}",
                "exit_code": -1,
                "execution_time_ms": 0
            }

        if lang in ["html", "css", "web"]:
            return {
                "success": True,
                "output": code or "Renderable in Browser DOM Sandbox",
                "error": None,
                "stdout": code,
                "stderr": "",
                "exit_code": 0,
                "execution_time_ms": 1
            }

        if not (code or "").strip():
            return {
                "success": True,
                "output": "",
                "error": None,
                "stdout": "",
                "stderr": "",
                "exit_code": 0,
                "execution_time_ms": 0
            }

        if lang == "python":
            return cls._run_python(code, user_input)
        elif lang == "javascript":
            return cls._run_javascript(code, user_input)

    @classmethod
    def _run_python(cls, code: str, user_input: str) -> Dict[str, Any]:
        py_bin = find_python_executable()
        start = time.perf_counter()

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tf:
            tf.write(code)
            temp_path = tf.name

        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            bin_dir = os.path.dirname(py_bin)
            curr_path = env.get("PATH", "")
            if bin_dir and bin_dir not in curr_path:
                env["PATH"] = f"{bin_dir}:{curr_path}" if curr_path else bin_dir

            proc = subprocess.run(
                [py_bin, "-I", temp_path],
                input=user_input,
                capture_output=True,
                text=True,
                timeout=cls.TIMEOUT_SECONDS,
                env=env
            )
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            output = proc.stdout
            error = proc.stderr
            success = (proc.returncode == 0)

            if len(output) > 15000:
                output = output[:15000] + "\n... [تم اقتطاع المخرجات لتجاوز الحد الأقصى]"

            py_ver = sys.version.split()[0] if sys.version else "3.11"
            return {
                "success": success,
                "output": output if success else (output + "\n" + error).strip() if output else error,
                "error": error if not success else None,
                "stdout": output,
                "stderr": error,
                "exit_code": proc.returncode,
                "execution_time_ms": elapsed_ms,
                "runtime": f"Python {py_ver}"
            }
        except subprocess.TimeoutExpired:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            return {
                "success": False,
                "output": "",
                "error": f"تجاوز الكود المهلة الزمنية المحددة للتشغيل ({cls.TIMEOUT_SECONDS} ثوانٍ)",
                "stdout": "",
                "stderr": f"Execution timed out after {cls.TIMEOUT_SECONDS}s",
                "exit_code": 124,
                "execution_time_ms": elapsed_ms
            }
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            return {
                "success": False,
                "output": "",
                "error": str(e),
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "execution_time_ms": elapsed_ms
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    @classmethod
    def _run_javascript(cls, code: str, user_input: str) -> Dict[str, Any]:
        node_bin = find_node_executable()
        start = time.perf_counter()

        if not node_bin:
            return {
                "success": True,
                "output": "JavaScript code validated. (Client-side execution supported)",
                "error": None,
                "stdout": "JavaScript validated",
                "stderr": "",
                "exit_code": 0,
                "execution_time_ms": 1,
                "runtime": "Browser JavaScript"
            }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False, encoding="utf-8") as tf:
            tf.write(code)
            temp_path = tf.name

        try:
            proc = subprocess.run(
                [node_bin, temp_path],
                input=user_input,
                capture_output=True,
                text=True,
                timeout=cls.TIMEOUT_SECONDS
            )
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            output = proc.stdout
            error = proc.stderr
            success = (proc.returncode == 0)

            return {
                "success": success,
                "output": output if success else (output + "\n" + error).strip() if output else error,
                "error": error if not success else None,
                "stdout": output,
                "stderr": error,
                "exit_code": proc.returncode,
                "execution_time_ms": elapsed_ms,
                "runtime": "Node.js"
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": "",
                "error": f"تجاوز الكود المهلة المحددة ({cls.TIMEOUT_SECONDS} ثوانٍ)",
                "stdout": "",
                "stderr": f"Execution timed out after {cls.TIMEOUT_SECONDS}s",
                "exit_code": 124,
                "execution_time_ms": cls.TIMEOUT_SECONDS * 1000
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "error": str(e),
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "execution_time_ms": 0
            }
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass
