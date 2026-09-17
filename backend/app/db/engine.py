"""
Code Spark - Relational Database Engine
Production-Grade SQLite Implementation with Concurrency Control & WAL Mode
Zero Lock Contention Architecture - Compatible with Python 3.10 through 3.14
"""
import os
import sqlite3
import threading
import time
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from contextlib import contextmanager

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

DB_FILE = os.getenv("DB_PATH", "/tmp/codespark.db")

SCHEMA_DDL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(128) UNIQUE NOT NULL,
    hashed_password VARCHAR(256) NOT NULL,
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    is_active INTEGER NOT NULL DEFAULT 1,
    is_verified INTEGER NOT NULL DEFAULT 1,
    phone VARCHAR(32),
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assistant_permissions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    permission VARCHAR(64) NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, permission)
);

CREATE TABLE IF NOT EXISTS subscription_codes (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    code_hash VARCHAR(64) UNIQUE NOT NULL,
    duration_days INTEGER NOT NULL,
    duration_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    batch_name VARCHAR(128),
    created_by VARCHAR(64) NOT NULL,
    used_by VARCHAR(64),
    used_at TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    duration_months INTEGER NOT NULL,
    price FLOAT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    features_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    code VARCHAR(64),
    plan_id VARCHAR(64),
    plan_name VARCHAR(128),
    starts_at TEXT NOT NULL,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    academic_term VARCHAR(64),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    content_markdown TEXT,
    video_url TEXT,
    video_type VARCHAR(32) DEFAULT 'embed',
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_free INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    lesson_id VARCHAR(64) NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    watch_time_seconds INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS educational_resources (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64),
    title VARCHAR(128) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(32) NOT NULL,
    file_size_bytes INTEGER DEFAULT 0,
    is_downloadable INTEGER NOT NULL DEFAULT 1,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    instructions_markdown TEXT NOT NULL,
    starter_code TEXT,
    solution_code TEXT,
    language VARCHAR(32) NOT NULL DEFAULT 'python',
    test_cases_json TEXT NOT NULL DEFAULT '[]',
    expected_output TEXT,
    points INTEGER NOT NULL DEFAULT 10,
    difficulty VARCHAR(32) DEFAULT 'medium',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_submissions (
    id VARCHAR(64) PRIMARY KEY,
    exercise_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    submitted_code TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    total_tests INTEGER NOT NULL DEFAULT 0,
    output TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS question_bank (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64),
    question_type VARCHAR(32) NOT NULL,
    question_text TEXT NOT NULL,
    options_json TEXT NOT NULL DEFAULT '[]',
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    points INTEGER NOT NULL DEFAULT 1,
    difficulty VARCHAR(32) DEFAULT 'medium',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    lesson_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    passing_score INTEGER NOT NULL DEFAULT 60,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id VARCHAR(64) PRIMARY KEY,
    quiz_id VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    quiz_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    score FLOAT NOT NULL,
    total_points INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    passing_score INTEGER NOT NULL DEFAULT 60,
    start_time TEXT,
    end_time TEXT,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exam_attempts (
    id VARCHAR(64) PRIMARY KEY,
    exam_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    score FLOAT NOT NULL,
    total_points INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    started_at TEXT NOT NULL,
    submitted_at TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    lesson_id VARCHAR(64) NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'info',
    is_read INTEGER NOT NULL DEFAULT 0,
    action_url TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    is_urgent INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    author_id VARCHAR(64),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    subject VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    priority VARCHAR(32) NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_messages (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL,
    sender_id VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id VARCHAR(64),
    details_json TEXT,
    ip_address VARCHAR(64),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_stats (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) UNIQUE NOT NULL,
    xp INTEGER NOT NULL DEFAULT 50,
    streak_days INTEGER NOT NULL DEFAULT 1,
    last_active_date TEXT NOT NULL,
    study_time_minutes FLOAT NOT NULL DEFAULT 0.0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value_json TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_projects (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    files_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_files (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    source_type VARCHAR(32) NOT NULL DEFAULT 'upload',
    file_path TEXT,
    external_url TEXT,
    file_name VARCHAR(255),
    mime_type VARCHAR(128),
    file_size BIGINT DEFAULT 0,
    course_id VARCHAR(64),
    unit_id VARCHAR(64),
    lesson_id VARCHAR(64),
    visibility VARCHAR(32) NOT NULL DEFAULT 'PUBLIC',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    is_published INTEGER NOT NULL DEFAULT 1,
    uploaded_by VARCHAR(64),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS subscription_requests (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    student_name VARCHAR(128),
    student_email VARCHAR(128),
    phone VARCHAR(32) NOT NULL,
    plan_id VARCHAR(64),
    package_name VARCHAR(128) NOT NULL,
    duration_months INTEGER DEFAULT 1,
    amount FLOAT DEFAULT 0.0,
    payment_number VARCHAR(32),
    payment_method VARCHAR(64) DEFAULT 'InstaPay',
    payment_reference VARCHAR(128) NOT NULL,
    transfer_date TEXT,
    proof_file_url TEXT,
    status VARCHAR(32) DEFAULT 'PENDING',
    admin_notes TEXT,
    reviewed_by VARCHAR(64),
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sub_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_sub_plans_active ON subscription_plans(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_sub_requests_user ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_requests_status ON subscription_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson ON question_bank(lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_study_files_course ON study_files(course_id);
CREATE INDEX IF NOT EXISTS idx_study_files_unit ON study_files(unit_id);
"""

class RelationalDatabaseEngine:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or DB_FILE
        self._write_lock = threading.RLock()
        self._local = threading.local()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(
                self.db_path,
                timeout=60.0,
                check_same_thread=False
            )
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA busy_timeout = 60000;")
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("PRAGMA cache_size = -64000;")
            self._local.conn = conn
        return self._local.conn

    def _init_db(self):
        conn = sqlite3.connect(self.db_path, timeout=60.0)
        try:
            conn.execute("PRAGMA journal_mode = WAL;")
            conn.execute("PRAGMA busy_timeout = 60000;")
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            cur = conn.cursor()
            try:
                cur.executescript(SCHEMA_DDL)
                conn.commit()
                self._bootstrap_defaults(conn)
            finally:
                cur.close()
        finally:
            conn.close()

    def _bootstrap_defaults(self, init_conn: sqlite3.Connection):
        # 1. Ensure columns exist in subscription_requests
        try:
            cols = [r[1] for r in init_conn.execute("PRAGMA table_info(subscription_requests);").fetchall()]
            if "plan_id" not in cols:
                init_conn.execute("ALTER TABLE subscription_requests ADD COLUMN plan_id VARCHAR(64);")
            if "duration_months" not in cols:
                init_conn.execute("ALTER TABLE subscription_requests ADD COLUMN duration_months INTEGER DEFAULT 1;")
            if "payment_number" not in cols:
                init_conn.execute("ALTER TABLE subscription_requests ADD COLUMN payment_number VARCHAR(32);")
            init_conn.commit()
        except Exception:
            pass

        # 2. Seed default subscription plans if empty
        try:
            cur = init_conn.execute("SELECT COUNT(*) FROM subscription_plans")
            cnt = cur.fetchone()[0] or 0
            if cnt == 0:
                default_plans = [
                    ("plan_1m", "اشتراك شهري (شهر واحد)", 1, 100.0, 1),
                    ("plan_2m", "اشتراك شهرين (2 أشهر)", 2, 190.0, 2),
                    ("plan_3m", "اشتراك فصلي (3 أشهر)", 3, 270.0, 3),
                    ("plan_4m", "اشتراك 4 أشهر", 4, 350.0, 4),
                    ("plan_5m", "اشتراك 5 أشهر", 5, 425.0, 5),
                    ("plan_6m", "اشتراك نصف سنوي (6 أشهر)", 6, 500.0, 6),
                    ("plan_7m", "اشتراك 7 أشهر", 7, 570.0, 7),
                    ("plan_8m", "اشتراك 8 أشهر", 8, 640.0, 8),
                    ("plan_9m", "اشتراك 9 أشهر", 9, 700.0, 9),
                    ("plan_10m", "اشتراك 10 أشهر", 10, 760.0, 10),
                    ("plan_11m", "اشتراك 11 شهر", 11, 820.0, 11),
                    ("plan_12m", "اشتراك سنوي (12 شهر)", 12, 880.0, 12),
                ]
                now = now_iso()
                for pid, pname, pmonths, pprice, porder in default_plans:
                    init_conn.execute(
                        "INSERT OR IGNORE INTO subscription_plans (id, name, duration_months, price, is_active, order_index, features_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (pid, pname, pmonths, pprice, 1, porder, json.dumps(["فتح كافة الدروس والامتحانات", "محرر الأكواد مع المساعد الذكي", "شهادة إتمام المسار"]), now, now)
                    )
                init_conn.commit()
        except Exception:
            pass

        # 3. Platform Settings
        try:
            row = init_conn.execute("SELECT key, value_json FROM platform_settings WHERE key = 'general'").fetchone()
            if not row:
                settings_data = {
                    "platform_name": "Code Spark",
                    "academic_subject": "البرمجة ومبادئ علوم الحاسب",
                    "brand_theme": "dark_neon_blue",
                    "primary_color": "#0EA5E9",
                    "accent_color": "#00D2FF",
                    "background_dark": "#070B14",
                    "allow_registration": True,
                    "default_exam_duration_mins": 45,
                    "code_playground_enabled": True,
                    "payment_phone": "+20159159038",
                    "instapay_phone": "+20159159038",
                    "contact_phone": "+201559159038",
                    "instapay_link": "https://ipn.eg/S/moazasem/instapay/27DsGj"
                }
                init_conn.execute(
                    "INSERT INTO platform_settings (key, value_json, description, updated_at) VALUES (?, ?, ?, ?)",
                    ("general", json.dumps(settings_data, ensure_ascii=False), "الإعدادات العامة للمنصة", now_iso())
                )
                init_conn.commit()
            else:
                curr = json.loads(row[1])
                if "payment_phone" not in curr or curr.get("payment_phone") == "+201552696208":
                    curr["payment_phone"] = "+20159159038"
                    curr["instapay_phone"] = "+20159159038"
                    init_conn.execute(
                        "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'",
                        (json.dumps(curr, ensure_ascii=False), now_iso())
                    )
                    init_conn.commit()
        except Exception:
            pass

    @contextmanager
    def transaction(self):
        max_retries = 5
        for attempt in range(max_retries):
            try:
                with self._write_lock:
                    conn = self._get_connection()
                    try:
                        yield conn
                        conn.commit()
                        return
                    except Exception:
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        raise
            except sqlite3.OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise

    def execute(self, sql: str, params: Tuple = ()) -> int:
        max_retries = 5
        for attempt in range(max_retries):
            try:
                with self._write_lock:
                    conn = self._get_connection()
                    cur = conn.cursor()
                    try:
                        cur.execute(sql, params)
                        conn.commit()
                        return cur.rowcount
                    except Exception:
                        try:
                            conn.rollback()
                        except Exception:
                            pass
                        raise
                    finally:
                        try:
                            cur.close()
                        except Exception:
                            pass
            except sqlite3.OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise

    def fetch_one(self, sql: str, params: Tuple = ()) -> Optional[Dict[str, Any]]:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = self._get_connection()
                cur = conn.cursor()
                try:
                    cur.execute(sql, params)
                    row = cur.fetchone()
                    return dict(row) if row else None
                finally:
                    try:
                        cur.close()
                    except Exception:
                        pass
            except sqlite3.OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise

    def fetch_all(self, sql: str, params: Tuple = ()) -> List[Dict[str, Any]]:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = self._get_connection()
                cur = conn.cursor()
                try:
                    cur.execute(sql, params)
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
                finally:
                    try:
                        cur.close()
                    except Exception:
                        pass
            except sqlite3.OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise

    def fetch_val(self, sql: str, params: Tuple = ()) -> Any:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                conn = self._get_connection()
                cur = conn.cursor()
                try:
                    cur.execute(sql, params)
                    row = cur.fetchone()
                    return row[0] if row else None
                finally:
                    try:
                        cur.close()
                    except Exception:
                        pass
            except sqlite3.OperationalError as oe:
                if "locked" in str(oe).lower() and attempt < max_retries - 1:
                    time.sleep(0.05 * (2 ** attempt))
                    continue
                raise

    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        rec = data.copy()
        conn = self._get_connection()
        cur = conn.cursor()
        try:
            cols = [r[1] for r in cur.execute(f"PRAGMA table_info({table});").fetchall()]
        finally:
            try:
                cur.close()
            except Exception:
                pass
        if "id" in cols and ("id" not in rec or not rec["id"]):
            rec["id"] = uuid.uuid4().hex
        now = now_iso()
        if "created_at" in cols and "created_at" not in rec:
            rec["created_at"] = now
        if "updated_at" in cols and "updated_at" not in rec:
            rec["updated_at"] = now
        keys = [k for k in rec.keys() if k in cols]
        placeholders = ", ".join(["?"] * len(keys))
        columns = ", ".join(keys)
        values = tuple(rec[k] for k in keys)
        sql = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        self.execute(sql, values)
        return rec

    def update(self, table: str, rec_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not updates:
            return self.fetch_one(f"SELECT * FROM {table} WHERE id = ?", (rec_id,))
        up = updates.copy()
        up.pop("id", None)
        if table in ["users", "courses", "units", "lessons", "exercises", "question_bank", "quizzes", "exams", "support_tickets", "platform_settings", "subscription_plans", "subscription_requests"]:
            up["updated_at"] = now_iso()
        set_clauses = [f"{k} = ?" for k in up.keys()]
        values = list(up.values()) + [rec_id]
        sql = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE id = ?"
        self.execute(sql, tuple(values))
        return self.fetch_one(f"SELECT * FROM {table} WHERE id = ?", (rec_id,))

    def delete(self, table: str, rec_id: str) -> bool:
        sql = f"DELETE FROM {table} WHERE id = ?"
        rows_affected = self.execute(sql, (rec_id,))
        return rows_affected > 0

    def query(
        self,
        table: str,
        filters: Optional[Dict[str, Any]] = None,
        search_field: Optional[str] = None,
        search_query: Optional[str] = None,
        order_by: Optional[str] = None,
        descending: bool = False,
        offset: int = 0,
        limit: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        where_clauses = []
        params: List[Any] = []
        if filters:
            for k, v in filters.items():
                if v is None:
                    where_clauses.append(f"{k} IS NULL")
                else:
                    where_clauses.append(f"{k} = ?")
                params.append(v)
        if search_query and search_field:
            where_clauses.append(f"{search_field} LIKE ?")
            params.append(f"%{search_query.strip()}%")
        where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        count_sql = f"SELECT COUNT(*) FROM {table} {where_str}"
        total_count = self.fetch_val(count_sql, tuple(params)) or 0
        sort_dir = "DESC" if descending else "ASC"
        order_str = f"ORDER BY {order_by} {sort_dir}" if order_by else ""
        limit_str = f"LIMIT {limit}" if limit is not None else ""
        offset_str = f"OFFSET {offset}" if offset > 0 else ""
        sql = f"SELECT * FROM {table} {where_str} {order_str} {limit_str} {offset_str}".strip()
        items = self.fetch_all(sql, tuple(params))
        return items, total_count

db_engine = RelationalDatabaseEngine()
