"""
Code Spark - Granular Assistant Permissions Definition & Management
"""
from typing import List, Dict

ASSISTANT_PERMISSIONS: Dict[str, str] = {
    "students.read": "عرض قائمة وبيانات الطلاب",
    "students.manage": "إدارة وتعديل حسابات الطلاب",
    "questions.read": "عرض بنك الأسئلة والتمارين",
    "questions.create": "إضافة أسئلة جديدة إلى بنك الأسئلة",
    "questions.edit": "تعديل الأسئلة الحالية",
    "questions.delete": "حذف وأرشفة الأسئلة",
    "exams.read": "عرض الامتحانات ونتائج الطلاب",
    "exams.create": "إنشاء وتكوين امتحانات جديدة",
    "exams.edit": "تعديل الامتحانات وجداولها",
    "exams.manage": "إدارة محاولات الطلاب والتصحيح اليدوي",
    "resources.manage": "إدارة ورفع المذكرات والملفات التعليمية",
    "subscriptions.generate": "توليد أكواد اشتراك جديدة",
    "subscriptions.view": "عرض حالة وسجلات الاشتراكات والأكواد",
    "support.manage": "إدارة والرد على تذاكر الدعم الفني"
}

ALL_PERMISSION_KEYS: List[str] = list(ASSISTANT_PERMISSIONS.keys())

def is_valid_permission(perm: str) -> bool:
    return perm in ASSISTANT_PERMISSIONS

def filter_valid_permissions(perms: List[str]) -> List[str]:
    return [p for p in perms if is_valid_permission(p)]
