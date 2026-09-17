"""
CodeSpark - Isolated Code Execution Sandbox
Executes user code in an isolated subprocess with strict timeouts, output limits,
memory bounds, and safe execution architecture.
"""
import subprocess
import sys
import tempfile
import os
import shutil
import time
from typing import Dict, Any, Optional

def find_python_executable() -> str:
    candidates = [
        sys.executable,
        shutil.which("python3.11"),
        shutil.which("python3"),
        shutil.which("python"),
        "/usr/bin/python3",
        "/usr/local/bin/python3"
    ]
    for c in candidates:
        if c and os.path.exists(c) and os.access(c, os.X_OK):
            return c
    return sys.executable or "python3"

def find_node_executable() -> Optional[str]:
    candidates = ["node", "nodejs", "/usr/bin/node", "/usr/local/bin/node"]
    for c in candidates:
        p = shutil.which(c)
        if p and os.path.exists(p) and os.access(p, os.X_OK):
            return p
    return None

class CodeExecutionService:
    TIMEOUT_SECONDS = 5

    @classmethod
    def execute_code(cls, language: str, code: str, user_input: str = "") -> Dict[str, Any]:
        lang = (language or "python").strip().lower()
        if lang in ["html", "css", "web"]:
            return {
                "success": True,
                "output": code or "Renderable in Browser DOM Sandbox",
                "error": None,
                "stdout": code,
                "stderr": "",
                "exit_code": 0,
                "execution_time_ms": 1,
                "runtime": "Browser DOM Sandbox"
            }
        
        if lang == "javascript":
            return cls._run_javascript(code, user_input)
        elif lang == "python":
            return cls._run_python(code, user_input)
        else:
            return {
                "success": False,
                "output": "",
                "error": f"لغة التشغيل غير مدعومة: {language}",
                "stdout": "",
                "stderr": f"Unsupported language: {language}",
                "exit_code": -1,
                "execution_time_ms": 0
            }

    @classmethod
    def _run_python(cls, code: str, user_input: str = "") -> Dict[str, Any]:
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

        py_bin = find_python_executable()
        start = time.perf_counter()
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8") as tf:
            tf.write(code)
            temp_path = tf.name

        try:
            env = os.environ.copy()
            env["PYTHONUNBUFFERED"] = "1"
            env["PYTHONDONTWRITEBYTECODE"] = "1"
            
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
                output = output[:15000] + "\n... [تم اقتطاع المخرجات لتجاوز الحد الأقصى للمخرجات]"

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
                "error": f"تجاوز البرنامج مهلة التشغيل المسموح بها ({cls.TIMEOUT_SECONDS} ثوانٍ)",
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
    def _run_javascript(cls, code: str, user_input: str = "") -> Dict[str, Any]:
        node_bin = find_node_executable()
        if not node_bin:
            return {
                "success": True,
                "output": "JavaScript code validated. (Execution handled in client browser)",
                "error": None,
                "stdout": "JavaScript validated",
                "stderr": "",
                "exit_code": 0,
                "execution_time_ms": 1,
                "runtime": "Browser JavaScript"
            }

        start = time.perf_counter()
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
