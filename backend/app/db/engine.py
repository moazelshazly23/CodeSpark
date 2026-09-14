"""
Code Spark - Relational Database Engine
Production SQLite (WAL mode, Foreign Keys ON, ACID Transactions) & PostgreSQL Support
"""
import os
import sqlite3
import threading
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from contextlib import contextmanager
from app.core.config import settings

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

SCHEMA_DDL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'assistant', 'admin')),
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 1,
    phone TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assistant_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    granted_at TEXT NOT NULL,
    UNIQUE(user_id, permission)
);

CREATE TABLE IF NOT EXISTS subscription_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    code_hash TEXT NOT NULL,
    duration_type TEXT NOT NULL CHECK(duration_type IN ('1_MONTH', '3_MONTHS', '6_MONTHS', '12_MONTHS', 'LIFETIME', 'CUSTOM')),
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'USED', 'EXPIRED', 'DISABLED')),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    used_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    disabled INTEGER DEFAULT 0,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    activated_at TEXT,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_months INTEGER NOT NULL CHECK (duration_months >= 1),
    price REAL NOT NULL CHECK (price >= 0),
    is_active INTEGER NOT NULL DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    features_json TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_plans_active ON subscription_plans(is_active, order_index);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_id TEXT REFERENCES subscription_codes(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'EXPIRED', 'DISABLED')),
    started_at TEXT NOT NULL,
    expires_at TEXT,
    is_lifetime INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    content_markdown TEXT,
    video_type TEXT NOT NULL CHECK(video_type IN ('youtube', 'uploaded', 'none')),
    video_url TEXT,
    video_id TEXT,
    duration_seconds REAL DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 1,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    last_video_position_seconds REAL DEFAULT 0,
    watch_percentage REAL DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    completed_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS educational_resources (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('drive_link', 'uploaded_file')),
    file_url TEXT NOT NULL,
    file_size_bytes INTEGER DEFAULT 0,
    file_format TEXT,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published INTEGER DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    starter_code TEXT,
    expected_output TEXT,
    test_cases_json TEXT,
    language TEXT NOT NULL CHECK(language IN ('python', 'javascript', 'html', 'css')),
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    solution_code TEXT,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PASSED', 'FAILED', 'ERROR')),
    output TEXT,
    tests_passed INTEGER DEFAULT 0,
    tests_total INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_bank (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice', 'true_false', 'code', 'essay')),
    options_json TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
    topic TEXT,
    unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    tags_json TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
    unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    passing_score REAL DEFAULT 70.0,
    time_limit_minutes INTEGER DEFAULT 15,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    points REAL DEFAULT 1.0,
    order_index INTEGER DEFAULT 0,
    UNIQUE(quiz_id, question_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    answers_json TEXT,
    score REAL DEFAULT 0,
    total_possible REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    is_passed INTEGER DEFAULT 0,
    started_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 45,
    passing_score REAL DEFAULT 75.0,
    max_attempts INTEGER DEFAULT 1,
    is_randomized INTEGER DEFAULT 0,
    start_window TEXT,
    end_window TEXT,
    access_type TEXT NOT NULL CHECK(access_type IN ('PUBLIC', 'SUBSCRIBERS_ONLY')),
    is_published INTEGER DEFAULT 1,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exam_questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    points REAL DEFAULT 1.0,
    order_index INTEGER DEFAULT 0,
    UNIQUE(exam_id, question_id)
);

CREATE TABLE IF NOT EXISTS exam_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_id TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    answers_json TEXT,
    score REAL DEFAULT 0,
    total_possible REAL DEFAULT 0,
    percentage REAL DEFAULT 0,
    is_passed INTEGER DEFAULT 0,
    status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    completed_at TEXT,
    feedback TEXT
);

CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK(item_type IN ('lesson', 'resource', 'exercise')),
    item_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK(notification_type IN ('system', 'exam', 'lesson', 'subscription', 'support')),
    link_url TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL CHECK(target_audience IN ('ALL', 'STUDENTS', 'SUBSCRIBERS', 'ASSISTANTS')),
    is_published INTEGER DEFAULT 1,
    publish_date TEXT NOT NULL,
    expiration_date TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_staff_reply INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_stats (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 1,
    last_active_date TEXT,
    study_time_minutes REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL
);


CREATE TABLE IF NOT EXISTS web_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    files_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_web_projects_user ON web_projects(user_id);


