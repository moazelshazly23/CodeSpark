"""
Code Spark - AI Coding Assistant Service
"""
from typing import Dict, Any

class AIAssistantService:
    @staticmethod
    def analyze_code(code: str, language: str = "python") -> Dict[str, Any]:
        tips = []
        if "print" not in code and language == "python":
            tips.append("تأكد من استخدام دالة print() لعرض المخرجات على الشاشة.")
        if ":" not in code and ("if" in code or "for" in code or "def" in code):
            tips.append("تذكر وضع النقطتين الرأسيتين (:) في نهاية جمل الشروط والحلقات والدوال في بايثون.")
        if not tips:
            tips.append("الكود يبدو جيداً ومنظماً. واصل التقدم!")
        return {
            "success": True,
            "title": "💡 اقتراحات المساعد الذكي Spark AI",
            "explanation": "\n".join(tips),
            "hint": "الكود النظيف والمقروء يوفر ساعات طويلة من تصحيح الأخطاء لاحقاً."
        }
