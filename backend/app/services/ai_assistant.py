"""
Code Spark - AI Coding Assistant & Educational Tutor Service
Provides intelligent pedagogical guidance, progressive hints, error diagnosis,
code completion, and refactoring without leaking API keys to the frontend.
"""
import os
import re
from typing import Dict, Any, Optional

class AIAssistantService:
    @staticmethod
    def analyze(
        action: str,
        code: str,
        language: str = "python",
        error_message: Optional[str] = None,
        student_question: Optional[str] = None
    ) -> Dict[str, Any]:
        lang = language.lower().strip()
        code_clean = code.strip()
        err = (error_message or "").strip()

        # 1. Action: Fix Error / Error Diagnosis
        if action in ("fix", "detect_error") or err:
            return AIAssistantService._diagnose_error(code_clean, lang, err)

        # 2. Action: Educational Hint (Step-by-Step without giving full solution immediately)
        if action == "hint":
            return AIAssistantService._generate_hint(code_clean, lang, student_question)

        # 3. Action: Explain Code
        if action == "explain":
            return AIAssistantService._explain_code(code_clean, lang)

        # 4. Action: Complete Code
        if action == "complete":
            return AIAssistantService._complete_code(code_clean, lang)

        # 5. Action: Improve Code / Best Practices
        if action == "improve":
            return AIAssistantService._improve_code(code_clean, lang)

        # Default fallback
        return {
            "success": True,
            "title": "المساعد البرمجي الذكي",
            "message": "حدد جزءاً من الكود أو اختر إجراءً من القائمة (شرح، تلميح، إصلاح خطأ، إكمال الكود).",
            "hint": "يمكنك الضغط على 'أعطني Hint' للحصول على مساعدة تدريجية لحل مشكلتك البرمجية.",
            "suggested_code": None
        }

    @staticmethod
    def _diagnose_error(code: str, lang: str, err: str) -> Dict[str, Any]:
        title = "تحليل وتشخيص الخطأ البرمجي"
        explanation = ""
        suggestion = ""
        suggested_code = None

        if "SyntaxError" in err or "syntax" in err.lower():
            explanation = "يوجد خطأ في بناء الجملة البرمجية (Syntax Error). غالباً ما يكون السبب نسيان نقطتين رأسيتين `:` في نهاية جملة if أو for أو def في بايثون، أو نسيان إغلاق قوس `)` أو علامة تنصيص."
            suggestion = "راجع السطر المشار إليه في رسالة الخطأ وتأكد من اكتمال الأقواس وعلامات الترقيم المطلوبة."
            # Attempt auto-fix for common missing colon
            lines = code.split("\n")
            fixed_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith(("if ", "elif ", "else", "for ", "while ", "def ", "class ")) and not stripped.endswith(":"):
                    fixed_lines.append(line + ":")
                else:
                    fixed_lines.append(line)
            suggested_code = "\n".join(fixed_lines)

        elif "IndentationError" in err:
            explanation = "خطأ في المسافات البادئة (IndentationError). في بايثون، الكود الموجود داخل الدوال والشروط والحلقات يجب أن يبدأ بمسافة بادئة موحدة (4 مسافات أو Tab)."
            suggestion = "تأكد أن جميع الأسطر التابعة لنفس الكتلة البرمجية تبدأ بنفس عدد المسافات."
            lines = code.split("\n")
            fixed_lines = []
            indent = False
            for line in lines:
                if indent and not line.startswith((" ", "\t")) and line.strip():
                    fixed_lines.append("    " + line)
                else:
                    fixed_lines.append(line)
                if line.strip().endswith(":"):
                    indent = True
            suggested_code = "\n".join(fixed_lines)

        elif "NameError" in err:
            match = re.search(r"name '(\w+)' is not defined", err)
            var_name = match.group(1) if match else "المتغير"
            explanation = f"خطأ عدم تعريف المتغير ({var_name}). يحاول البرنامج استخدام متغير أو دالة قبل تعريفها أو مع وجود خطأ إملائي في كتابة الاسم."
            suggestion = f"تأكد من كتابة اسم `{var_name}` بشكل مطابق، وحالة الأحرف (Capital/Small) متوافقة."

        elif "ReferenceError" in err:
            explanation = "خطأ في المرجع (ReferenceError) في جافا سكريبت: تم استدعاء متغير أو عنصر DOM غير معرّف في النطاق الحالي."
            suggestion = "تأكد من استخدام `document.getElementById` أو `document.querySelector` مع معرف موجود فعلياً في ملف HTML."

        elif "TypeError" in err:
            explanation = "خطأ في توافق أنواع البيانات (TypeError): تمت محاولة إجراء عملية حسابية أو دمج بين أنواع غير متوافقة (مثلاً جمع رقم مع نص `int + str`)."
            suggestion = "استخدم `str(num)` للتحويل إلى نص أو `int(text)` للتحويل إلى رقم صحيح قبل تنفيذ العملية."

        else:
            explanation = f"تم رصد خطأ أثناء التشغيل:\n{err or 'خطأ غير محدد'}"
            suggestion = "افحص قيم المتغيرات وطباعتها باستخدام print() أو console.log() لمعرفة السطر المتسبب في التوقف."

        return {
            "success": True,
            "title": title,
            "error_detected": bool(err),
            "explanation": explanation,
            "suggestion": suggestion,
            "suggested_code": suggested_code,
            "hint": "خطوة مقترحة: تأكد من قراءة رقم السطر الموضح في رسالة الخطأ لتحديد موضع التعديل بدقة."
        }

    @staticmethod
    def _generate_hint(code: str, lang: str, question: Optional[str]) -> Dict[str, Any]:
        # Educational Mode: Progressive hints without spoiling the whole answer
        hints = []
        if lang == "python":
            if "for " not in code and "while " not in code:
                hints.append("فكر في استخدام حلقة تكرار `for` للمرور على عناصر القائمة أو الأرقام.")
            if "def " not in code:
                hints.append("قم بتنظيم الكود داخل دالة باستخدام `def function_name(params):` لإعادة استخدامه.")
            if "return" not in code and "def " in code:
                hints.append("لا تنس استخدام كلمة `return` لإرجاع القيمة المحسوبة من الدالة.")
            if not hints:
                hints.append("أنت على الطريق الصحيح! تحقق من اختبار الكود مع مدخلات حدية (Edge Cases) مثل الصفر أو القيم السالبة.")
        elif lang in ("javascript", "html", "css", "web"):
            hints.append("تأكد من ربط ملف التنسيق `style.css` والسكربت `script.js` داخل وسم `<head>` أو قبل إغلاق `</body>`.")
            hints.append("استخدم `addEventListener('click', ...)` للاستماع إلى نقرات المستخدم وتنفيذ التفاعل المطلوب.")
        else:
            hints.append("قسّم المسألة إلى خطوات صغيرة: 1) استقبال المدخلات 2) المعالجة 3) إخراج النتيجة.")

        return {
            "success": True,
            "title": "💡 تلميح تعليمي (Educational Hint)",
            "explanation": "في الوضع التعليمي، نساعدك على التفكير خطوة بخطوة للوصول للحل بنفسك:",
            "hint": hints[0] if hints else "راجع خطوات الخوارزمية خطوة بخطوة.",
            "next_step": hints[1] if len(hints) > 1 else "جرّب كتابة الكود الآن واضغط على تشغيل.",
            "suggested_code": None
        }

    @staticmethod
    def _explain_code(code: str, lang: str) -> Dict[str, Any]:
        if not code:
            return {
                "success": True,
                "title": "شرح الكود",
                "explanation": "المحرر فارغ حالياً. اكتب أو الصق كوداً لشرحه بالتفصيل."
            }

        lines = [l.strip() for l in code.split("\n") if l.strip()]
        steps = []

        for l in lines[:8]: # explain key lines
            if l.startswith("def "):
                fn_name = l.split("(")[0].replace("def ", "")
                steps.append(f"• السطر `{l}`: يقوم بتعريف دالة برمجية جديدة باسم `{fn_name}`.")
            elif l.startswith("print(") or l.startswith("console.log("):
                steps.append(f"• السطر `{l}`: أمر إخراج يعرض النص أو المتغير على شاشة المخرجات (Console).")
            elif l.startswith("for ") or l.startswith("while "):
                steps.append(f"• السطر `{l}`: حلقة تكرار لتنفيذ كتلة برمجية عدة مرات متتالية.")
            elif l.startswith("if ") or l.startswith("elif ") or l.startswith("else"):
                steps.append(f"• السطر `{l}`: جملة شرطية تفحص تحقق شرط معين لاتخاذ القرار البرمجي.")
            elif "=" in l and not l.startswith("=="):
                var = l.split("=")[0].strip()
                steps.append(f"• السطر `{l}`: إسناد وتخزين قيمة في المتغير `{var}`.")

        summary = f"يقوم هذا الكود بلغة {lang.upper()} بتنفيذ المهام التالية:\n" + ("\n".join(steps) if steps else "كود برمجي تتابعي ينفذ العمليات المكتوبة بالترتيب.")

        return {
            "success": True,
            "title": "📖 الشرح المفصل للكود",
            "explanation": summary,
            "hint": "يمكنك تعديل المتغيرات وتجربة تشغيل الكود لمعاينة تغير النتائج لحظياً."
        }

    @staticmethod
    def _complete_code(code: str, lang: str) -> Dict[str, Any]:
        last_line = code.strip().split("\n")[-1].strip() if code.strip() else ""
        addition = ""

        if lang == "python":
            if last_line.startswith("def ") and last_line.endswith(":"):
                addition = "\n    # اكتب محتوى الدالة هنا\n    result = 0\n    return result"
            elif last_line.startswith("for ") and last_line.endswith(":"):
                addition = "\n    print(i)"
            elif last_line.startswith("if ") and last_line.endswith(":"):
                addition = "\n    print('تحقق الشرط')"
            else:
                addition = "\nprint('تم إكمال تنفيذ البرنامج')"
        elif lang in ("javascript", "web"):
            if "addEventListener" in last_line and not last_line.endswith("});"):
                addition = " => {\n  console.log('تم النقر!');\n});"
            else:
                addition = "\nconsole.log('Script execution completed.');"

        return {
            "success": True,
            "title": "⚡ إكمال الكود التلقائي",
            "explanation": "تم اقتراح الإكمال المنطقي للسطر الأخير:",
            "suggested_code": code + addition,
            "hint": "اضغط على [تطبيق على المحرر] لإدراج الكود المكتمل."
        }

    @staticmethod
    def _improve_code(code: str, lang: str) -> Dict[str, Any]:
        tips = [
            "• استخدم أسماء متغيرات واضحة ومعبرة عن المحتوى (مثل `student_score` بدلاً من `s`).",
            "• قسّم العمليات الطويلة والمعقدة إلى دوال صغيرة يؤدي كل منها وظيفة واحدة محددة (Single Responsibility).",
            "• أضف تعليقات توضيحية (Comments) فوق الأجزاء المعقدة لتسهيل القراءة والصيانة.",
            "• تأكد من معالجة الأخطاء المحتملة باستخدام `try-except` في بايثون أو `try-catch` في جافا سكريبت."
        ]
        return {
            "success": True,
            "title": "🚀 اقتراحات التحسين وأفضل الممارسات",
            "explanation": "\n".join(tips),
            "hint": "الكود النظيف والمقروء يوفر ساعات طويلة من تصحيح الأخطاء لاحقاً."
        }