CREATE TABLE IF NOT EXISTS subscription_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    phone TEXT,
    package_name TEXT NOT NULL DEFAULT 'اشتراك فصلي (3 أشهر)',
    amount REAL DEFAULT 0.0,
    payment_method TEXT NOT NULL DEFAULT 'InstaPay',
    payment_reference TEXT,
    transfer_date TEXT,
    proof_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    admin_notes TEXT,
    reviewed_by TEXT REFERENCES users(id),
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sub_requests_user ON subscription_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_requests_status ON subscription_requests(status);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_sub_codes_code ON subscription_codes(code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_units_course ON units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user ON exam_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
"""

class RelationalDatabaseEngine:
    def __init__(self, db_path: Optional[str] = None):
        p = db_path or getattr(settings, "DB_PATH", "codespark.db")
        if p.startswith("sqlite:///"):
            p = p.replace("sqlite:///", "")
        elif p.startswith("sqlite://"):
            p = p.replace("sqlite://", "")
        db_dir = os.path.dirname(os.path.abspath(p))
        if not os.path.exists(db_dir):
            p = os.path.abspath("codespark.db")
        self.db_path = os.path.abspath(p)
        self.lock = threading.RLock()
        self._local = threading.local()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            conn = sqlite3.connect(
                self.db_path,
                timeout=30.0,
                check_same_thread=False
            )
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON;")
            conn.execute("PRAGMA journal_mode = DELETE;")
            conn.execute("PRAGMA synchronous = OFF;")
            conn.execute("PRAGMA busy_timeout = 15000;")
            self._local.conn = conn
        return self._local.conn

    def _init_db(self):
        with self.lock:
            conn = self._get_connection()
            conn.executescript(SCHEMA_DDL)
            conn.commit()
            self._bootstrap_defaults()

    def _bootstrap_defaults(self):
        # 1. Ensure columns in subscription_requests exist
        try:
            conn = self._get_connection()
            if getattr(self, 'is_postgres', False):
                cur = conn.cursor()
                cur.execute("""
                    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_id VARCHAR(64);
                    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS duration_months INTEGER;
                    ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS payment_number VARCHAR(32);
                """)
                conn.commit()
            else:
                cols = [r[1] for r in conn.execute("PRAGMA table_info(subscription_requests);").fetchall()]
                if "plan_id" not in cols:
                    conn.execute("ALTER TABLE subscription_requests ADD COLUMN plan_id TEXT;")
                if "duration_months" not in cols:
                    conn.execute("ALTER TABLE subscription_requests ADD COLUMN duration_months INTEGER;")
                if "payment_number" not in cols:
                    conn.execute("ALTER TABLE subscription_requests ADD COLUMN payment_number TEXT;")
                conn.commit()
        except Exception:
            pass

        # 2. Seed 11 Real Subscription Plans (1 to 11 months)
        try:
            plan_count = self.fetch_val("SELECT COUNT(*) FROM subscription_plans") or 0
            if plan_count == 0:
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
                ]
                now = now_iso()
                for pid, pname, pmonths, pprice, porder in default_plans:
                    self.insert("subscription_plans", {
                        "id": pid,
                        "name": pname,
                        "duration_months": pmonths,
                        "price": pprice,
                        "is_active": 1,
                        "order_index": porder,
                        "features_json": json.dumps(["فتح كافة الدروس والامتحانات", "محرر الأكواد مع المساعد الذكي", "شهادة إتمام المسار"]),
                        "created_at": now,
                        "updated_at": now
                    })
        except Exception as e:
            print("Plans bootstrap notice:", e)

        # 3. Platform Settings (including default transfer number +20159159038)
        row = self.fetch_one("SELECT key, value_json FROM platform_settings WHERE key = 'general'")
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
            self.execute(
                "INSERT INTO platform_settings (key, value_json, description, updated_at) VALUES (?, ?, ?, ?)",
                ("general", json.dumps(settings_data, ensure_ascii=False), "الإعدادات العامة للمنصة", now_iso())
            )
        else:
            try:
                curr = json.loads(row["value_json"])
                if "payment_phone" not in curr or curr.get("payment_phone") == "+201552696208":
                    curr["payment_phone"] = "+20159159038"
                    curr["instapay_phone"] = "+20159159038"
                    self.execute(
                        "UPDATE platform_settings SET value_json = ?, updated_at = ? WHERE key = 'general'",
                        (json.dumps(curr, ensure_ascii=False), now_iso())
                    )
            except Exception:
                pass



    @contextmanager
    def transaction(self):
        with self.lock:
            conn = self._get_connection()
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise

    def execute(self, sql: str, params: Tuple = ()) -> int:
        with self.lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(sql, params)
            conn.commit()
            return cur.rowcount

    def fetch_one(self, sql: str, params: Tuple = ()) -> Optional[Dict[str, Any]]:
        with self.lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(sql, params)
            row = cur.fetchone()
            return dict(row) if row else None

    def fetch_all(self, sql: str, params: Tuple = ()) -> List[Dict[str, Any]]:
        with self.lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    def fetch_val(self, sql: str, params: Tuple = ()) -> Any:
        with self.lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(sql, params)
            row = cur.fetchone()
            return row[0] if row else None

    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        with self.lock:
            rec = data.copy()
            conn = self._get_connection()
            cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table});").fetchall()]
            
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
            cur = conn.cursor()
            cur.execute(sql, values)
            conn.commit()
            return rec

    def update(self, table: str, rec_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self.lock:
            if not updates:
                return self.fetch_one(f"SELECT * FROM {table} WHERE id = ?", (rec_id,))
            
            up = updates.copy()
            up.pop("id", None)
            if table in ["users", "courses", "units", "lessons", "exercises", "question_bank", "quizzes", "exams", "support_tickets", "platform_settings"]:
                up["updated_at"] = now_iso()

            set_clauses = [f"{k} = ?" for k in up.keys()]
            values = list(up.values()) + [rec_id]
            sql = f"UPDATE {table} SET {', '.join(set_clauses)} WHERE id = ?"
            
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(sql, tuple(values))
            conn.commit()
            return self.fetch_one(f"SELECT * FROM {table} WHERE id = ?", (rec_id,))

    def delete(self, table: str, rec_id: str) -> bool:
        with self.lock:
            conn = self._get_connection()
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {table} WHERE id = ?", (rec_id,))
            conn.commit()
            return cur.rowcount > 0

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
        with self.lock:
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

            # Count total
            count_sql = f"SELECT COUNT(*) FROM {table} {where_str}"
            total_count = self.fetch_val(count_sql, tuple(params)) or 0

            # Query items
            sort_dir = "DESC" if descending else "ASC"
            order_str = f"ORDER BY {order_by} {sort_dir}" if order_by else ""
            limit_str = f"LIMIT {limit}" if limit is not None else ""
            offset_str = f"OFFSET {offset}" if offset > 0 else ""

            sql = f"SELECT * FROM {table} {where_str} {order_str} {limit_str} {offset_str}".strip()
            items = self.fetch_all(sql, tuple(params))
            return items, total_count

# Singleton global instance
db_engine = RelationalDatabaseEngine()
