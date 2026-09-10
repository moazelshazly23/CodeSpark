import ast
import re
import io
import sys
import time
import json
import traceback
import datetime
from fastapi import APIRouter, HTTPException, Depends, status, Request
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import base64
import hashlib
import logging

from ..database import get_db, log_activity
from ..dependencies import (
    get_optional_user, get_current_student, check_student_subscription,
    get_active_student_or_admin, get_current_staff, get_current_admin
)
from ..models import CodeExecutionRequest, ExerciseSubmitRequest, CodeGenerationRequest

router = APIRouter(prefix="/api/code", tags=["Code Execution Sandbox"])

# Strict Blocklist for in-process educational sandboxing
FORBIDDEN_MODULES = {
    "os", "sys", "subprocess", "shutil", "socket", "http", "urllib", "requests",
    "pathlib", "importlib", "builtins", "__builtin__", "ctypes", "threading",
    "multiprocessing", "asyncio", "signal", "posix", "nt", "pty", "commands",
    "pickle", "shelve", "dbm", "sqlite3"
}

FORBIDDEN_FUNCTIONS = {
    "open", "eval", "exec", "compile", "globals", "locals", "vars", "dir",
    "getattr", "setattr", "delattr", "hasattr", "breakpoint", "memoryview",
    "__import__"
}

MAX_OUTPUT_CHARS = 50000
MAX_EXECUTION_STEPS = 100000


class SecurityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.errors = []

    def visit_Import(self, node):
        for alias in node.names:
            name = alias.name.split('.')[0]
            if name in FORBIDDEN_MODULES:
                self.errors.append(f"استيراد المكتبة '{name}' غير مسموح لأسباب أمنية داخل البيئة التعليمية.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            name = node.module.split('.')[0]
            if name in FORBIDDEN_MODULES:
                self.errors.append(f"استيراد الدوال من '{name}' غير مسموح لأسباب أمنية.")
        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_FUNCTIONS:
                self.errors.append(f"استدعاء الدالة '{node.func.id}()' محظور لأسباب أمنية.")
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr.startswith('__') and node.func.attr.endswith('__'):
                self.errors.append("محاولة الوصول إلى الخصائص الداخلية الخاصة (__dunder__) محظورة.")
        self.generic_visit(node)


class LoopLimiter(ast.NodeTransformer):
    """Injects execution step counter into loops and functions to stop infinite execution loops instantly."""
    def visit_While(self, node):
        self.generic_visit(node)
        check = ast.parse(
            f"global __step_count__\n__step_count__ += 1\nif __step_count__ > {MAX_EXECUTION_STEPS}:\n    raise TimeoutError('⏱️ استغرق تنفيذ البرنامج وقتًا أطول من الحد المسموح به. قد يكون هناك حلقة تكرار لا نهائية (Infinite Loop).')"
        ).body
        node.body = check + node.body
        return node

    def visit_For(self, node):
        self.generic_visit(node)
        check = ast.parse(
            f"global __step_count__\n__step_count__ += 1\nif __step_count__ > {MAX_EXECUTION_STEPS}:\n    raise TimeoutError('⏱️ تجاوز البرنامج الحد الأقصى المسموح به من الخطوات.')"
        ).body
        node.body = check + node.body
        return node

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        check = ast.parse(
            f"global __step_count__\n__step_count__ += 1\nif __step_count__ > {MAX_EXECUTION_STEPS}:\n    raise TimeoutError('⏱️ تجاوز البرنامج الحد الأقصى المسموح به من الاستدعاءات المتكررة (Recursion Limit).')"
        ).body
        node.body = check + node.body
        return node


def safe_run_python(code: str, mock_inputs: List[str] = None, timeout: int = 5) -> Dict[str, Any]:
    """
    Execute Python code in a safe in-memory sandboxed scope with AST validation,
    loop step injection, strict builtins whitelisting, and output capping.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        arabic_hint = get_arabic_syntax_explanation(e.msg or '', e.lineno)
        return {
            "success": False,
            "output": "",
            "error": f"خطأ نحوي (SyntaxError): في السطر {e.lineno}\n{e.msg}\n{arabic_hint}",
            "executionTimeMs": 0
        }

    visitor = SecurityVisitor()
    visitor.visit(tree)
    if visitor.errors:
        return {
            "success": False,
            "output": "",
            "error": "🔒 تنبيه أمني:\n" + "\n".join(visitor.errors),
            "executionTimeMs": 0
        }

    tree = LoopLimiter().visit(tree)
    ast.fix_missing_locations(tree)

    input_queue = list(mock_inputs or [])
    def custom_input(prompt=""):
        if prompt:
            print(prompt, end="")
        if input_queue:
            val = input_queue.pop(0)
            print(val)
            return str(val)
        return "85"

    safe_builtins = {
        "print": print,
        "input": custom_input,
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "len": len,
        "range": range,
        "enumerate": enumerate,
        "zip": zip,
        "sum": sum,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "map": map,
        "filter": filter,
        "any": any,
        "all": all,
        "isinstance": isinstance,
        "type": type,
        "chr": chr,
        "ord": ord,
        "hex": hex,
        "bin": bin,
        "pow": pow,
        "divmod": divmod,
        "True": True,
        "False": False,
        "None": None,
        "TimeoutError": TimeoutError
    }

    import math, random
    safe_globals = {
        "__builtins__": safe_builtins,
        "__step_count__": 0,
        "math": math,
        "random": random
    }

    stdout_capture = io.StringIO()
    start_time = time.time()
    old_stdout = sys.stdout

    try:
        sys.stdout = stdout_capture
        compiled = compile(tree, filename="<codespark_sandbox>", mode="exec")
        exec(compiled, safe_globals)
        sys.stdout = old_stdout

        elapsed = round((time.time() - start_time) * 1000, 2)
        raw_output = stdout_capture.getvalue()
        if len(raw_output) > MAX_OUTPUT_CHARS:
            raw_output = raw_output[:MAX_OUTPUT_CHARS] + "\n... [تم اقتطاع المخرجات لتجاوزها الحد المسموح به]"

        return {
            "success": True,
            "output": raw_output or "تم تنفيذ الكود بنجاح (بدون مخرجات مطبوعة).",
            "error": None,
            "executionTimeMs": elapsed
        }
    except TimeoutError as te:
        sys.stdout = old_stdout
        elapsed = round((time.time() - start_time) * 1000, 2)
        return {
            "success": False,
            "output": stdout_capture.getvalue(),
            "error": str(te),
            "executionTimeMs": elapsed
        }
    except Exception as e:
        sys.stdout = old_stdout
        elapsed = round((time.time() - start_time) * 1000, 2)
        
        err_msg = str(e)
        arabic_hint = ""
        if isinstance(e, NameError):
            arabic_hint = "\n💡 تلميح: تأكد من تعريف المتغير وكتابة اسمه بنفس الحروف بدقة."
        elif isinstance(e, TypeError):
            arabic_hint = "\n💡 تلميح: تأكد من توافق أنواع البيانات (مثلاً لا يمكن جمع نص مع عدد بدون دالة str أو int)."
        elif isinstance(e, IndexError):
            arabic_hint = "\n💡 تلميح: الفهرس المطلوب خارج حدود القائمة أو النص."
        elif isinstance(e, ZeroDivisionError):
            arabic_hint = "\n💡 تلميح: لا يمكن القسمة على الصفر في الرياضيات والبرمجة."

        return {
            "success": False,
            "output": stdout_capture.getvalue(),
            "error": f"{type(e).__name__}: {err_msg}{arabic_hint}",
            "executionTimeMs": elapsed
        }


@router.post("/run")
def execute_code(req: CodeExecutionRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Run code in isolated sandbox and return live output and execution time."""
    if current_user and current_user.get("role") not in ("admin", "SUPER_ADMIN", "ASSISTANT"):
        if not check_student_subscription(current_user):
            raise HTTPException(status_code=403, detail="انتهى اشتراكك، يرجى تجديد الاشتراك.")
    if len(req.code) > 10000:
        raise HTTPException(status_code=400, detail="حجم الكود البرمجي يتجاوز الحد المسموح به (10 كيلوبايت)")

    inputs = req.inputs
    if isinstance(inputs, str):
        inputs = [inputs]

    timeout_val = req.timeout or 5
    res = safe_run_python(req.code, inputs, timeout=timeout_val)
    return res


@router.post("/verify-exercise")
def verify_exercise(req: ExerciseSubmitRequest, student: dict = Depends(get_active_student_or_admin)):
    """
    Server-side verification of student's exercise code against unit test cases.
    Awards XP upon passing without exposing secret solutions to the client before submission.
    """
    student_id = student["id"]
    lesson_id = req.lesson_id
    code = req.code.strip()

    if not code:
        raise HTTPException(status_code=400, detail="يرجى كتابة كود بايثون قبل التحقق")

    if len(code) > 10000:
        raise HTTPException(status_code=400, detail="حجم الكود البرمجي يتجاوز الحد المسموح به")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM lessons WHERE id = ?", (lesson_id,))
        lesson = cursor.fetchone()
        if not lesson:
            raise HTTPException(status_code=404, detail="الدرس غير موجود")

        test_cases_json = lesson.get("exercise_test_cases")
        test_cases = []
        if test_cases_json:
            try:
                test_cases = json.loads(test_cases_json) if isinstance(test_cases_json, str) else test_cases_json
            except Exception:
                test_cases = []

        res = safe_run_python(code, timeout=5)
        if not res["success"]:
            return {
                "success": True,
                "passed": False,
                "output": res.get("output", ""),
                "error": res["error"],
                "message": "حدث خطأ أثناء تشغيل الكود. راجع رسالة الخطأ وحاول مرة أخرى."
            }

        actual_output = res.get("output", "").strip()

        passed = True
        test_results = []

        if test_cases and len(test_cases) > 0:
            for idx, tc in enumerate(test_cases):
                tc_inputs = tc.get("inputs", [])
                expected = str(tc.get("expected_output") or tc.get("expected") or "").strip()
                
                tc_res = safe_run_python(code, mock_inputs=tc_inputs, timeout=5)
                tc_out = tc_res.get("output", "").strip()
                
                is_tc_passed = (expected in tc_out) if expected else tc_res["success"]
                test_results.append({
                    "test_case": idx + 1,
                    "passed": is_tc_passed,
                    "actual_output": tc_out
                })
                if not is_tc_passed:
                    passed = False
        else:
            passed = len(actual_output) > 0 and "خطأ" not in actual_output

        xp_earned = 30 if passed else 0

        if passed:
            cursor.execute("""
            UPDATE student_profiles
            SET xp = xp + ?, last_activity = ?, updated_at = ?
            WHERE user_id = ?
            """, (xp_earned, now, now, student_id))

        return {
            "success": True,
            "passed": passed,
            "output": actual_output,
            "xp_earned": xp_earned,
            "test_results": test_results,
            "message": "✅ إجابة صحيحة وممتازة! تم التحقق من المنطق البرمجي بنجاح." if passed else "⚠️ المخرجات لم تطابق المطلوب تمامًا. راجع رأس السؤال والمطلوب طباعته بدقة."
        }


@router.post("/generate")
def generate_code_snippet(req: CodeGenerationRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Educational Python Code Generator for Assistants and Teachers."""
    topic = (req.topic or "variables").lower()
    level = req.level or "beginner"
    g_type = req.type or "exercise"

    templates = {
        "variables": {
            "title": "برنامج حساب محيط ومساحة المستطيل",
            "code": "length = float(input('أدخل الطول: '))\nwidth = float(input('أدخل العرض: '))\n\narea = length * width\nperimeter = 2 * (length + width)\n\nprint(f'المساحة = {area}')\nprint(f'المحيط = {perimeter}')",
            "starter_code": "length = float(input())\nwidth = float(input())\n# احسب المساحة والمحيط هنا\n",
            "test_cases": [{"inputs": ["5", "3"], "expected_output": "المساحة = 15.0"}, {"inputs": ["10", "4"], "expected_output": "المساحة = 40.0"}],
            "explanation": "برنامج يوضح تعريف المتغيرات واستقبال المدخلات وتحويلها إلى أعداد عشرية float ثم إجراء العمليات الحسابية."
        },
        "conditions": {
            "title": "برنامج التحقق من تقدير الطالب",
            "code": "score = float(input('أدخل درجة الطالب من 100: '))\n\nif score >= 85:\n    grade = 'ممتاز'\nelif score >= 75:\n    grade = 'جيد جدًا'\nelif score >= 65:\n    grade = 'جيد'\nelif score >= 50:\n    grade = 'مقبول'\nelse:\n    grade = 'راسب'\n\nprint(f'التقدير: {grade}')",
            "starter_code": "score = float(input())\n# أكمل جمل if/elif/else هنا\n",
            "test_cases": [{"inputs": ["90"], "expected_output": "التقدير: ممتاز"}, {"inputs": ["45"], "expected_output": "التقدير: راسب"}],
            "explanation": "يوضح استخدام الجمل الشرطية المتعددة if / elif / else للتحقق من الشروط بالترتيب المنطقي الصحيح."
        },
        "loops": {
            "title": "برنامج حساب مجموع الأعداد الزوجية",
            "code": "n = int(input('أدخل العدد الأخير N: '))\ntotal_sum = 0\n\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        total_sum += i\n\nprint(f'مجموع الأعداد الزوجية = {total_sum}')",
            "starter_code": "n = int(input())\ntotal_sum = 0\n# استخدم for loop مع range\n",
            "test_cases": [{"inputs": ["10"], "expected_output": "مجموع الأعداد الزوجية = 30"}, {"inputs": ["6"], "expected_output": "مجموع الأعداد الزوجية = 12"}],
            "explanation": "تطبيق عملي على حلقات التكرار for loop مع دالة range() واختبار باقي القسمة %."
        },
        "lists": {
            "title": "برنامج تحليل درجات الطلاب في قائمة",
            "code": "scores = [88, 95, 70, 62, 99, 81, 75]\n\nmax_score = max(scores)\nmin_score = min(scores)\navg_score = sum(scores) / len(scores)\n\nprint(f'أعلى درجة: {max_score}')\nprint(f'أدنى درجة: {min_score}')\nprint(f'متوسط الدرجات: {avg_score:.2f}')",
            "starter_code": "scores = [88, 95, 70, 62, 99, 81, 75]\n# احسب أعلى وأدنى درجة والمتوسط\n",
            "test_cases": [{"inputs": [], "expected_output": "أعلى درجة: 99"}],
            "explanation": "يوضح التعامل مع القوائم Lists والدوال المدمجة الجاهزة max() و min() و sum() و len()."
        },
        "functions": {
            "title": "دالة فحص العدد الأولي (Prime Number)",
            "code": "def is_prime(number):\n    if number <= 1:\n        return False\n    for i in range(2, int(number ** 0.5) + 1):\n        if number % i == 0:\n            return False\n    return True\n\nnum = int(input('أدخل عددًا صحيحًا: '))\nif is_prime(num):\n    print(f'{num} هو عدد أولي')\nelse:\n    print(f'{num} ليس عددًا أوليًا')",
            "starter_code": "def is_prime(number):\n    # أكمل دالة فحص العدد الأولي\n    pass\n",
            "test_cases": [{"inputs": ["7"], "expected_output": "7 هو عدد أولي"}, {"inputs": ["10"], "expected_output": "10 ليس عددًا أوليًا"}],
            "explanation": "بناء الدوال المعرفة من المستخدم def واستخدام الكلمة المحجوزة return لإرجاع قيمة منطقية boolean."
        }
    }

    selected_key = "variables"
    for k in templates.keys():
        if k in topic or topic in k:
            selected_key = k
            break

    t_data = templates[selected_key]

    if current_user:
        log_activity(
            user_id=current_user.get("id"),
            user_name=current_user.get("name"),
            user_role=current_user.get("role"),
            action="GENERATE_CODE",
            target_type="CODE_GENERATOR",
            target_name=t_data["title"],
            details={"topic": topic, "level": level, "type": g_type}
        )

    return {
        "success": True,
        "topic": topic,
        "level": level,
        "type": g_type,
        "generated": t_data
    }


# ==================== EDUCATIONAL ASSISTANT & ERROR EXPLANATION ====================

def get_arabic_syntax_explanation(err_msg: str, line_no: Optional[int] = None) -> str:
    """Transform technical Python syntax errors into actionable, encouraging Arabic educational guidance."""
    msg = str(err_msg).lower()
    line_ref = f"في السطر {line_no}" if line_no else "في الكود"

    if "expected ':'" in msg or "invalid syntax" in msg and ":" in msg:
        return f"💡 يبدو أنك نسيت وضع النقطتين الرأسيتين (:) في نهاية السطر {line_ref}. تذكر أن جمل if و for و def تنتهي دائمًا بـ :"
    elif "was never closed" in msg or "unexpected EOF while parsing" in msg or "unmatched" in msg:
        if "'" in msg or '"' in msg or "string" in msg:
            return f"💡 يبدو أن هناك علامة تنصيص غير مغلقة {line_ref}. تأكد من إغلاق كل نص بنفس نوع علامة التنصيص."
        elif "(" in msg or ")" in msg:
            return f"💡 يبدو أن هناك قوسًا دائريًا ( ) مفتوحًا لم يتم إغلاقه {line_ref}."
        elif "[" in msg or "]" in msg:
            return f"💡 يبدو أن هناك قوس مصفوفة [ ] غير مغلق {line_ref}."
        elif "{" in msg or "}" in msg:
            return f"💡 يبدو أن هناك قوس معقوص {{ }} غير مغلق {line_ref}."
        return f"💡 يبدو أن هناك قوسًا أو علامة تنصيص غير مغلقة {line_ref}. راجع الأقواس المفتوحة في الكود."
    elif "indent" in msg or "unexpected indent" in msg or "unindent" in msg:
        return f"💡 خطأ في المسافات البادئة (Indentation) {line_ref}. في بايثون، الأسطر داخل الدوال والحلقات والشروط يجب أن تبدأ بمسافة بادئة موحدة (4 مسافات)."
    elif "cannot assign to" in msg or "assignment" in msg:
        return f"💡 لا يمكن إسناد قيمة لهذا العنصر {line_ref}. تأكد من وضع اسم المتغير على اليسار وقيمته على اليمين (مثال: x = 10)."
    elif "invalid syntax" in msg:
        return f"💡 هناك خطأ في صياغة الكود {line_ref}. راجع الكلمات المفتاحية والأقواس وعلامات الترقيم."
    return f"💡 تحقق من صياغة السطر {line_ref} ومطابقته لقواعد لغة بايثون."


@router.post("/explain-error")
def explain_code_error(data: Dict[str, Any], current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Educational Assistant: Explain runtime or syntax error in encouraging Arabic without giving away the full solution.
    """
    error_raw = str(data.get("error") or data.get("error_message") or "").strip()
    code = str(data.get("code") or "")

    if not error_raw:
        return {
            "success": True,
            "meaning": "لم يتم العثور على رسالة خطأ لتحليلها.",
            "cause": "الكود تم تنفيذه دون تسجيل أخطاء واضحة.",
            "guidance": "يمكنك تجربة تشغيل الكود بمُدخلات مختلفة لاختبار نتائجه.",
            "concept_ref": "مراجعة عامة"
        }

    err_lower = error_raw.lower()
    
    # 1. SyntaxError
    if "syntaxerror" in err_lower or "invalid syntax" in err_lower or "expected ':'" in err_lower:
        if "expected ':'" in err_lower or ":" in err_lower:
            meaning = "نسيت وضع النقطتين الرأسيتين (:) في نهاية جملة التحكم (SyntaxError)."
            cause = "في بايثون، يجب وضع نقطتين رأسيتين (:) في نهاية أسطر if و elif و else و for و while و def."
            guidance = "أضف النقطتين الرأسيتين (:) في نهاية السطر المذكور ثم أعد التشغيل."
            concept = "النقطتان الرأسيتان (Colons) والكتل البرمجية"
        else:
            meaning = "خطأ نحوي في قواعد كتابة لغة بايثون (SyntaxError)."
            cause = "المفسر لم يستطع فهم تركيب الجملة البرمجية، غالبًا بسبب نسيان قوس، نقطتين رأسيتين (:)، أو علامة تنصيص."
            guidance = "راجع الأسطر المذكورة في الخطأ وتأكد من إغلاق الأقواس وعلامات التنصيص."
            concept = "قواعد الصياغة الأساسية (Syntax)"

    # 2. NameError
    elif "nameerror" in err_lower or "is not defined" in err_lower:
        match = re.search(r"name '([^']+)' is not defined", error_raw)
        var_name = match.group(1) if match else "المتغير"
        meaning = f"خطأ في استخدام اسم غير معرّف (NameError: {var_name})."
        cause = f"محاولة استخدام المتغير أو الدالة '{var_name}' قبل تعريفه، أو وجود خطأ إملائي في كتابة اسمه (مثل الحروف الكبيرة والصغيرة)."
        guidance = f"1. تأكد من أنك قمت بتعريف المتغير '{var_name} = ...' في سطر سابق قبل استخدامه.\n2. تأكد من مطابقة الحروف بدقة (لغة بايثون حساسة لحالة الأحرف Case-Sensitive)."
        concept = "تعريف واستخدام المتغيرات (Variables)"

    # 3. TypeError
    elif "typeerror" in err_lower:
        meaning = "خطأ في نوع البيانات (TypeError)."
        cause = "إجراء عملية حسابية أو دمج بين أنواع بيانات غير متوافقة معًا (مثل جمع نص مع عدد بدون تحويل)."
        guidance = "1. إذا كنت تستقبل مدخلات بـ input()، تذكر أنها تعود بنص 'str'، استخدم int() أو float() لتحويلها لعدد قبل الحساب.\n2. للدمج مع نصوص، استخدم f-strings مثل: `f'النتيجة = {val}'`."
        concept = "أنواع البيانات والتحويل بينها (Data Types & Casting)"

    # 4. ZeroDivisionError
    elif "zerodivisionerror" in err_lower or "division by zero" in err_lower:
        meaning = "خطأ القسمة على صفر (ZeroDivisionError)."
        cause = "محاولة قسمة عدد على صفر في إحدى العمليات الحسابية."
        guidance = "راجع المتغير الموجود في المقام وتأكد من أن قيمته لا تصبح 0 أثناء تنفيذ البرنامج، أو استخدم جملة if للتأكد من أن المقام > 0 قبل القسمة."
        concept = "العمليات الحسابية والشروط (Arithmetic & Conditions)"

    # 5. IndexError
    elif "indexerror" in err_lower or "out of range" in err_lower:
        meaning = "خطأ تجاوز حدود القائمة أو النص (IndexError)."
        cause = "محاولة الوصول لعنصر في قائمة أو نص بفهرس (Index) غير موجود أو أكبر من طول القائمة."
        guidance = "تذكر أن الترقيم في بايثون يبدأ من 0، وآخر عنصر يكون عند len(list) - 1. استخدم len() لمعرفة عدد العناصر المتاحة."
        concept = "القوائم والفهرسة (Lists & Indexing)"

    # 6. IndentationError
    elif "indentationerror" in err_lower or "indent" in err_lower:
        meaning = "خطأ في المسافات البادئة (IndentationError)."
        cause = "المسافات في بداية الأسطر البرمجية غير متناسقة أو مفقودة داخل كتلة برمجية (Block)."
        guidance = "اضغط Tab أو ضع 4 مسافات في بداية الأسطر التي تقع داخل دالة أو حلقة تكرار أو جملة شرطية."
        concept = "المسافات البادئة وهيكل الكود (Indentation)"

    # 7. TimeoutError / Infinite Loop
    elif "timeout" in err_lower or "infinite loop" in err_lower or "استغرق" in err_lower:
        meaning = "تجاوز الوقت المسموح / حلقة تكرار لا نهائية (Infinite Loop)."
        cause = "برنامجك دخل في حلقة تكرار لا تتوقف لأن شرط التوقف لا يتحقق أبدًا."
        guidance = "إذا كنت تستخدم while loop، تأكد من وجود سطر يزيد أو يعدل متغير الشرط (مثل: `i += 1`) داخل الحلقة ليصبح الشرط خطأ في النهاية ويتوقف البرنامج."
        concept = "حلقات التكرار وشروط التوقف (While Loops)"

    else:
        meaning = f"تنبيه برمجي: {error_raw.splitlines()[-1] if error_raw else 'خطأ أثناء التنفيذ'}"
        cause = "حدث خطأ غير متوقع أثناء معالجة الكود من قِبل مفسر بايثون."
        guidance = "راجع السطور الأخيرة من الكود، وتأكد من طباعة القيم المرحلية لاكتشاف موضع الخطأ."
        concept = "التنقيح والتشخيص (Debugging)"

    return {
        "success": True,
        "meaning": meaning,
        "cause": cause,
        "guidance": guidance,
        "concept_ref": concept
    }


@router.post("/hint")
def get_progressive_hint(data: Dict[str, Any], student: dict = Depends(get_current_student)):
    """
    Educational Assistant: Provide 3-tier progressive hints without giving away the full solution.
    Level 1: General concept / direction
    Level 2: Structural construct / keywords
    Level 3: Code pattern / syntax template
    """
    lesson_id = data.get("lesson_id") or ""
    level = int(data.get("level") or 1)
    code = data.get("code") or ""
    topic = data.get("topic") or "general"

    # Default progressive hints catalogue
    hints_catalog = {
        "loop": [
            "💡 فكر في نوع حلقة التكرار المناسبة: إذا كنت تعرف عدد مرات التكرار مسبقًا، فالحلقة for هي الأنسب.",
            "💡 يمكنك استخدام الكلمة المفتاحية `for` مع دالة توليد الأعداد `range(بداية, نهاية)`.",
            "💡 تذكر أن دالة `range(1, 11)` تولد الأرقام من 1 إلى 10 (الرقم الأخير غير مشمول). اكتب: `for i in range(1, 11):`"
        ],
        "condition": [
            "💡 فكر في التحقق من الشرط أولاً: نستخدم `if` لاختبار الشروط المنطقية.",
            "💡 للمقارنة بين القيم نستخدم علامات مثل `>` أو `<` أو `==`. وإذا كان هناك خيار بديل نستخدم `else:`.",
            "💡 مثال للصياغة: `if score >= 50:` ثم في السطر التالي مع مسافة بادئة ضع أمر الطباعة."
        ],
        "variables": [
            "💡 في بايثون نعرف المتغير مباشرة بكتابة اسمه ثم علامة = ثم القيمة (مثل: `x = 10`).",
            "💡 لاستقبال قيمة من المستخدم استخدم دالة `input()`. وإذا كنت تريد إجراء عمليات حسابية، حولها لعدد: `int(input())`.",
            "💡 لطباعة متغير بجانب نص توضيحي، استخدم f-string: `print(f'النتيجة = {result}')`."
        ],
        "list": [
            "💡 القوائم في بايثون تُعرّف باستخدام الأقواس المربعة `my_list = [1, 2, 3]`.",
            "💡 للوصول لأول عنصر نستخدم `my_list[0]`. ولمعرفة عدد العناصر استخدم `len(my_list)`.",
            "💡 يمكنك استخدام الدوال المدمجة مثل `sum()` لحساب المجموع، و `max()` لأعلى قيمة، و `min()` لأدنى قيمة."
        ],
        "function": [
            "💡 لبناء دالة مخصصة في بايثون، نبدأ بالكلمة المفتاحية `def` متبوعة باسم الدالة وقوسين ونقطتين `def my_func():`.",
            "💡 لإرجاع قيمة من الدالة إلى البرنامج الرئيسي، استخدم الكلمة المفتاحية `return`.",
            "💡 بعد الانتهاء من كتابة الدالة، لا تنسَ استدعاءها من خارج الكتلة باسمها: `my_func()`."
        ]
    }

    selected_topic = "loop"
    for k in hints_catalog.keys():
        if k in topic.lower() or k in lesson_id.lower():
            selected_topic = k
            break

    hints = hints_catalog[selected_topic]
    lvl_idx = max(0, min(level - 1, len(hints) - 1))
    hint_text = hints[lvl_idx]

    return {
        "success": True,
        "level": lvl_idx + 1,
        "max_levels": 3,
        "hint": hint_text,
        "has_more_hints": (lvl_idx + 1 < 3)
    }

@router.post("/improve-code")
def improve_code(data: Dict[str, Any], current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Educational Assistant: Suggest code improvements, best practices, and clean code tips
    without replacing the student's solution.
    """
    code = str(data.get("code") or "").strip()
    if not code:
        return {"success": True, "suggestions": ["اكتب بعض الأكواد في المحرر أولاً لتلقي اقتراحات تحسين الأداء والتنظيم."]}
    
    suggestions = []
    if "import *" in code:
        suggestions.append("تجنب استخدام 'from module import *' وحدد الدوال المطلوبة بدقة للحفاظ على وضوح الكود.")
    if "== True" in code or "== False" in code:
        suggestions.append("في جمل if، يمكنك كتابة 'if condition:' مباشرة بدلاً من 'if condition == True:' لأن الشرط يعود بقيمة منطقية تلقائيًا.")
    if "while 1:" in code:
        suggestions.append("يفضل استخدام 'while True:' بدلاً من 'while 1:' لقراءة أوضح وتوافق تام مع معايير بايثون (PEP 8).")
    if "," in code and ", " not in code:
        suggestions.append("ضع مسافة واحدة بعد الفواصل (,) بين العناصر والمدخلات لتسهيل قراءة الكود.")
    if "print(" in code and "f" not in code and ("+" in code or "," in code):
        suggestions.append("نصيحة للمحترفين: استخدام f-strings مثل print(f'القيمة: {val}') يعطي شكلاً أنظف وأسرع من الدمج بـ + أو الفواصل.")
    if "for i in range(len(" in code:
        suggestions.append("يمكنك استخدام enumerate() بدلاً من range(len()) إذا كنت بحاجة لكل من الفهرس والعنصر معًا.")
        
    if not suggestions:
        suggestions.append("كودك منظم ومكتوب بطريقة جيدة! استمر في اتباع قواعد التسمية المعبرة وتنسيق الأسطر (PEP 8).")
        suggestions.append("تأكد دائمًا من إضافة تعليقات # تشرح الغرض من العمليات الحسابية أو الدوال المعقدة.")
        
    return {"success": True, "suggestions": suggestions}


@router.post("/explain-code")
def explain_code_concept(data: Dict[str, Any], current_user: Optional[dict] = Depends(get_optional_user)):
    """
    Educational Assistant: Explain what student's code does step-by-step in clear Arabic,
    identifying constructs, concepts, and data flow without solving assignments directly.
    """
    code = str(data.get("code") or "").strip()
    if not code:
        return {
            "success": True,
            "summary": "المحرر فارغ حاليًا.",
            "steps": ["اكتب بعض أسطر بايثون لشرح كيفية عملها خطوة بخطوة."],
            "concepts": ["أساسيات بايثون"]
        }

    steps = []
    concepts = []

    # AST analysis
    try:
        tree = ast.parse(code)
        has_input = False
        has_print = False
        has_loops = False
        has_conditions = False
        has_functions = False
        has_lists = False

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    if node.func.id == "input":
                        has_input = True
                    elif node.func.id == "print":
                        has_print = True
            elif isinstance(node, (ast.For, ast.While)):
                has_loops = True
            elif isinstance(node, ast.If):
                has_conditions = True
            elif isinstance(node, ast.FunctionDef):
                has_functions = True
            elif isinstance(node, (ast.List, ast.ListComp)):
                has_lists = True

        if has_functions:
            steps.append("1. تعريف دوال مخصصة (def): يقوم البرنامج بتعريف دوال فرعية تؤدي مهام محددة وقابلة لإعادة الاستخدام.")
            concepts.append("الدوال المعرفة من المستخدم (Functions)")
        if has_input:
            steps.append("2. استقبال المدخلات: يستقبل البرنامج بيانات من المستخدم عبر دالة input() لتخزينها في متغيرات.")
            concepts.append("الإدخال والتفاعل (User Input)")
        if has_conditions:
            steps.append("3. اتخاذ القرارات والمسارات (if/elif/else): يفحص البرنامج شروطاً منطقية وينفذ كتل برمجية محددة بناءً على تحقق الشرط.")
            concepts.append("الجمل الشرطية والتحكم المنطقي (Conditionals)")
        if has_loops:
            steps.append("4. التكرار والدوران (Loops): يقوم بتكرار مجموعة من الأوامر لعدد محدد من المرات أو طالما الشرط مستمر.")
            concepts.append("حلقات التكرار (Iteration & Loops)")
        if has_lists:
            steps.append("5. هياكل البيانات والقوائم: ينشئ ويتعامل مع مصفوفات وقوائم لتجميع عناصر وبيانات متعددة.")
            concepts.append("القوائم وهياكل البيانات (Lists)")
        if has_print:
            steps.append("6. إخراج النتائج: يقوم بعرض المخرجات النهائية أو القيم الحسابية للمستخدم عبر دالة print().")
            concepts.append("إخراج البيانات والطباعة (Console Output)")

        if not steps:
            steps.append("يقوم البرنامج بتعريف متغيرات وتعيين قيم أولية وإجراء بعض العمليات الحسابية.")
            concepts.append("المتغيرات والعمليات الحسابية (Variables & Expressions)")

        summary = f"برنامج بايثون يتضمن {len(concepts)} مفاهيم برمجية أساسية تركز على {' و '.join(concepts[:3])}."
    except Exception as e:
        summary = "كود تجريبي قيد الكتابة."
        steps = ["تحليل عام: راجع بناء الجمل في الكود للتأكد من تسلسل العمليات الحسابية والمنطقية."]
        concepts = ["أساسيات البرمجة"]

    return {
        "success": True,
        "summary": summary,
        "steps": steps,
        "concepts": concepts
    }

# ==============================================================================
# CODE PLAYGROUND & LABS (PYTHON, WEB DEV, CYBER SECURITY)
# ==============================================================================

playground_router = APIRouter(prefix="/api/playground", tags=["Code Playground & Labs"])

class PlaygroundExampleCreate(BaseModel):
    type: str  # "python", "web", "cyber_security"
    category: str
    title: str
    description: Optional[str] = ""
    difficulty: Optional[str] = "beginner"
    instructions: Optional[str] = ""
    initial_code: str
    expected_output: Optional[str] = ""
    is_published: Optional[bool] = True
    order_index: Optional[int] = 1


class PlaygroundExampleUpdate(BaseModel):
    type: Optional[str] = None
    category: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    initial_code: Optional[str] = None
    expected_output: Optional[str] = None
    is_published: Optional[bool] = None
    order_index: Optional[int] = None


class CyberExecuteRequest(BaseModel):
    command: str
    session_id: Optional[str] = "default"


class CyberLabSandbox:
    """
    Safe, self-contained educational sandbox for learning Linux, networking,
    cryptography, log analysis, and security utilities without exposing the host system.
    """
    _SESSIONS: Dict[str, Dict[str, Any]] = {}

    DEFAULT_FILES = {
        "/home/student/notes.txt": (
            "أهلاً بك في معمل الأمن السيبراني (Cyber Security Lab) لمنصة Code Spark!\n"
            "هذا المعمل مخصص لتعلم أوامر لينكس، فحص الشبكات، التشفير والتجزئة، وتحليل السجلات بأمان.\n"
            "جرب الأوامر: help, ls -l, cat /var/log/auth.log, netstat -tuln, md5sum\n"
        ),
        "/home/student/scanner.sh": (
            "#!/bin/bash\n"
            "# فاحص المنافذ والشبكة الداخلي التعليمي\n"
            "echo '== Checking Local Listening Ports =='\n"
            "netstat -tuln\n"
        ),
        "/home/student/config.json": '{\n  "environment": "codespark_training_lab",\n  "version": "2.0.0",\n  "debug": false\n}',
        "/training/secret_encoded.txt": "Q29kZVNwYXJrX1NlY3VyaXR5X0xhYl8yMDI2",
        "/training/hashes.txt": (
            "admin_pass_md5: 5f4dcc3b5aa765d61d8327deb882cf99\n"
            "flag_sha256: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92\n"
            "system_token: c898c697478dfc2049d5904d9b4b0365\n"
        ),
        "/training/permissions_demo.txt": "ملف تدريبي لفحص صلاحيات الملفات باستخدام الأمر chmod وتوضيح أذونات القراءة والكتابة.",
        "/training/network_hosts.txt": (
            "127.0.0.1       localhost\n"
            "10.0.2.15       codespark-lab\n"
            "10.0.2.20       training.local\n"
            "10.0.2.25       mail.training.local\n"
        ),
        "/var/log/auth.log": (
            "Sep 10 10:12:01 codespark-lab sshd[204]: Failed password for invalid user admin from 192.168.1.105 port 44212 ssh2\n"
            "Sep 10 10:12:05 codespark-lab sshd[204]: Failed password for invalid user admin from 192.168.1.105 port 44212 ssh2\n"
            "Sep 10 10:12:09 codespark-lab sshd[204]: Failed password for root from 192.168.1.105 port 44214 ssh2\n"
            "Sep 10 10:12:15 codespark-lab sshd[204]: Failed password for root from 192.168.1.105 port 44216 ssh2\n"
            "Sep 10 10:14:22 codespark-lab sshd[210]: Accepted password for student from 192.168.1.50 port 51100 ssh2\n"
            "Sep 10 10:15:00 codespark-lab sudo: student : TTY=pts/0 ; PWD=/home/student ; COMMAND=/usr/bin/apt update\n"
        ),
        "/var/log/nginx/access.log": (
            '192.168.1.50 - - [10/Sep/2026:10:15:30 +0000] "GET /api/health HTTP/1.1" 200 64 "-" "Mozilla/5.0"\n'
            '192.168.1.105 - - [10/Sep/2026:10:16:01 +0000] "GET /login?user=\' OR \'1\'=\'1 HTTP/1.1" 403 145 "-" "sqlmap/1.5"\n'
            '192.168.1.105 - - [10/Sep/2026:10:16:15 +0000] "GET /../../../../etc/passwd HTTP/1.1" 400 130 "-" "curl/7.81.0"\n'
            '192.168.1.50 - - [10/Sep/2026:10:20:00 +0000] "GET /dashboard HTTP/1.1" 200 4321 "-" "Mozilla/5.0"\n'
        ),
        "/etc/hosts": (
            "127.0.0.1 localhost\n"
            "10.0.2.15 codespark-lab\n"
            "10.0.2.20 training.local\n"
        ),
        "/etc/resolv.conf": "nameserver 10.0.2.1\nsearch codespark.local\n",
    }

    DEFAULT_PERMISSIONS = {
        "/home/student/notes.txt": "-rw-r--r--",
        "/home/student/scanner.sh": "-rwxr-xr-x",
        "/home/student/config.json": "-rw-r--r--",
        "/training/secret_encoded.txt": "-rw-r--r--",
        "/training/hashes.txt": "-rw-r--r--",
        "/training/permissions_demo.txt": "-rw-rw-r--",
        "/training/network_hosts.txt": "-rw-r--r--",
        "/var/log/auth.log": "-rw-r-----",
        "/var/log/nginx/access.log": "-rw-r--r--",
        "/etc/hosts": "-rw-r--r--",
        "/etc/resolv.conf": "-rw-r--r--",
    }

    ALLOWED_COMMANDS = {
        "help", "clear", "echo", "cat", "ls", "pwd", "cd", "whoami", "id",
        "uname", "chmod", "chown", "ps", "top", "kill", "ping", "traceroute",
        "ifconfig", "ip", "netstat", "dig", "nslookup", "host", "curl", "wget",
        "md5sum", "sha256sum", "base64", "grep", "head", "tail", "wc", "find",
        "history", "date", "nmap"
    }

    BLOCKED_PATTERNS = [
        r"\bsudo\b", r"\bsu\b", r"\bbash\b", r"\bsh\b", r"\bzsh\b", r"\bpython\b",
        r"\bperl\b", r"\bruby\b", r"\bphp\b", r"\bnc\b", r"\bnetcat\b", r"\bsocat\b",
        r"/etc/shadow", r"/etc/passwd", r"\.env\b", r"codespark_production\.db",
        r"\brm\s+-rf\s+/", r"\bmkfs\b", r"\bdd\b", r":\(\)\s*\{"
    ]

    @classmethod
    def get_session(cls, session_id: str) -> Dict[str, Any]:
        if session_id not in cls._SESSIONS:
            cls._SESSIONS[session_id] = {
                "cwd": "/home/student",
                "files": dict(cls.DEFAULT_FILES),
                "permissions": dict(cls.DEFAULT_PERMISSIONS),
                "processes": [
                    {"pid": 1, "user": "root", "cmd": "/sbin/init", "cpu": "0.0", "mem": "0.1"},
                    {"pid": 102, "user": "www-data", "cmd": "nginx: worker process", "cpu": "0.1", "mem": "0.5"},
                    {"pid": 204, "user": "student", "cmd": "-bash", "cpu": "0.0", "mem": "0.2"},
                    {"pid": 310, "user": "student", "cmd": "python3 background_worker.py", "cpu": "0.2", "mem": "1.2"},
                    {"pid": 412, "user": "student", "cmd": "simulated_cron_job", "cpu": "0.0", "mem": "0.1"},
                ],
                "history": []
            }
        return cls._SESSIONS[session_id]

    @classmethod
    def reset_session(cls, session_id: str) -> None:
        cls._SESSIONS.pop(session_id, None)

    @classmethod
    def execute(cls, raw_command: str, session_id: str = "default") -> Dict[str, Any]:
        session = cls.get_session(session_id)
        cmd_str = raw_command.strip()
        
        if not cmd_str:
            return {"success": True, "output": "", "cwd": session["cwd"]}

        session["history"].append(cmd_str)

        # 1. Security blocklist check
        for pat in cls.BLOCKED_PATTERNS:
            if re.search(pat, cmd_str, re.IGNORECASE):
                return {
                    "success": False,
                    "output": "🔒 تنبيه أمني: الأمر أو المسار المطلوب محظور في معمل التدريب المعزول لأسباب أمنية.",
                    "cwd": session["cwd"]
                }

        # Handle multiple commands chained by && or ;
        if "&&" in cmd_str:
            sub_cmds = [c.strip() for c in cmd_str.split("&&") if c.strip()]
            outputs = []
            for sc in sub_cmds:
                r = cls._execute_single_or_piped(sc, session)
                outputs.append(r["output"])
                if not r.get("success", True):
                    break
            return {"success": True, "output": "\n".join(outputs), "cwd": session["cwd"]}

        if ";" in cmd_str:
            sub_cmds = [c.strip() for c in cmd_str.split(";") if c.strip()]
            outputs = []
            for sc in sub_cmds:
                r = cls._execute_single_or_piped(sc, session)
                outputs.append(r["output"])
            return {"success": True, "output": "\n".join(outputs), "cwd": session["cwd"]}

        return cls._execute_single_or_piped(cmd_str, session)

    @classmethod
    def _execute_single_or_piped(cls, command: str, session: Dict[str, Any]) -> Dict[str, Any]:
        if "|" in command:
            pipes = [p.strip() for p in command.split("|") if p.strip()]
            input_data = ""
            for p in pipes:
                res = cls._execute_single(p, session, pipe_input=input_data)
                input_data = res["output"]
            return {"success": True, "output": input_data, "cwd": session["cwd"]}

        return cls._execute_single(command, session)

    @classmethod
    def _execute_single(cls, cmd: str, session: Dict[str, Any], pipe_input: str = "") -> Dict[str, Any]:
        parts = cmd.strip().split()
        if not parts:
            return {"success": True, "output": "", "cwd": session["cwd"]}

        base = parts[0].lower()

        if base not in cls.ALLOWED_COMMANDS:
            return {
                "success": False,
                "output": f"bash: {base}: أمر غير معروف أو غير مسموح به في المعمل التعليمي. اكتب 'help' لعرض الأوامر المدعومة.",
                "cwd": session["cwd"]
            }

        handler_name = f"_handle_{base}"
        handler = getattr(cls, handler_name, None)
        if handler:
            try:
                out = handler(parts, session, pipe_input)
                if len(out) > 4000:
                    out = out[:4000] + "\n... [تم اقتطاع المخرجات لتجاوزها الحد الأقصى للمعمل]"
                return {"success": True, "output": out, "cwd": session["cwd"]}
            except Exception as e:
                return {"success": False, "output": f"خطأ أثناء تنفيذ الأمر: {str(e)}", "cwd": session["cwd"]}

        return {"success": True, "output": f"تم استدعاء {base}", "cwd": session["cwd"]}

    @classmethod
    def _handle_help(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        return (
            "===============================================================\n"
            "🛡️  معمل الأمن السيبراني التعليمي — Code Spark Cyber Security Lab\n"
            "===============================================================\n"
            "الأوامر المدعومة في بيئة المحاكاة المعزولة:\n\n"
            "📁 أوامر النظام والملفات (Linux Basics):\n"
            "  ls [-l, -la, -a]   : عرض محتويات الدليل وتفاصيل الصلاحيات\n"
            "  cd [path]          : الانتقال بين المجلدات (المسارات: /home/student, /training, /var/log, /etc)\n"
            "  pwd                : معرفة مسار الدليل الحالي\n"
            "  cat [file]         : قراءة واستعراض محتوى الملفات\n"
            "  echo [text]        : طباعة نص أو تمريره عبر الأنابيب (|)\n"
            "  chmod [mode] [file]: تغيير أذونات وصلاحيات الملفات (مثال: chmod 755 scanner.sh)\n"
            "  whoami / id        : معرفة المستخدم الحالي والمجموعات\n"
            "  uname -a           : عرض معلومات نواة النظام ونوعه\n"
            "  date               : عرض التاريخ والتوقيت الحالي\n"
            "  history            : عرض سجل الأوامر المنفذة في الجلسة\n"
            "  clear              : مسح شاشة سطر الأوامر\n\n"
            "⚙️ إدارة العمليات (Process Monitoring):\n"
            "  ps [aux]           : عرض العمليات والمهام الجارية في النظام\n"
            "  top                : مراقبة استخدام المعالج والذاكرة\n"
            "  kill [PID]         : إيقاف عملية معينة برقمها\n\n"
            "🌐 الشبكات والاستطلاع (Networking & Reconnaissance):\n"
            "  ping [target]      : فحص الاتصال بالخوادم المتاحة محليًا (127.0.0.1, training.local)\n"
            "  traceroute [target]: تتبع مسار حزم البيانات عبر بوابات الشبكة\n"
            "  ifconfig / ip a    : استعراض كروت الشبكة وعناوين IP و MAC\n"
            "  netstat [-tuln]    : عرض المنافذ المفتوحة والمستمعة (Listening Ports)\n"
            "  dig / nslookup     : استعلام سجلات خادم أسماء النطاقات (DNS Records)\n"
            "  curl [-I] [URL]    : إرسال طلب HTTP وفحص رؤوس الأمان (Security Headers)\n"
            "  nmap [target]      : فحص منافذ وخدمات الأهداف التدريبية المتاحة\n\n"
            "🔐 التشفير والتجزئة وفحص السجلات (Crypto & Log Analysis):\n"
            "  md5sum [text/file] : حساب قيمة التجزئة المشفرة بخوارزمية MD5\n"
            "  sha256sum          : حساب بصمة التجزئة المشفرة بخوارزمية SHA-256\n"
            "  base64 [-d]        : ترميز وفك تشفير النصوص والبيانات بترميز Base64\n"
            "  grep [text] [file] : البحث عن كلمات وأنماط محددة داخل ملفات السجلات\n"
            "  head / tail / wc   : استخراج أسطر البداية/النهاية وإحصاء الكلمات\n\n"
            "🔒 تنبيه أمني: المعمل معزول تماماً ومصمم للتدريب التعليمي فقط. الاتصال الخارجي غير مسموح به."
        )

    @classmethod
    def _handle_whoami(cls, parts, session, pipe_input):
        return "student@codespark-lab"

    @classmethod
    def _handle_id(cls, parts, session, pipe_input):
        return "uid=1001(student) gid=1001(student) groups=1001(student),1002(training_lab),1003(security_students)"

    @classmethod
    def _handle_uname(cls, parts, session, pipe_input):
        return "Linux codespark-sandbox 6.1.0-training #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"

    @classmethod
    def _handle_pwd(cls, parts, session, pipe_input):
        return session.get("cwd", "/home/student")

    @classmethod
    def _handle_cd(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        if len(parts) < 2 or parts[1] in ("~", ""):
            session["cwd"] = "/home/student"
            return ""

        target = parts[1].strip()
        current = session.get("cwd", "/home/student")
        new_path = target if target.startswith("/") else os.path.normpath(os.path.join(current, target))
        valid_prefixes = ["/home/student", "/training", "/var/log", "/etc", "/var"]
        if new_path == "/" or any(new_path.startswith(vp) for vp in valid_prefixes):
            session["cwd"] = new_path
            return ""
        return f"bash: cd: {target}: لا يوجد مثل هذا المجلد أو ليس لديك صلاحية الدخول إليه."

    @classmethod
    def _handle_ls(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        flags = [p for p in parts if p.startswith("-")]
        args = [p for p in parts[1:] if not p.startswith("-")]
        target_dir = args[0] if args else session.get("cwd", "/home/student")
        if not target_dir.startswith("/"):
            target_dir = os.path.normpath(os.path.join(session.get("cwd", "/home/student"), target_dir))

        is_long = any("l" in f for f in flags)
        is_all = any("a" in f for f in flags)
        files = session.get("files", {})
        perms = session.get("permissions", {})

        items = []
        for path in files.keys():
            if os.path.dirname(path) == target_dir or (target_dir == "/" and path.count("/") == 1):
                fname = os.path.basename(path)
                p = perms.get(path, "-rw-r--r--")
                size = len(files[path])
                items.append({"name": fname, "perm": p, "size": size, "path": path})

        if not items and target_dir not in ("/home/student", "/training", "/var/log", "/etc", "/"):
            return f"ls: cannot access '{target_dir}': No such file or directory"

        if is_long:
            lines = [f"total {len(items) * 4}"]
            if is_all:
                lines.append("drwxr-xr-x 2 student student 4096 Sep 10 12:00 .")
                lines.append("drwxr-xr-x 3 root    root    4096 Sep 10 12:00 ..")
            for it in sorted(items, key=lambda x: x["name"]):
                lines.append(f"{it['perm']} 1 student student {it['size']:>5} Sep 10 12:00 {it['name']}")
            return "\n".join(lines)
        else:
            return "  ".join(sorted(it["name"] for it in items))

    @classmethod
    def _handle_cat(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        if pipe_input and len(parts) == 1:
            return pipe_input
        if len(parts) < 2:
            return "cat: missing file operand"
        filename = parts[1].strip()
        cwd = session.get("cwd", "/home/student")
        full_path = filename if filename.startswith("/") else os.path.normpath(os.path.join(cwd, filename))
        files = session.get("files", {})
        if full_path in files:
            return files[full_path].strip()
        return f"cat: {filename}: No such file or directory"

    @classmethod
    def _handle_echo(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        raw = " ".join(parts[1:])
        if (raw.startswith('"') and raw.endswith('"')) or (raw.startswith("'") and raw.endswith("'")):
            raw = raw[1:-1]
        return raw

    @classmethod
    def _handle_chmod(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        if len(parts) < 3:
            return "chmod: missing operand. Usage: chmod [mode] [file]"
        mode = parts[1].strip()
        filename = parts[2].strip()
        cwd = session.get("cwd", "/home/student")
        full_path = filename if filename.startswith("/") else os.path.normpath(os.path.join(cwd, filename))
        perms = session.get("permissions", {})
        files = session.get("files", {})
        if full_path not in files:
            return f"chmod: cannot access '{filename}': No such file or directory"

        mode_map = {
            "777": "-rwxrwxrwx", "755": "-rwxr-xr-x", "700": "-rwx------",
            "644": "-rw-r--r--", "600": "-rw-------", "666": "-rw-rw-rw-",
            "+x": "-rwxr-xr-x", "-x": "-rw-r--r--"
        }
        new_perm = mode_map.get(mode, "-rwxr-xr-x" if "x" in mode else "-rw-r--r--")
        perms[full_path] = new_perm
        return f"تم تحديث صلاحيات '{filename}' بنجاح إلى: {new_perm} ({mode})"

    @classmethod
    def _handle_chown(cls, parts, session, pipe_input):
        return "تم تحديث ملكية الملف بنجاح."

    @classmethod
    def _handle_ps(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        procs = session.get("processes", [])
        lines = [f"{'USER':<10} {'PID':<6} {'%CPU':<6} {'%MEM':<6} {'COMMAND':<30}"]
        for p in procs:
            lines.append(f"{p['user']:<10} {p['pid']:<6} {p['cpu']:<6} {p['mem']:<6} {p['cmd']:<30}")
        return "\n".join(lines)

    @classmethod
    def _handle_top(cls, parts, session, pipe_input):
        return (
            "top - 12:00:15 up 42 days, 3 users, load average: 0.08, 0.04, 0.01\n"
            "Tasks: 5 total, 1 running, 4 sleeping, 0 stopped, 0 zombie\n"
            "%Cpu(s):  1.2 us,  0.5 sy,  0.0 ni, 98.3 id,  0.0 wa,  0.0 hi,  0.0 si\n"
            "MiB Mem :   3920.5 total,   1420.2 free,    980.4 used,   1519.9 buff/cache\n\n"
            "   PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n"
            "   102 www-data  20   0   64210  12100   4800 S   0.1   0.5   0:02.15 nginx\n"
            "   310 student   20   0  112000  24000   8200 S   0.2   1.2   0:05.30 python3\n"
            "   204 student   20   0   15200   4800   3100 S   0.0   0.2   0:00.45 bash\n"
        )

    @classmethod
    def _handle_kill(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        if len(parts) < 2:
            return "kill: usage: kill pid"
        try:
            target_pid = int(parts[1])
            if target_pid == 1:
                return "kill: (1) - Operation not permitted: Cannot kill init/PID 1."
            session["processes"] = [p for p in session.get("processes", []) if p["pid"] != target_pid]
            return f"[+] تم إنهاء العملية رقم (PID: {target_pid}) بنجاح."
        except ValueError:
            return f"kill: illegal pid: {parts[1]}"

    @classmethod
    def _handle_ping(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        if len(parts) < 2:
            return "ping: usage error: Destination address required"
        target = parts[-1].strip().lower()
        allowed_targets = {"127.0.0.1", "localhost", "10.0.2.15", "codespark-lab", "training.local", "10.0.2.20"}
        if target not in allowed_targets:
            return (
                f"🚫 [أمان المعمل] الاتصال بالأجهزة والخوادم الخارجية ({target}) محظور في بيئة التدريب المعزولة.\n"
                "الهدف هو تعلم وممارسة أوامر الشبكات محليًا بأمان تام.\n"
                "الأهداف التدريبية المتاحة: ping 127.0.0.1 أو ping training.local"
            )
        ip = "127.0.0.1" if target in ("127.0.0.1", "localhost") else "10.0.2.20"
        return (
            f"PING {target} ({ip}) 56(84) bytes of data.\n"
            f"64 bytes from {ip}: icmp_seq=1 ttl=64 time=0.231 ms\n"
            f"64 bytes from {ip}: icmp_seq=2 ttl=64 time=0.218 ms\n"
            f"64 bytes from {ip}: icmp_seq=3 ttl=64 time=0.245 ms\n"
            f"64 bytes from {ip}: icmp_seq=4 ttl=64 time=0.210 ms\n\n"
            f"--- {target} ping statistics ---\n"
            f"4 packets transmitted, 4 received, 0% packet loss, time 3004ms\n"
            f"rtt min/avg/max/mdev = 0.210/0.226/0.245/0.013 ms"
        )

    @classmethod
    def _handle_traceroute(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        target = parts[-1] if len(parts) > 1 else "training.local"
        return (
            f"traceroute to {target} (10.0.2.20), 30 hops max, 60 byte packets\n"
            f" 1  codespark-gateway (10.0.2.1)  0.342 ms  0.315 ms  0.298 ms\n"
            f" 2  training-vlan (10.0.2.10)  0.512 ms  0.485 ms  0.460 ms\n"
            f" 3  training.local (10.0.2.20)  0.710 ms  0.680 ms  0.645 ms\n"
        )

    @classmethod
    def _handle_ifconfig(cls, parts, session, pipe_input):
        return (
            "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n"
            "        inet 10.0.2.15  netmask 255.255.255.0  broadcast 10.0.2.255\n"
            "        ether 08:00:27:8a:4b:9c  txqueuelen 1000  (Ethernet)\n"
            "        RX packets 142080  bytes 128491024 (122.5 MiB)\n"
            "        TX packets 98412   bytes 42819201  (40.8 MiB)\n\n"
            "lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n"
            "        inet 127.0.0.1  netmask 255.0.0.0\n"
            "        loop  txqueuelen 1000  (Local Loopback)\n"
        )

    @classmethod
    def _handle_ip(cls, parts: List[str], session, pipe_input):
        return cls._handle_ifconfig(parts, session, pipe_input)

    @classmethod
    def _handle_netstat(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        return (
            "Active Internet connections (only servers)\n"
            "Proto Recv-Q Send-Q Local Address           Foreign Address         State      \n"
            "tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN (HTTP)\n"
            "tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN (SSH)\n"
            "tcp        0      0 127.0.0.1:8080          0.0.0.0:*               LISTEN (Internal Training API)\n"
            "tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN (PostgreSQL Sandbox)\n"
            "udp        0      0 0.0.0.0:53              0.0.0.0:*               (DNS Server)\n"
        )

    @classmethod
    def _handle_dig(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        domain = [p for p in parts[1:] if not p.startswith("-")]
        d_name = domain[0] if domain else "training.local"
        return (
            f"; <<>> DiG 9.18.1 <<>> {d_name}\n"
            ";; global options: +cmd\n"
            ";; Got answer:\n"
            ";; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48123\n"
            ";; flags: qr aa rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1\n\n"
            f";; QUESTION SECTION:\n"
            f";{d_name}.                 IN      A\n\n"
            f";; ANSWER SECTION:\n"
            f"{d_name}.          300     IN      A       10.0.2.20\n\n"
            ";; Query time: 1 msec\n"
            ";; SERVER: 10.0.2.1#53(10.0.2.1)\n"
            ";; WHEN: Wed Sep 10 12:00:00 UTC 2026\n"
            ";; MSG SIZE  rcvd: 59\n"
        )

    @classmethod
    def _handle_nslookup(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        d = parts[1] if len(parts) > 1 else "training.local"
        return f"Server:         10.0.2.1\nAddress:        10.0.2.1#53\n\nName:   {d}\nAddress: 10.0.2.20\n"

    @classmethod
    def _handle_host(cls, parts: List[str], session, pipe_input):
        return cls._handle_nslookup(parts, session, pipe_input)

    @classmethod
    def _handle_curl(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        is_head = "-I" in parts or "-i" in parts
        url = parts[-1] if len(parts) > 1 else "http://training.local"
        if not url.startswith("http://training.local") and not url.startswith("http://127.0.0.1") and not url.startswith("http://localhost"):
            return (
                "🚫 [أمان المعمل] إرسال طلبات HTTP إلى مواقع وعناوين خارجية محظور.\n"
                "يمكنك اختبار فحص رؤوس واستجابات خادم التدريب المحلي: curl -I http://training.local"
            )
        headers = (
            "HTTP/1.1 200 OK\n"
            "Server: nginx/1.24.0 (Ubuntu)\n"
            "Date: Wed, 10 Sep 2026 12:00:00 GMT\n"
            "Content-Type: text/html; charset=UTF-8\n"
            "Content-Length: 420\n"
            "Connection: keep-alive\n"
            "X-Content-Type-Options: nosniff\n"
            "X-Frame-Options: SAMEORIGIN\n"
            "X-XSS-Protection: 1; mode=block\n"
            "Strict-Transport-Security: max-age=31536000; includeSubDomains\n"
            "Content-Security-Policy: default-src 'self'\n"
        )
        if is_head:
            return headers
        return headers + "\n<!DOCTYPE html>\n<html>\n<head><title>Code Spark Training Server</title></head>\n<body>\n<h1>🚀 Welcome to Code Spark Security Training Lab</h1>\n<p>Server Status: Active & Protected.</p>\n</body>\n</html>"

    @classmethod
    def _handle_wget(cls, parts, session, pipe_input):
        return cls._handle_curl(parts, session, pipe_input)

    @classmethod
    def _handle_md5sum(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        text_to_hash = pipe_input
        if not text_to_hash and len(parts) > 1:
            fname = parts[1].strip()
            cwd = session.get("cwd", "/home/student")
            full_path = fname if fname.startswith("/") else os.path.normpath(os.path.join(cwd, fname))
            files = session.get("files", {})
            text_to_hash = files.get(full_path, fname)
        res = hashlib.md5(text_to_hash.encode("utf-8")).hexdigest()
        return f"{res}  -"

    @classmethod
    def _handle_sha256sum(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        text_to_hash = pipe_input
        if not text_to_hash and len(parts) > 1:
            fname = parts[1].strip()
            cwd = session.get("cwd", "/home/student")
            full_path = fname if fname.startswith("/") else os.path.normpath(os.path.join(cwd, fname))
            files = session.get("files", {})
            text_to_hash = files.get(full_path, fname)
        res = hashlib.sha256(text_to_hash.encode("utf-8")).hexdigest()
        return f"{res}  -"

    @classmethod
    def _handle_base64(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        is_decode = "-d" in parts or "--decode" in parts
        data = pipe_input
        if not data and len(parts) > 1:
            arg = parts[-1]
            if not arg.startswith("-"):
                cwd = session.get("cwd", "/home/student")
                full_path = arg if arg.startswith("/") else os.path.normpath(os.path.join(cwd, arg))
                files = session.get("files", {})
                data = files.get(full_path, arg)

        data = data.strip()
        if is_decode:
            try:
                decoded = base64.b64decode(data).decode("utf-8")
                return decoded
            except Exception as e:
                return f"base64: invalid input: {e}"
        else:
            return base64.b64encode(data.encode("utf-8")).decode("utf-8")

    @classmethod
    def _handle_grep(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        flags = [p for p in parts[1:] if p.startswith("-")]
        args = [p for p in parts[1:] if not p.startswith("-")]
        if not args and not pipe_input:
            return "grep: search pattern required"
        pattern = args[0].strip("\'\"") if args else ""
        content = pipe_input
        if not content and len(args) > 1:
            fname = args[1]
            cwd = session.get("cwd", "/home/student")
            full_path = fname if fname.startswith("/") else os.path.normpath(os.path.join(cwd, fname))
            files = session.get("files", {})
            content = files.get(full_path, "")

        is_ignore_case = "-i" in flags
        matched = []
        for line in content.splitlines():
            if is_ignore_case:
                if pattern.lower() in line.lower():
                    matched.append(line)
            else:
                if pattern in line:
                    matched.append(line)
        return "\n".join(matched) if matched else ""

    @classmethod
    def _handle_head(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        lines_count = 10
        if "-n" in parts:
            idx = parts.index("-n")
            if idx + 1 < len(parts):
                try:
                    lines_count = int(parts[idx + 1])
                except ValueError:
                    pass
        content = pipe_input
        if not content:
            fname = [p for p in parts[1:] if not p.startswith("-") and not p.isdigit()]
            if fname:
                cwd = session.get("cwd", "/home/student")
                full_path = fname[0] if fname[0].startswith("/") else os.path.normpath(os.path.join(cwd, fname[0]))
                content = session.get("files", {}).get(full_path, "")
        return "\n".join(content.splitlines()[:lines_count])

    @classmethod
    def _handle_tail(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        lines_count = 10
        if "-n" in parts:
            idx = parts.index("-n")
            if idx + 1 < len(parts):
                try:
                    lines_count = int(parts[idx + 1])
                except ValueError:
                    pass
        content = pipe_input
        if not content:
            fname = [p for p in parts[1:] if not p.startswith("-") and not p.isdigit()]
            if fname:
                cwd = session.get("cwd", "/home/student")
                full_path = fname[0] if fname[0].startswith("/") else os.path.normpath(os.path.join(cwd, fname[0]))
                content = session.get("files", {}).get(full_path, "")
        all_lines = content.splitlines()
        return "\n".join(all_lines[-lines_count:] if lines_count <= len(all_lines) else all_lines)

    @classmethod
    def _handle_wc(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        content = pipe_input
        lines = len(content.splitlines())
        words = len(content.split())
        chars = len(content)
        if "-l" in parts:
            return str(lines)
        if "-w" in parts:
            return str(words)
        return f"{lines}  {words}  {chars}"

    @classmethod
    def _handle_find(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        files = session.get("files", {})
        res = []
        name_filter = ""
        if "-name" in parts:
            idx = parts.index("-name")
            if idx + 1 < len(parts):
                name_filter = parts[idx + 1].strip("\'\"*")
        for f in sorted(files.keys()):
            if not name_filter or name_filter in f:
                res.append(f)
        return "\n".join(res)

    @classmethod
    def _handle_history(cls, parts, session, pipe_input):
        hist = session.get("history", [])
        return "\n".join(f"{i+1:4d}  {h}" for i, h in enumerate(hist))

    @classmethod
    def _handle_date(cls, parts, session, pipe_input):
        return datetime.datetime.now(datetime.timezone.utc).strftime("%a %b %d %H:%M:%S UTC %Y")

    @classmethod
    def _handle_nmap(cls, parts: List[str], session: Dict[str, Any], pipe_input: str) -> str:
        target = parts[-1] if len(parts) > 1 else "127.0.0.1"
        if target not in ("127.0.0.1", "localhost", "10.0.2.20", "training.local", "10.0.2.15"):
            return (
                f"🚫 [أمان المعمل] فحص المنافذ على عناوين خارجية ({target}) محظور.\n"
                "يمكنك فحص الخادم المحلي التعليمي: nmap 127.0.0.1"
            )
        return (
            f"Starting Nmap 7.92 ( https://nmap.org ) at 2026-09-10 12:00 UTC\n"
            f"Nmap scan report for {target} (127.0.0.1)\n"
            f"Host is up (0.00012s latency).\n"
            f"Not shown: 997 closed tcp ports (reset)\n"
            f"PORT     STATE SERVICE VERSION\n"
            f"22/tcp   open  ssh     OpenSSH 8.9p1 Ubuntu (protocol 2.0)\n"
            f"80/tcp   open  http    nginx 1.24.0\n"
            f"8080/tcp open  http    CodeSpark Educational Sandbox API\n\n"
            f"Service detection performed. Please report any incorrect results.\n"
            f"Nmap done: 1 IP address (1 host up) scanned in 0.45 seconds"
        )

    @classmethod
    def _handle_clear(cls, parts, session, pipe_input):
        return "\x1b[2J\x1b[H"


# ==============================================================================
# PLAYGROUND ROUTER ENDPOINTS
# ==============================================================================

@playground_router.post("/cyber/execute")
@router.post("/cyber/execute")
def execute_cyber_command(req: CyberExecuteRequest, current_user: Optional[dict] = Depends(get_optional_user)):
    """Execute a simulated educational cyber security command within the safe sandbox."""
    res = CyberLabSandbox.execute(req.command, session_id=req.session_id or "default")
    return res


@playground_router.post("/cyber/reset")
@router.post("/cyber/reset")
def reset_cyber_session(data: Dict[str, Any], current_user: Optional[dict] = Depends(get_optional_user)):
    """Reset virtual cyber security training sandbox to clean initial state."""
    session_id = data.get("session_id", "default")
    CyberLabSandbox.reset_session(session_id)
    return {"success": True, "message": "تم إعادة تعيين معمل الأمن السيبراني إلى الحالة الافتراضية بنجاح."}


@playground_router.get("/cyber/commands")
@router.get("/cyber/commands")
def get_suggested_commands():
    """Return catalogue of educational cyber security commands with explanations, syntax, and examples."""
    commands = [
        {
            "command": "uname -a",
            "category": "أساسيات لينكس",
            "title": "فحص مواصفات ونواة النظام",
            "description": "يعرض تفاصيل نواة نظام التشغيل وإصداره وهيكل المعالج.",
            "syntax": "uname -a",
            "example": "uname -a",
            "expected_output": "Linux codespark-sandbox 6.1.0-training #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"
        },
        {
            "command": "ls -l /training",
            "category": "صلاحيات الملفات",
            "title": "عرض تفاصيل أذونات الملفات",
            "description": "يعرض أذونات القراءة والكتابة والتنفيذ (rwx) للملفات والمجلدات.",
            "syntax": "ls -l [المسار]",
            "example": "ls -l /training",
            "expected_output": "عرض الأذونات للملفات داخل مجلد التدريب"
        },
        {
            "command": "chmod 755 scanner.sh",
            "category": "صلاحيات الملفات",
            "title": "منح صلاحية التنفيذ لسكربت",
            "description": "يمنح المالك صلاحيات كاملة (7) وباقي المستخدمين صلاحيات قراءة وتنفيذ (5).",
            "syntax": "chmod [صيغة_الصلاحية] [اسم_الملف]",
            "example": "chmod 755 scanner.sh",
            "expected_output": "تم تحديث صلاحيات 'scanner.sh' بنجاح إلى: -rwxr-xr-x (755)"
        },
        {
            "command": "netstat -tuln",
            "category": "مفاهيم الشبكات",
            "title": "فحص المنافذ المفتوحة والمستمعة",
            "description": "يعرض قائمة المنافذ التي يستمع عليها الخادم والبروتوكولات (TCP/UDP).",
            "syntax": "netstat -tuln",
            "example": "netstat -tuln",
            "expected_output": "قائمة بالمنافذ النشطة 80 و 22 و 8080"
        },
        {
            "command": "ping 127.0.0.1",
            "category": "مفاهيم الشبكات",
            "title": "فحص الاتصال عبر بروتوكول ICMP",
            "description": "يرسل حزم بيانات اختبارية للتأكد من وصول الاتصال وقياس زمن الاستجابة (Latency).",
            "syntax": "ping [الهدف]",
            "example": "ping 127.0.0.1",
            "expected_output": "إحصائيات استجابة الحزم وزمن الوصول RTT"
        },
        {
            "command": "dig training.local",
            "category": "استطلاع الشبكة",
            "title": "استعلام سجلات الـ DNS",
            "description": "يستعلم خادم أسماء النطاقات للحصول على عنوان الـ IP المرتبط بالنطاق.",
            "syntax": "dig [اسم_النطاق]",
            "example": "dig training.local",
            "expected_output": "سجل A المرتبط بالنطاق وعنوان IP الخاص به"
        },
        {
            "command": "curl -I http://training.local",
            "category": "مفاهيم الويب",
            "title": "فحص رؤوس أمان HTTP (Security Headers)",
            "description": "يستعلم خادم الويب بدون تحميل الصفحة لفحص رؤوس الحماية مثل CSP و HSTS.",
            "syntax": "curl -I [الرابط]",
            "example": "curl -I http://training.local",
            "expected_output": "رؤوس استجابة الخادم HTTP 200 وحقول الأمان"
        },
        {
            "command": "echo -n \"CodeSpark\" | sha256sum",
            "category": "التشفير والتجزئة",
            "title": "توليد بصمة تجزئة SHA-256",
            "description": "يحسب التجزئة الرقمية المشفرة للنص، والتي لا يمكن استرجاع الأصل منها وتضمن سلامة البيانات.",
            "syntax": "echo -n \"نص\" | sha256sum",
            "example": "echo -n \"CodeSpark\" | sha256sum",
            "expected_output": "قيمة تجزئة مشفرة بطول 64 حرفًا سداسيًا عشرية"
        },
        {
            "command": "cat /training/secret_encoded.txt | base64 -d",
            "category": "التشفير والتجزئة",
            "title": "فك ترميز نص Base64",
            "description": "يقوم بفك ترميز نص تم تحويله بترميز Base64 إلى صيغته الأصلية القابلة للقراءة.",
            "syntax": "base64 -d [النص_أو_الملف]",
            "example": "cat /training/secret_encoded.txt | base64 -d",
            "expected_output": "CodeSpark_Security_Lab_2026"
        },
        {
            "command": "grep \"Failed password\" /var/log/auth.log",
            "category": "فحص السجلات",
            "title": "تحليل سجلات محاولات الدخول الفاشلة",
            "description": "يبحث داخل سجلات المصادقة auth.log واكتشاف محاولات كسر كلمات المرور (Brute Force).",
            "syntax": "grep [الكلمة] /var/log/auth.log",
            "example": "grep \"Failed password\" /var/log/auth.log",
            "expected_output": "عرض محاولات الدخول الفاشلة وعناوين الـ IP المهاجمة"
        },
        {
            "command": "ps aux",
            "category": "العمليات والمهام",
            "title": "استعراض قائمة العمليات النشطة",
            "description": "يعرض جميع العمليات والبرامج التي تعمل في خلفية النظام ومواردها.",
            "syntax": "ps aux",
            "example": "ps aux",
            "expected_output": "جدول بالعمليات النشطة وأرقام المعرفات PID"
        },
        {
            "command": "nmap 127.0.0.1",
            "category": "استطلاع الشبكة",
            "title": "فحص المنافذ التدريبي (Port Scanner)",
            "description": "يفحص المنافذ التدريبية المفتوحة محلياً والخدمات المتاحة عليها.",
            "syntax": "nmap [الهدف]",
            "example": "nmap 127.0.0.1",
            "expected_output": "قائمة بالمنافذ المفتوحة: 22/tcp open ssh, 80/tcp open http"
        }
    ]
    return {"success": True, "commands": commands}


@playground_router.get("/examples")
def get_published_examples(
    type: Optional[str] = None,
    category: Optional[str] = None,
    difficulty: Optional[str] = None
):
    """Retrieve published playground templates & examples for students."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM playground_examples WHERE is_published = 1"
        params = []

        if type:
            query += " AND type = ?"
            params.append(type.strip().lower())
        if category:
            query += " AND category = ?"
            params.append(category.strip().lower())
        if difficulty:
            query += " AND difficulty = ?"
            params.append(difficulty.strip().lower())

        query += " ORDER BY order_index ASC, created_at ASC"
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return {"success": True, "examples": rows, "count": len(rows)}


@playground_router.get("/examples/{example_id}")
def get_example_details(example_id: str):
    """Retrieve single published playground example."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM playground_examples WHERE id = ? AND is_published = 1 LIMIT 1", (example_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المثال المطلوب غير موجود أو غير منشور.")
        return {"success": True, "example": dict(row)}


@playground_router.get("/admin/examples")
def admin_get_all_examples(
    type: Optional[str] = None,
    category: Optional[str] = None,
    admin: dict = Depends(get_current_staff)
):
    """Admin: Fetch all playground examples including drafts."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM playground_examples WHERE 1=1"
        params = []
        if type:
            query += " AND type = ?"
            params.append(type.strip().lower())
        if category:
            query += " AND category = ?"
            params.append(category.strip().lower())
        
        query += " ORDER BY type ASC, order_index ASC, created_at DESC"
        cursor.execute(query, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return {"success": True, "examples": rows, "count": len(rows)}


@playground_router.post("/admin/examples", status_code=status.HTTP_201_CREATED)
def admin_create_example(
    req: PlaygroundExampleCreate,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Create a new playground code example."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_id = f"pg_{req.type.lower()}_{int(time.time() * 1000)}"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO playground_examples (
            id, type, category, title, description, difficulty,
            instructions, initial_code, expected_output,
            is_published, order_index, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            new_id,
            req.type.strip().lower(),
            req.category.strip().lower(),
            req.title.strip(),
            req.description or "",
            req.difficulty or "beginner",
            req.instructions or "",
            req.initial_code,
            req.expected_output or "",
            1 if req.is_published else 0,
            req.order_index or 1,
            now,
            now
        ))

        log_activity(
            user_id=admin.get("id"),
            user_name=admin.get("name"),
            user_role=admin.get("role"),
            action="CREATE_PLAYGROUND_EXAMPLE",
            target_type="PLAYGROUND_EXAMPLE",
            target_id=new_id,
            target_name=req.title.strip(),
            details={"type": req.type, "category": req.category},
            conn=conn
        )

        cursor.execute("SELECT * FROM playground_examples WHERE id = ?", (new_id,))
        created = dict(cursor.fetchone())
        return {"success": True, "message": "تم إضافة المثال بنجاح إلى معمل البرمجة", "example": created}


@playground_router.put("/admin/examples/{example_id}")
def admin_update_example(
    example_id: str,
    req: PlaygroundExampleUpdate,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Update an existing playground example."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM playground_examples WHERE id = ?", (example_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="المثال غير موجود")

        updates = []
        params = []

        if req.type is not None:
            updates.append("type = ?")
            params.append(req.type.strip().lower())
        if req.category is not None:
            updates.append("category = ?")
            params.append(req.category.strip().lower())
        if req.title is not None:
            updates.append("title = ?")
            params.append(req.title.strip())
        if req.description is not None:
            updates.append("description = ?")
            params.append(req.description)
        if req.difficulty is not None:
            updates.append("difficulty = ?")
            params.append(req.difficulty)
        if req.instructions is not None:
            updates.append("instructions = ?")
            params.append(req.instructions)
        if req.initial_code is not None:
            updates.append("initial_code = ?")
            params.append(req.initial_code)
        if req.expected_output is not None:
            updates.append("expected_output = ?")
            params.append(req.expected_output)
        if req.is_published is not None:
            updates.append("is_published = ?")
            params.append(1 if req.is_published else 0)
        if req.order_index is not None:
            updates.append("order_index = ?")
            params.append(req.order_index)

        if not updates:
            return {"success": True, "message": "لم يتم تقديم تعديلات", "example": dict(existing)}

        updates.append("updated_at = ?")
        params.append(now)
        params.append(example_id)

        cursor.execute(f"UPDATE playground_examples SET {', '.join(updates)} WHERE id = ?", params)

        log_activity(
            user_id=admin.get("id"),
            user_name=admin.get("name"),
            user_role=admin.get("role"),
            action="UPDATE_PLAYGROUND_EXAMPLE",
            target_type="PLAYGROUND_EXAMPLE",
            target_id=example_id,
            target_name=existing.get("title"),
            conn=conn
        )

        cursor.execute("SELECT * FROM playground_examples WHERE id = ?", (example_id,))
        updated = dict(cursor.fetchone())
        return {"success": True, "message": "تم تحديث بيانات المثال بنجاح", "example": updated}


@playground_router.delete("/admin/examples/{example_id}")
def admin_delete_example(
    example_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Permanently delete a playground example from database."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM playground_examples WHERE id = ?", (example_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المثال غير موجود")

        cursor.execute("DELETE FROM playground_examples WHERE id = ?", (example_id,))

        log_activity(
            user_id=admin.get("id"),
            user_name=admin.get("name"),
            user_role=admin.get("role"),
            action="DELETE_PLAYGROUND_EXAMPLE",
            target_type="PLAYGROUND_EXAMPLE",
            target_id=example_id,
            target_name=row.get("title"),
            conn=conn
        )
        return {"success": True, "message": "تم حذف المثال نهائياً من قاعدة البيانات"}


@playground_router.patch("/admin/examples/{example_id}/publish")
def admin_toggle_example_publish(
    example_id: str,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Toggle publication status of playground example."""
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, is_published FROM playground_examples WHERE id = ?", (example_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="المثال غير موجود")

        new_status = 0 if row["is_published"] == 1 else 1
        cursor.execute("UPDATE playground_examples SET is_published = ?, updated_at = ? WHERE id = ?", (new_status, now, example_id))

        status_text = "تم نشر المثال" if new_status else "تم إخفاء المثال"
        return {"success": True, "is_published": bool(new_status), "message": status_text}


def seed_playground_examples_if_empty(db, now: str):
    """Seed default playground examples across Python, Web, and Cyber Security if table is empty."""
    try:
        cur = db.execute("SELECT count(*) as cnt FROM playground_examples").fetchone()
        count = cur["cnt"] if isinstance(cur, dict) else (cur[0] if cur else 0)
        if count > 0:
            return
    except Exception as e:
        return

    examples = [
        # 1. PYTHON EXAMPLES
        {
            "id": "pg_py_1",
            "type": "python",
            "category": "basics",
            "title": "أساسيات المتغيرات والإدخال والطباعة",
            "description": "برنامج تمهيدي لتعلم كيفية استقبال اسم وسنة ميلاد الطالب وحساب عمره وطباعة رسالة ترحيبية.",
            "difficulty": "beginner",
            "instructions": "قم بتعريف المتغيرات، واستقبل المدخلات عبر input()، واطبع النتيجة باستخدام print() المنسقة.",
            "initial_code": "# أساسيات الإدخال والطباعة في بايثون\nname = \"أحمد محمد\"\nbirth_year = 2008\ncurrent_year = 2026\nage = current_year - birth_year\n\nprint(f\"مرحبًا بك يا {name} في منصة Code Spark! 🚀\")\nprint(f\"سنة ميلادك: {birth_year}\")\nprint(f\"عمرك المحسوب: {age} سنة\")\nprint(f\"نوع بيانات الاسم: {type(name).__name__}\")\nprint(f\"نوع بيانات العمر: {type(age).__name__}\")\n",
            "expected_output": "مرحبًا بك يا أحمد محمد في منصة Code Spark!",
            "order_index": 1
        },
        {
            "id": "pg_py_2",
            "type": "python",
            "category": "conditionals",
            "title": "الجمل الشرطية وحساب التقديرات المدرسية",
            "description": "تطبيق على جمل if / elif / else لتقييم درجات الطالب وإظهار التقدير الأكاديمي المناسب.",
            "difficulty": "beginner",
            "instructions": "اختبر المتغير score مع شروط مختلفة واطبع التقدير المناسب (ممتاز، جيد جدًا، جيد، مقبول، راسب).",
            "initial_code": "# برنامج حساب تقدير الطالب\nscore = 88.5\n\nprint(f\"درجة الطالب: {score} من 100\")\n\nif score >= 90:\n    grade = \"ممتاز (A) 🌟\"\nelif score >= 75:\n    grade = \"جيد جدًا (B) 👍\"\nelif score >= 65:\n    grade = \"جيد (C) 👌\"\nelif score >= 50:\n    grade = \"مقبول (D) ⚠️\"\nelse:\n    grade = \"راسب (F) ❌\"\n\nprint(f\"التقدير النهائي: {grade}\")\n",
            "expected_output": "التقدير النهائي: جيد جدًا",
            "order_index": 2
        },
        {
            "id": "pg_py_3",
            "type": "python",
            "category": "loops",
            "title": "حلقات التكرار وتوليد جداول الضرب",
            "description": "استخدام حلقة for مع دالة range() لطباعة جدول الضرب بدقة وسرعة.",
            "difficulty": "beginner",
            "instructions": "استخدم حلقة for مع range(1, 11) واطبع عمليات الضرب.",
            "initial_code": "# برنامج طباعة جدول الضرب\nnumber = 7\nprint(f\"=== جدول ضرب الرقم {number} ===\")\n\nfor i in range(1, 11):\n    result = number * i\n    print(f\"{number} × {i:2d} = {result:2d}\")\n\nprint(\"تمت طباعة الجدول بنجاح! 🎉\")\n",
            "expected_output": "7 × 10 = 70",
            "order_index": 3
        },
        {
            "id": "pg_py_4",
            "type": "python",
            "category": "lists",
            "title": "معالجة القوائم والإحصاءات الرياضية",
            "description": "تحليل قائمة درجات الطلاب وحساب أعلى وأدنى درجة والمتوسط ومجموع الدرجات.",
            "difficulty": "intermediate",
            "instructions": "استخدم الدوال المدمجة max, min, sum, len لمعالجة القوائم.",
            "initial_code": "# تحليل قائمة الدرجات\nscores = [85, 92, 78, 64, 99, 88, 73, 90]\n\nprint(\"قائمة الدرجات:\", scores)\nprint(\"عدد الطلاب:\", len(scores))\nprint(\"أعلى درجة:\", max(scores))\nprint(\"أدنى درجة:\", min(scores))\nprint(\"مجموع الدرجات:\", sum(scores))\nprint(f\"متوسط الدرجات: {sum(scores) / len(scores):.2f}\")\n",
            "expected_output": "أعلى درجة: 99",
            "order_index": 4
        },
        {
            "id": "pg_py_5",
            "type": "python",
            "category": "functions",
            "title": "دالة فحص الأعداد الأولية (Prime Numbers)",
            "description": "بناء دالة برمجية مخصصة def تفحص هل العدد أولي أم لا وتعيد True أو False.",
            "difficulty": "intermediate",
            "instructions": "عرّف الدالة باستخدام الكلمة المحجوزة def واستخدم return لإرجاع النتيجة.",
            "initial_code": "def is_prime(n):\n    if n <= 1:\n        return False\n    for i in range(2, int(n ** 0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\ntest_numbers = [2, 3, 4, 7, 10, 13, 17, 20, 29]\nfor num in test_numbers:\n    status = \"أولي (Prime)\" if is_prime(num) else \"غير أولي\"\n    print(f\"العدد {num:2d}: {status}\")\n",
            "expected_output": "العدد  7: أولي (Prime)",
            "order_index": 5
        },

        # 2. WEB DEVELOPMENT EXAMPLES
        {
            "id": "pg_web_1",
            "type": "web",
            "category": "components",
            "title": "بطاقة تعريفية تفاعلية حديثة (Modern Glow Card)",
            "description": "تصميم بطاقة واجهة مستخدم بألوان نيون عصرية مع تأثيرات CSS وظلال متوهجة وزر تفاعلي.",
            "difficulty": "beginner",
            "instructions": "عدّل نصوص الـ HTML أو غيّر تدرجات ألوان الـ CSS ولاحظ التحديث المباشر.",
            "initial_code": json.dumps({
                "html": "<div class=\"card\">\n  <h2>مرحبًا بكم في Code Spark! 🚀</h2>\n  <p>أول منصة برمجية تفاعلية لطلاب المرحلة الثانوية.</p>\n  <button id=\"btn\" class=\"glow-btn\">اضغط للتفاعل ✨</button>\n  <div id=\"output\" class=\"msg\"></div>\n</div>",
                "css": "body {\n  font-family: sans-serif;\n  background: #0B132B;\n  color: #fff;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 90vh;\n  margin: 0;\n  direction: rtl;\n}\n.card {\n  background: #1C2541;\n  padding: 2rem;\n  border-radius: 16px;\n  box-shadow: 0 8px 24px rgba(0,0,0,0.4);\n  text-align: center;\n  border: 1px solid #00F0FF;\n  max-width: 380px;\n}\nh2 { color: #00F0FF; margin-top: 0; }\np { color: #94A3B8; font-size: 0.95rem; }\n.glow-btn {\n  background: linear-gradient(135deg, #00F0FF, #0077B6);\n  color: #000;\n  font-weight: bold;\n  border: none;\n  padding: 0.75rem 1.5rem;\n  border-radius: 8px;\n  cursor: pointer;\n  font-size: 1rem;\n}\n.msg {\n  margin-top: 1.25rem;\n  font-size: 1.1rem;\n  font-weight: bold;\n  color: #48CAE4;\n}",
                "js": "const btn = document.getElementById('btn');\nconst output = document.getElementById('output');\nlet count = 0;\n\nbtn.addEventListener('click', () => {\n  count++;\n  output.textContent = '🎉 أحسنت! ضغطت على الزر ' + count + ' مرات.';\n  console.log('تم النقر على الزر! العداد:', count);\n});"
            }, ensure_ascii=False),
            "expected_output": "بطاقة نيون تفاعلية مع عداد نقرات",
            "order_index": 1
        },
        {
            "id": "pg_web_2",
            "type": "web",
            "category": "interactive",
            "title": "عداد نقرات تفاعلي (Interactive Counter)",
            "description": "تطبيق عداد أرقام كامل مع أزرار الزيادة والنقصان وإعادة التعيين والتحديث الفوري.",
            "difficulty": "beginner",
            "instructions": "اربط أحداث النقر click مع تعديل قيمة العداد في الـ DOM.",
            "initial_code": json.dumps({
                "html": "<div class=\"counter-box\">\n  <h3>🔢 عداد النقرات التفاعلي</h3>\n  <div id=\"count-display\" class=\"number\">0</div>\n  <div class=\"actions\">\n    <button id=\"inc-btn\" class=\"btn\">+</button>\n    <button id=\"reset-btn\" class=\"btn reset\">إعادة</button>\n    <button id=\"dec-btn\" class=\"btn\">-</button>\n  </div>\n</div>",
                "css": "body {\n  background: #0f172a;\n  color: #f8fafc;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 90vh;\n  margin: 0;\n  font-family: sans-serif;\n  direction: rtl;\n}\n.counter-box {\n  background: #1e293b;\n  padding: 2rem 2.5rem;\n  border-radius: 12px;\n  text-align: center;\n  box-shadow: 0 10px 25px rgba(0,0,0,0.5);\n  border: 1px solid #38bdf8;\n}\n.number {\n  font-size: 4rem;\n  font-weight: 800;\n  color: #38bdf8;\n  margin: 1rem 0;\n}\n.actions {\n  display: flex;\n  gap: 0.75rem;\n  justify-content: center;\n}\n.btn {\n  background: #38bdf8;\n  color: #0f172a;\n  border: none;\n  font-size: 1.5rem;\n  width: 50px;\n  height: 50px;\n  border-radius: 8px;\n  cursor: pointer;\n  font-weight: bold;\n}\n.btn.reset {\n  width: auto;\n  padding: 0 1.25rem;\n  font-size: 1rem;\n  background: #64748b;\n  color: #fff;\n}",
                "js": "let count = 0;\nconst display = document.getElementById('count-display');\n\ndocument.getElementById('inc-btn').addEventListener('click', () => {\n  count++;\n  display.textContent = count;\n});\n\ndocument.getElementById('dec-btn').addEventListener('click', () => {\n  count--;\n  display.textContent = count;\n});\n\ndocument.getElementById('reset-btn').addEventListener('click', () => {\n  count = 0;\n  display.textContent = count;\n});"
            }, ensure_ascii=False),
            "expected_output": "تطبيق عداد أرقام تفاعلي",
            "order_index": 2
        },
        {
            "id": "pg_web_3",
            "type": "web",
            "category": "apps",
            "title": "آلة حاسبة سريعة (Mini Calculator)",
            "description": "آلة حاسبة رياضية بسيطة تدعم العمليات الحسابية الأربع والتعامل مع المدخلات الرقمية.",
            "difficulty": "intermediate",
            "instructions": "استقبل الأعداد والعملية الحسابية واحسب النتيجة واعرضها في خانة النتيجة.",
            "initial_code": json.dumps({
                "html": "<div class=\"calc-box\">\n  <h3>⚡ آلة حاسبة سريعة</h3>\n  <input type=\"number\" id=\"num1\" placeholder=\"العدد الأول\" value=\"12\" />\n  <select id=\"op\">\n    <option value=\"+\">جمع (+)</option>\n    <option value=\"-\">طرح (-)</option>\n    <option value=\"*\">ضرب (×)</option>\n    <option value=\"/\">قسمة (÷)</option>\n  </select>\n  <input type=\"number\" id=\"num2\" placeholder=\"العدد الثاني\" value=\"4\" />\n  <button id=\"calc-btn\">احسب الناتج</button>\n  <div id=\"result-box\" class=\"result\">النتيجة = 16</div>\n</div>",
                "css": "body {\n  background: #18181b;\n  color: #f4f4f5;\n  font-family: sans-serif;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  height: 90vh;\n  margin: 0;\n  direction: rtl;\n}\n.calc-box {\n  background: #27272a;\n  padding: 1.75rem;\n  border-radius: 12px;\n  text-align: center;\n  width: 320px;\n  border: 1px solid #10b981;\n}\ninput, select, button {\n  width: 100%;\n  padding: 0.65rem;\n  margin: 0.4rem 0;\n  border-radius: 6px;\n  border: 1px solid #3f3f46;\n  background: #18181b;\n  color: #fff;\n  font-size: 1rem;\n  box-sizing: border-box;\n}\nbutton {\n  background: #10b981;\n  color: #000;\n  font-weight: bold;\n  cursor: pointer;\n  border: none;\n  margin-top: 0.8rem;\n}\n.result {\n  margin-top: 1rem;\n  font-size: 1.2rem;\n  font-weight: bold;\n  color: #34d399;\n}",
                "js": "document.getElementById('calc-btn').addEventListener('click', () => {\n  const n1 = parseFloat(document.getElementById('num1').value) || 0;\n  const n2 = parseFloat(document.getElementById('num2').value) || 0;\n  const op = document.getElementById('op').value;\n  let res = 0;\n  if (op === '+') res = n1 + n2;\n  else if (op === '-') res = n1 - n2;\n  else if (op === '*') res = n1 * n2;\n  else if (op === '/') res = n2 !== 0 ? (n1 / n2) : 'غير معرّف (قسمة على صفر)';\n  document.getElementById('result-box').textContent = 'النتيجة = ' + res;\n});"
            }, ensure_ascii=False),
            "expected_output": "آلة حاسبة رقمية سريعة",
            "order_index": 3
        },

        # 3. CYBER SECURITY LAB EXAMPLES
        {
            "id": "pg_sec_1",
            "type": "cyber_security",
            "category": "linux_basics",
            "title": "استكشاف بيئة النظام والمستخدم (Linux System Discovery)",
            "description": "فحص هوية المستخدم الحالي، ومواصفات نواة النظام، ومسار العمل والملفات المتاحة.",
            "difficulty": "beginner",
            "instructions": "نفّذ أوامر من مثل uname و whoami و pwd و ls لاستكشاف بيئة نظام لينكس.",
            "initial_code": "uname -a && whoami && id && pwd && ls -la",
            "expected_output": "معلومات نظام لينكس والمستخدم والدليل الحالي",
            "order_index": 1
        },
        {
            "id": "pg_sec_2",
            "type": "cyber_security",
            "category": "permissions",
            "title": "فحص وتعديل صلاحيات الملفات (File Permissions & chmod)",
            "description": "التحقق من صلاحيات الملفات الممنوحة للمالك والمجموعة والآخرين وتأمين ملف حساس بأمر chmod.",
            "difficulty": "beginner",
            "instructions": "استعرض الصلاحيات باستخدام ls -l ثم قم بتغيير صلاحيات الملف لتصبح مقصورة على المالك فقط.",
            "initial_code": "ls -l /training/permissions_demo.txt && chmod 600 /training/permissions_demo.txt && ls -l /training/permissions_demo.txt",
            "expected_output": "تحديث أذونات الملف إلى -rw------- (600)",
            "order_index": 2
        },
        {
            "id": "pg_sec_3",
            "type": "cyber_security",
            "category": "cryptography",
            "title": "توليد ومقارنة قيم التجزئة المشفرة (Hashing with MD5 & SHA-256)",
            "description": "استخدام دوال التجزئة الرياضية لتأكيد سلامة الملفات وبصمات كلمات المرور المشفرة.",
            "difficulty": "intermediate",
            "instructions": "احسب تجزئة كلمة سر ثم اقرأ قيم التجزئة المسجلة في ملف التدريب.",
            "initial_code": "echo -n 'CodeSpark2026' | sha256sum && echo -n 'admin' | md5sum && cat /training/hashes.txt",
            "expected_output": "بصمات التجزئة المشفرة SHA-256 و MD5",
            "order_index": 3
        },
        {
            "id": "pg_sec_4",
            "type": "cyber_security",
            "category": "cryptography",
            "title": "فك تشفير البيانات المشفرة بـ Base64 (Base64 Decoding)",
            "description": "قراءة نص مشفر بتنسيق Base64 واستخراج الكلمة السرية المحمية بداخله عبر الأنابيب.",
            "difficulty": "beginner",
            "instructions": "استعرض الملف المشفر ثم فك تشفيره باستخدام base64 -d.",
            "initial_code": "cat /training/secret_encoded.txt && cat /training/secret_encoded.txt | base64 -d",
            "expected_output": "CodeSpark_Security_Lab_2026",
            "order_index": 4
        },
        {
            "id": "pg_sec_5",
            "type": "cyber_security",
            "category": "processes",
            "title": "مراقبة العمليات وإدارة مهام النظام (Process Inspection)",
            "description": "عرض قائمة العمليات النشطة في النظام ومراقبة البرامج المشبوهة أو الزائدة.",
            "difficulty": "intermediate",
            "instructions": "استعرض العمليات باستخدام ps aux وتعرّف على أرقام تعريف العمليات PIDs.",
            "initial_code": "ps aux",
            "expected_output": "جدول بالعمليات النشطة وأرقام المعرفات PID",
            "order_index": 5
        },
        {
            "id": "pg_sec_6",
            "type": "cyber_security",
            "category": "networking",
            "title": "فحص المنافذ والاتصالات النشطة (Listening Ports - netstat)",
            "description": "معرفة أرقام المنافذ المفتوحة التي يستمع إليها الخادم مثل منفذ 80 و 22 و 8080.",
            "difficulty": "intermediate",
            "instructions": "نفّذ أمر netstat -tuln لعرض المنافذ المفتوحة وبروتوكولاتها.",
            "initial_code": "netstat -tuln",
            "expected_output": "قائمة بالمنافذ المفتوحة 80 و 22 و 8080",
            "order_index": 6
        },
        {
            "id": "pg_sec_7",
            "type": "cyber_security",
            "category": "log_analysis",
            "title": "تحليل سجلات الأمان واكتشاف هجمات التخمين (Log Analysis)",
            "description": "البحث في سجلات المصادقة auth.log واكتشاف محاولات الدخول الخاطئة وأرقام عناوين الـ IP للمهاجمين.",
            "difficulty": "intermediate",
            "instructions": "استخدم أمر grep للبحث عن كلمة 'Failed' في سجل الدخول واستعرض النتائج.",
            "initial_code": "grep 'Failed' /var/log/auth.log",
            "expected_output": "عرض محاولات الدخول الفاشلة وعناوين الـ IP المهاجمة",
            "order_index": 7
        },
        {
            "id": "pg_sec_8",
            "type": "cyber_security",
            "category": "web_security",
            "title": "فحص رؤوس أمان HTTP لخادم الويب (Security Headers Inspection)",
            "description": "إرسال طلب HEAD للخادم باستخدام curl -I لفحص رؤوس الحماية مثل CSP و X-Frame-Options و HSTS.",
            "difficulty": "intermediate",
            "instructions": "استعلم الخادم باستخدام curl -I واقرأ رؤوس الاستجابة الأمنية.",
            "initial_code": "curl -I http://training.local",
            "expected_output": "رؤوس الأمان: X-Content-Type-Options, X-Frame-Options, HSTS",
            "order_index": 8
        },
        {
            "id": "pg_sec_9",
            "type": "cyber_security",
            "category": "reconnaissance",
            "title": "استعلام سجلات الـ DNS واستطلاع النطاقات (DNS Reconnaissance)",
            "description": "استخدام أدوات dig و nslookup لاستعلام خوادم أسماء النطاقات ومعرفة عناوين IP المستهدفة.",
            "difficulty": "beginner",
            "instructions": "استعلم عن سجلات النطاق التدريبي training.local.",
            "initial_code": "dig training.local && nslookup training.local",
            "expected_output": "سجلات الـ DNS المرتبطة بالنطاق",
            "order_index": 9
        },
        {
            "id": "pg_sec_10",
            "type": "cyber_security",
            "category": "reconnaissance",
            "title": "فحص المنافذ والخدمات المحاكية (Educational Port Scan - nmap)",
            "description": "إجراء فحص أمني محاكي لمنافذ الخادم لاكتشاف الخدمات المفتوحة وإصداراتها.",
            "difficulty": "advanced",
            "instructions": "نفّذ أمر nmap 127.0.0.1 وافحص حالة المنافذ.",
            "initial_code": "nmap 127.0.0.1",
            "expected_output": "قائمة بالمنافذ المفتوحة 22/tcp, 80/tcp",
            "order_index": 10
        }
    ]

    for eg in examples:
        try:
            db.execute("""
            INSERT OR IGNORE INTO playground_examples (
                id, type, category, title, description, difficulty,
                instructions, initial_code, expected_output,
                is_published, order_index, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """, (
                eg["id"],
                eg["type"],
                eg["category"],
                eg["title"],
                eg["description"],
                eg["difficulty"],
                eg["instructions"],
                eg["initial_code"],
                eg["expected_output"],
                eg["order_index"],
                now,
                now
            ))
        except Exception as e:
            pass
