import ast
import io
import sys
import time
import json
import traceback
import datetime
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any

from ..database import get_db, log_activity
from ..dependencies import get_optional_user, get_current_student, check_student_subscription, get_active_student_or_admin, get_current_staff
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
