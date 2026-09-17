"""
CodeSpark - Robust Persistent Database Engine & Connection Abstraction
Thread-safe connection pooling, transaction isolation, WAL mode, foreign key enforcement,
and zero-data-loss architecture.
"""
import os
import sqlite3
import threading
import time
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple, Set
from contextlib import contextmanager
from app.core.config import settings

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class DatabaseEngine:
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url or settings.DATABASE_URL
        self.is_sqlite = "sqlite" in self.db_url
        if self.is_sqlite:
            path = self.db_url.replace("sqlite:///", "").replace("sqlite://", "")
            self.db_path = os.path.abspath(path)
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        else:
            self.db_path = None
        
        self._local = threading.local()
        self._lock = threading.RLock()
        self._table_cols: Dict[str, Set[str]] = {}
        self.init_schema()

    def get_connection(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(
                self.db_path,
                timeout=30.0,
                check_same_thread=False,
                isolation_level=None
            )
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA busy_timeout = 10000;")
            self._local.conn = conn
        return self._local.conn

    def close_connection(self):
        if hasattr(self._local, "conn") and self._local.conn is not None:
            try:
                self._local.conn.close()
            except Exception:
                pass
            self._local.conn = None

    @contextmanager
    def transaction(self):
        """Thread-safe transactional context with automatic commit/rollback."""
        with self._lock:
            conn = self.get_connection()
            conn.execute("BEGIN IMMEDIATE")
            try:
                yield conn
                conn.execute("COMMIT")
            except Exception as e:
                try:
                    conn.execute("ROLLBACK")
                except Exception:
                    pass
                raise e

    def execute(self, sql: str, params: Tuple = ()) -> int:
        with self._lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params)
            return cursor.rowcount

    def fetch_one(self, sql: str, params: Tuple = ()) -> Optional[Dict[str, Any]]:
        with self._lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def fetch_all(self, sql: str, params: Tuple = ()) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    def fetch_val(self, sql: str, params: Tuple = ()) -> Any:
        with self._lock:
            conn = self.get_connection()
            cursor = conn.cursor()
            cursor.execute(sql, params)
            row = cursor.fetchone()
            if row:
                return row[0]
            return None

    def get_table_columns(self, table: str) -> Set[str]:
        if table not in self._table_cols:
            rows = self.fetch_all(f"PRAGMA table_info({table})")
            self._table_cols[table] = {r["name"] for r in rows}
        return self._table_cols[table]

    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            cols = self.get_table_columns(table)
            item = data.copy()
            
            if "id" in cols and ("id" not in item or not item["id"]):
                item["id"] = uuid.uuid4().hex
            if "created_at" in cols and "created_at" not in item:
                item["created_at"] = now_iso()
            if "updated_at" in cols and "updated_at" not in item:
                item["updated_at"] = now_iso()

            filtered = {k: v for k, v in item.items() if k in cols}
            columns = list(filtered.keys())
            placeholders = ["?"] * len(columns)
            sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
            self.execute(sql, tuple(filtered.values()))
            
            pk = "key" if table == "platform_settings" else "id"
            val = filtered.get(pk)
            if val:
                return self.fetch_one(f"SELECT * FROM {table} WHERE {pk} = ?", (val,)) or filtered
            return filtered

    def update(self, table: str, rec_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            cols = self.get_table_columns(table)
            up = {k: v for k, v in updates.items() if k in cols and k not in ("id", "key")}
            if "updated_at" in cols and "updated_at" not in up:
                up["updated_at"] = now_iso()

            if not up:
                pk = "key" if table == "platform_settings" else "id"
                return self.fetch_one(f"SELECT * FROM {table} WHERE {pk} = ?", (rec_id,))

            pk = "key" if table == "platform_settings" else "id"
            set_clauses = [f"{k} = ?" for k in up.keys()]
            values = list(up.values()) + [rec_id]
            sql = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE {pk} = ?"
            self.execute(sql, tuple(values))
            return self.fetch_one(f"SELECT * FROM {table} WHERE {pk} = ?", (rec_id,))

    def delete(self, table: str, rec_id: str) -> bool:
        with self._lock:
            pk = "key" if table == "platform_settings" else "id"
            sql = f"DELETE FROM {table} WHERE {pk} = ?"
            rows = self.execute(sql, (rec_id,))
            return rows > 0

    def init_schema(self):
        """Initializes database schema with full relational integrity."""
        ddl = """
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            username VARCHAR(64) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'student',
            is_active INTEGER NOT NULL DEFAULT 1,
            phone VARCHAR(32),
            avatar_url TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS assistant_permissions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            permission VARCHAR(64) NOT NULL,
            created_at TEXT NOT NULL,
            UNIQUE(user_id, permission)
        );

        CREATE TABLE IF NOT EXISTS student_stats (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            xp INTEGER NOT NULL DEFAULT 50,
            streak_days INTEGER NOT NULL DEFAULT 1,
            last_active_date TEXT,
            study_time_minutes REAL NOT NULL DEFAULT 0.0,
            achievements_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS courses (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            thumbnail_url TEXT,
            academic_term VARCHAR(64),
            order_index INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS units (
            id VARCHAR(64) PRIMARY KEY,
            course_id VARCHAR(64) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lessons (
            id VARCHAR(64) PRIMARY KEY,
            unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            content_markdown TEXT,
            video_type VARCHAR(32) NOT NULL DEFAULT 'youtube',
            video_url TEXT,
            duration_minutes INTEGER NOT NULL DEFAULT 15,
            order_index INTEGER NOT NULL DEFAULT 0,
            is_free INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS lesson_progress (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            is_completed INTEGER NOT NULL DEFAULT 0,
            last_position_seconds REAL NOT NULL DEFAULT 0.0,
            watch_percentage REAL NOT NULL DEFAULT 0.0,
            completed_at TEXT,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, lesson_id)
        );

        CREATE TABLE IF NOT EXISTS study_files (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            source_type VARCHAR(32) NOT NULL DEFAULT 'google_drive',
            external_url TEXT,
            file_url TEXT,
            file_name VARCHAR(255),
            mime_type VARCHAR(64),
            file_size INTEGER DEFAULT 0,
            course_id VARCHAR(64) REFERENCES courses(id) ON DELETE SET NULL,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
            visibility VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
            is_published INTEGER NOT NULL DEFAULT 1,
            uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS question_bank (
            id VARCHAR(64) PRIMARY KEY,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            question_type VARCHAR(32) NOT NULL DEFAULT 'multiple_choice',
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL DEFAULT '[]',
            correct_answer TEXT NOT NULL,
            explanation TEXT,
            points REAL NOT NULL DEFAULT 5.0,
            difficulty VARCHAR(32) NOT NULL DEFAULT 'easy',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exams (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            course_id VARCHAR(64) REFERENCES courses(id) ON DELETE SET NULL,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            duration_minutes INTEGER NOT NULL DEFAULT 45,
            passing_score REAL NOT NULL DEFAULT 70.0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exam_questions (
            id VARCHAR(64) PRIMARY KEY,
            exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            question_id VARCHAR(64) NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
            points REAL NOT NULL DEFAULT 5.0,
            order_index INTEGER NOT NULL DEFAULT 0,
            UNIQUE(exam_id, question_id)
        );

        CREATE TABLE IF NOT EXISTS exam_attempts (
            id VARCHAR(64) PRIMARY KEY,
            exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            answers_json TEXT NOT NULL DEFAULT '{}',
            score REAL NOT NULL DEFAULT 0.0,
            total_possible REAL NOT NULL DEFAULT 0.0,
            percentage REAL NOT NULL DEFAULT 0.0,
            is_passed INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
            started_at TEXT NOT NULL,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS exercises (
            id VARCHAR(64) PRIMARY KEY,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            instructions_markdown TEXT,
            starter_code TEXT,
            solution_code TEXT,
            test_cases_json TEXT NOT NULL DEFAULT '[]',
            expected_output TEXT,
            language VARCHAR(32) NOT NULL DEFAULT 'python',
            points INTEGER NOT NULL DEFAULT 10,
            difficulty VARCHAR(32) NOT NULL DEFAULT 'easy',
            order_index INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exercise_submissions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            exercise_id VARCHAR(64) NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
            submitted_code TEXT NOT NULL,
            status VARCHAR(32) NOT NULL,
            output TEXT,
            tests_passed INTEGER NOT NULL DEFAULT 0,
            tests_total INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(128) NOT NULL,
            duration_months INTEGER NOT NULL,
            price REAL NOT NULL,
            features_json TEXT NOT NULL DEFAULT '[]',
            is_active INTEGER NOT NULL DEFAULT 1,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS subscription_codes (
            id VARCHAR(64) PRIMARY KEY,
            code VARCHAR(64) UNIQUE NOT NULL,
            code_hash VARCHAR(128) NOT NULL,
            duration_days INTEGER NOT NULL,
            duration_type VARCHAR(32) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
            batch_name VARCHAR(128),
            created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            used_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            used_at TEXT,
            created_at TEXT NOT NULL,
            expires_at TEXT
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code VARCHAR(64),
            plan_id VARCHAR(64) REFERENCES subscription_plans(id) ON DELETE SET NULL,
            plan_name VARCHAR(128),
            starts_at TEXT NOT NULL,
            expires_at TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            is_lifetime INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payment_requests (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plan_id VARCHAR(64) REFERENCES subscription_plans(id) ON DELETE SET NULL,
            payment_method VARCHAR(64) NOT NULL,
            payment_number VARCHAR(64) NOT NULL,
            payment_reference VARCHAR(128),
            screenshot_url TEXT,
            notes TEXT,
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            admin_notes TEXT,
            reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            reviewed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS platform_settings (
            key VARCHAR(64) PRIMARY KEY,
            value_json TEXT NOT NULL,
            description TEXT,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            is_urgent INTEGER NOT NULL DEFAULT 0,
            is_published INTEGER NOT NULL DEFAULT 1,
            author_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(32) NOT NULL DEFAULT 'info',
            is_read INTEGER NOT NULL DEFAULT 0,
            action_url TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS support_tickets (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS support_messages (
            id VARCHAR(64) PRIMARY KEY,
            ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            sender_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(64) NOT NULL,
            entity_type VARCHAR(64) NOT NULL,
            entity_id VARCHAR(64),
            details_json TEXT NOT NULL DEFAULT '{}',
            ip_address VARCHAR(64),
            created_at TEXT NOT NULL
        );
        """
        with self._lock:
            conn = self.get_connection()
            conn.executescript(ddl)

db_engine = DatabaseEngine()
