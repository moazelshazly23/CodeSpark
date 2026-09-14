"""
Code Spark - Permission System & RBAC Constants
Defines assistant permissions and validation routines.
"""

from typing import Iterable, List, Optional, Set, Union

STUDENTS_READ = "students.read"
STUDENTS_MANAGE = "students.manage"

QUESTIONS_READ = "questions.read"
QUESTIONS_CREATE = "questions.create"
QUESTIONS_EDIT = "questions.edit"
QUESTIONS_DELETE = "questions.delete"

EXAMS_READ = "exams.read"
EXAMS_CREATE = "exams.create"
EXAMS_EDIT = "exams.edit"
EXAMS_MANAGE = "exams.manage"

RESOURCES_MANAGE = "resources.manage"

SUBSCRIPTIONS_GENERATE = "subscriptions.generate"
SUBSCRIPTIONS_VIEW = "subscriptions.view"

SUPPORT_MANAGE = "support.manage"

ALL_PERMISSIONS: Set[str] = {
    STUDENTS_READ,
    STUDENTS_MANAGE,
    QUESTIONS_READ,
    QUESTIONS_CREATE,
    QUESTIONS_EDIT,
    QUESTIONS_DELETE,
    EXAMS_READ,
    EXAMS_CREATE,
    EXAMS_EDIT,
    EXAMS_MANAGE,
    RESOURCES_MANAGE,
    SUBSCRIPTIONS_GENERATE,
    SUBSCRIPTIONS_VIEW,
    SUPPORT_MANAGE,
}

ROLE_ADMIN = "ADMIN"
ROLE_ASSISTANT = "ASSISTANT"
ROLE_STUDENT = "STUDENT"

ALL_ROLES: Set[str] = {ROLE_ADMIN, ROLE_ASSISTANT, ROLE_STUDENT}

def is_valid_permission(permission: str) -> bool:
    return permission in ALL_PERMISSIONS

def validate_permissions(permissions: Iterable[str]) -> bool:
    invalid = [p for p in permissions if p not in ALL_PERMISSIONS]
    if invalid:
        raise ValueError(f"Invalid permissions encountered: {invalid}")
    return True

def has_permission(
    required_permission: str,
    user_role: str,
    user_permissions: Optional[Union[List[str], Set[str]]] = None,
) -> bool:
    if user_role == ROLE_ADMIN:
        return True
    if user_role == ROLE_ASSISTANT:
        if not user_permissions:
            return False
        return required_permission in user_permissions
    return False
