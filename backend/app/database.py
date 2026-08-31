import datetime
import json
"""
Code Spark - Production-Ready Universal Database Layer
Supports PostgreSQL (Production) and SQLite (Local Development) seamlessly.
"""

import os
import re
import urllib.parse
import sqlite3
import contextlib
import logging
import queue
import threading
from typing import Generator, List, Dict, Any, Optional, Union, Tuple, Sequence

from .config import DATABASE_URL, DATABASE_PATH

logger = logging.getLogger("codespark.database")

# Try importing PostgreSQL drivers
_PG_DRIVER = None
try:
    import psycopg # psycopg3
    _PG_DRIVER = "psycopg"
except ImportError:
    try:
        import psycopg2 # psycopg2
        import psycopg2.extras
        _PG_DRIVER = "psycopg2"
    except ImportError:
        try:
            from . import postgres_client
            _PG_DRIVER = "pure_postgres"
        except ImportError:
            _PG_DRIVER = None


class DictRow(dict):
    """Row wrapper providing dict-like, attribute, and index-based access."""
    def __init__(self, data: Union[Dict[str, Any], Sequence[Any]], columns: Optional[Sequence[str]] = None):
        if columns is not None and isinstance(data, (list, tuple)):
            super().__init__(zip(columns, data))
            self._values = list(data)
            self._columns = list(columns)
        elif isinstance(data, dict):
            super().__init__(data)
            self._values = list(data.values())
            self._columns = list(data.keys())
        else:
            super().__init__(data)
            self._values = list(self.values())
            self._columns = list(self.keys())

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)

    def get(self, key, default=None):
        if isinstance(key, int):
            if 0 <= key < len(self._values):
                return self._values[key]
            return default
        return super().get(key, default)

    def keys(self):
        return super().keys()

    def values(self):
        return self._values

    def items(self):
        return super().items()


class UniversalCursor:
    """Cursor wrapper unifying SQLite and PostgreSQL DB-API interactions."""
    def __init__(self, raw_cursor, db_type: str):
        self._cursor = raw_cursor
        self.db_type = db_type

    def execute(self, query: str, params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None) -> 'UniversalCursor':
        if self.db_type == "sqlite":
            if params is None:
                self._cursor.execute(query)
            else:
                self._cursor.execute(query, params)
        else:
            # PostgreSQL execution
            # If using native psycopg2/psycopg, convert ? to %s if needed
            if _PG_DRIVER in ("psycopg", "psycopg2"):
                pg_query = self._convert_placeholders_to_percent_s(query)
                if params is None:
                    self._cursor.execute(pg_query)
                else:
                    self._cursor.execute(pg_query, params)
            else:
                # pure_postgres handles ? directly inside its own cursor
                if params is None:
                    self._cursor.execute(query)
                else:
                    self._cursor.execute(query, params)
        return self

    def _convert_placeholders_to_percent_s(self, query: str) -> str:
        """Convert ? placeholders to %s for PostgreSQL drivers while ignoring strings."""
        parts = []
        in_quote = False
        quote_char = None
        i = 0
        n = len(query)
        while i < n:
            ch = query[i]
            if in_quote:
                parts.append(ch)
                if ch == quote_char:
                    if i + 1 < n and query[i+1] == quote_char:
                        parts.append(query[i+1])
                        i += 1
                    else:
                        in_quote = False
            else:
                if ch in ("'", '"'):
                    in_quote = True
                    quote_char = ch
                    parts.append(ch)
                elif ch == '?':
                    parts.append('%s')
                else:
                    parts.append(ch)
            i += 1
        return "".join(parts)

    def fetchone(self) -> Optional[DictRow]:
        row = self._cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, DictRow):
            return row
        if isinstance(row, dict):
            return DictRow(row)
        if isinstance(row, sqlite3.Row):
            return DictRow(dict(row))
        if hasattr(self._cursor, "description") and self._cursor.description:
            cols = [d[0] for d in self._cursor.description]
            return DictRow(row, columns=cols)
        return DictRow(row)

    def fetchall(self) -> List[DictRow]:
        rows = self._cursor.fetchall()
        if not rows:
            return []
        if isinstance(rows[0], DictRow):
            return rows
        if isinstance(rows[0], dict):
            return [DictRow(r) for r in rows]
        if isinstance(rows[0], sqlite3.Row):
            return [DictRow(dict(r)) for r in rows]
        if hasattr(self._cursor, "description") and self._cursor.description:
            cols = [d[0] for d in self._cursor.description]
            return [DictRow(r, columns=cols) for r in rows]
        return [DictRow(r) for r in rows]

    def fetchmany(self, size: int = 1) -> List[DictRow]:
        rows = self._cursor.fetchmany(size)
        if not rows:
            return []
        if hasattr(self._cursor, "description") and self._cursor.description:
            cols = [d[0] for d in self._cursor.description]
            return [DictRow(r, columns=cols) for r in rows]
        return [DictRow(r) for r in rows]

    @property
    def rowcount(self) -> int:
        return getattr(self._cursor, "rowcount", -1)

    @property
    def description(self):
        return getattr(self._cursor, "description", None)

    def close(self):
        try:
            self._cursor.close()
        except Exception:
            pass


class UniversalConnection:
    """Connection wrapper for uniform commit, rollback, and cursor creation."""
    def __init__(self, raw_conn, db_type: str, pool: Optional['ConnectionPool'] = None):
        self._conn = raw_conn
        self.db_type = db_type
        self._pool = pool
        self._closed = False

    def cursor(self) -> UniversalCursor:
        raw_cur = self._conn.cursor()
        return UniversalCursor(raw_cur, self.db_type)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def close(self):
        if self._closed:
            return
        if self._pool is not None:
            self._pool.release(self)
        else:
            try:
                self._conn.close()
            except Exception:
                pass
            self._closed = True

    def execute(self, query: str, params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None) -> UniversalCursor:
        cur = self.cursor()
        return cur.execute(query, params)


class ConnectionPool:
    """Thread-safe Connection Pool for high-concurrency production deployments."""
    def __init__(self, max_connections: int = 20):
        self.max_connections = max_connections
        self._pool: queue.Queue = queue.Queue(maxsize=max_connections)
        self._lock = threading.Lock()
        self._created_count = 0

    def _create_raw_connection(self):
        db_url = os.getenv("DATABASE_URL", DATABASE_URL)
        if db_url.startswith("postgres://") or db_url.startswith("postgresql://"):
            if _PG_DRIVER == "psycopg":
                conn = psycopg.connect(db_url, row_factory=psycopg.rows.dict_row)
                return conn, "postgres"
            elif _PG_DRIVER == "psycopg2":
                conn = psycopg2.connect(db_url, cursor_factory=psycopg2.extras.RealDictCursor)
                return conn, "postgres"
            else:
                parsed = urllib.parse.urlparse(db_url)
                host = parsed.hostname or "localhost"
                port = parsed.port or 5432
                user = urllib.parse.unquote(parsed.username or "postgres")
                password = urllib.parse.unquote(parsed.password or "")
                database = parsed.path.lstrip("/") or "codespark"
                from . import postgres_client
                conn = postgres_client.PostgresConnection(
                    host=host, port=port, user=user, password=password, database=database
                )
                return conn, "postgres"
        else:
            # SQLite connection
            db_path = DATABASE_PATH
            if db_url.startswith("sqlite:///"):
                db_path = db_url.replace("sqlite:///", "")
            elif db_url.startswith("sqlite://"):
                db_path = db_url.replace("sqlite://", "")
            
            os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
            conn = sqlite3.connect(db_path, timeout=30.0, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = DELETE")
            return conn, "sqlite"

    def acquire(self) -> UniversalConnection:
        try:
            # Try to get existing connection from pool
            raw_conn, db_type = self._pool.get_nowait()
            # Validate connection is alive
            if db_type == "postgres" and hasattr(raw_conn, "is_alive") and not raw_conn.is_alive():
                try:
                    raw_conn.close()
                except Exception:
                    pass
                raw_conn, db_type = self._create_raw_connection()
        except queue.Empty:
            with self._lock:
                raw_conn, db_type = self._create_raw_connection()
                self._created_count += 1
        
        return UniversalConnection(raw_conn, db_type, pool=self)

    def release(self, uconn: UniversalConnection):
        if uconn._closed:
            return
        try:
            # Clean transaction state before returning
            uconn.rollback()
            self._pool.put_nowait((uconn._conn, uconn.db_type))
        except queue.Full:
            try:
                uconn._conn.close()
            except Exception:
                pass
            with self._lock:
                self._created_count -= 1

    def close_all(self):
        while not self._pool.empty():
            try:
                raw_conn, _ = self._pool.get_nowait()
                raw_conn.close()
            except Exception:
                pass


# Global pool singleton
_GLOBAL_POOL = ConnectionPool(max_connections=int(os.getenv("DATABASE_POOL_SIZE", "20")))

def get_db_connection() -> UniversalConnection:
    """Acquire a managed database connection from pool."""
    return _GLOBAL_POOL.acquire()

@contextlib.contextmanager
def get_db() -> Generator[UniversalConnection, None, None]:
    """
    Context manager for safe transactional database operations.
    Automatically commits on success and rolls back on exception.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database transaction failed, rolled back: {e}")
        raise
    finally:
        conn.close()

def get_db_type() -> str:
    """Return 'postgres' or 'sqlite' depending on DATABASE_URL configuration."""
    db_url = os.getenv("DATABASE_URL", DATABASE_URL)
    if db_url.startswith("postgres://") or db_url.startswith("postgresql://"):
        return "postgres"
    return "sqlite"

def check_db_health() -> Dict[str, Any]:
    """Verify live database connectivity and latency."""
    try:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 as health_check")
            res = cur.fetchone()
            if res:
                return {"status": "ok", "database": "ok", "engine": conn.db_type}
        return {"status": "error", "database": "unavailable"}
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {"status": "error", "database": "error", "error": str(e)}

def init_db():
    """Initialize complete database tables, relational foreign keys, and indexes."""
    db_type = get_db_type()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            phone VARCHAR(64) UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(32) NOT NULL DEFAULT 'student',
            avatar VARCHAR(255),
            is_active INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 2. Student Profiles Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_profiles (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            grade VARCHAR(128),
            class_name VARCHAR(128),
            section VARCHAR(128),
            parent_phone VARCHAR(64),
            subscription_code VARCHAR(64),
            subscription_status VARCHAR(32) DEFAULT 'active',
            subscription_start VARCHAR(64),
            subscription_expires_at VARCHAR(64),
            subscription_duration_days INTEGER DEFAULT -1,
            subscription_type VARCHAR(32) DEFAULT 'lifetime',
            subscription_code_id VARCHAR(64),
            streak INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 100,
            learning_hours REAL DEFAULT 0.0,
            last_activity VARCHAR(64),
            last_lesson_id VARCHAR(64),
            last_lesson_position INTEGER DEFAULT 0,
            created_at VARCHAR(64),
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 3. Units Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS units (
            id VARCHAR(64) PRIMARY KEY,
            number INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            icon VARCHAR(64) DEFAULT 'code',
            total_lessons INTEGER DEFAULT 0,
            total_exams INTEGER DEFAULT 0,
            status VARCHAR(32) DEFAULT 'not-started',
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 4. Lessons Table (Flexible Video System: YouTube + Direct Upload)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS lessons (
            id VARCHAR(64) PRIMARY KEY,
            unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
            number INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            duration VARCHAR(64) DEFAULT '20 دقيقة',
            type VARCHAR(32) DEFAULT 'video',
            video_source VARCHAR(32) DEFAULT 'youtube',
            video_provider VARCHAR(32) DEFAULT 'youtube',
            video_id VARCHAR(128),
            video_url TEXT,
            storage_path VARCHAR(512),
            thumbnail_url TEXT,
            file_size INTEGER,
            mime_type VARCHAR(64),
            content TEXT,
            content_html TEXT,
            code_example TEXT,
            code_solution TEXT,
            exercise_title VARCHAR(255),
            exercise_description TEXT,
            exercise_starter_code TEXT,
            exercise_solution_code TEXT,
            exercise_test_cases TEXT,
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # Auto-migrate existing lessons table if new video columns are missing
        video_cols = [
            ("video_source", "VARCHAR(32) DEFAULT 'youtube'"),
            ("video_provider", "VARCHAR(32) DEFAULT 'youtube'"),
            ("video_id", "VARCHAR(128)"),
            ("storage_path", "VARCHAR(512)"),
            ("thumbnail_url", "TEXT"),
            ("file_size", "INTEGER"),
            ("mime_type", "VARCHAR(64)")
        ]
        for col_name, col_def in video_cols:
            try:
                if db_type == "postgres":
                    cursor.execute(f"ALTER TABLE lessons ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
                else:
                    cursor.execute(f"ALTER TABLE lessons ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass

        # 5. Lesson Progress Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS lesson_progress (
            id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            progress INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 0,
            last_position INTEGER DEFAULT 0,
            started_at VARCHAR(64),
            completed_at VARCHAR(64),
            updated_at VARCHAR(64) NOT NULL,
            UNIQUE(student_id, lesson_id)
        )
        """)

        # 6. Exercises Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exercises (
            id VARCHAR(64) PRIMARY KEY,
            lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            type VARCHAR(32) DEFAULT 'code',
            difficulty VARCHAR(32) DEFAULT 'medium',
            content TEXT,
            solution TEXT,
            starter_code TEXT,
            solution_code TEXT,
            test_cases TEXT,
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64)
        )
        """)

        # 7. Questions Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id VARCHAR(64) PRIMARY KEY,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
            question_text TEXT,
            question TEXT NOT NULL,
            type VARCHAR(32) NOT NULL DEFAULT 'mcq',
            difficulty VARCHAR(32) DEFAULT 'medium',
            score INTEGER DEFAULT 10,
            explanation TEXT,
            correct_answer TEXT,
            code_snippet TEXT,
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64)
        )
        """)

        # 8. Question Options Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS question_options (
            id VARCHAR(64) PRIMARY KEY,
            question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            option_key VARCHAR(32) NOT NULL,
            option_text TEXT NOT NULL,
            is_correct INTEGER DEFAULT 0,
            order_index INTEGER DEFAULT 0
        )
        """)

        # 9. Quizzes Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quizzes (
            id VARCHAR(64) PRIMARY KEY,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE CASCADE,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            duration INTEGER DEFAULT 10,
            duration_minutes INTEGER DEFAULT 10,
            passing_score INTEGER DEFAULT 60,
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            created_at VARCHAR(64),
            updated_at VARCHAR(64)
        )
        """)

        # 10. Quiz Questions Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quiz_questions (
            quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            order_index INTEGER DEFAULT 0,
            PRIMARY KEY (quiz_id, question_id)
        )
        """)

        # 11. Quiz Attempts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id VARCHAR(64) PRIMARY KEY,
            quiz_id VARCHAR(64) NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
            student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            score INTEGER DEFAULT 0,
            percentage REAL DEFAULT 0.0,
            passed INTEGER DEFAULT 0,
            started_at VARCHAR(64) NOT NULL,
            completed_at VARCHAR(64)
        )
        """)

        # 12. Quiz Answers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS quiz_answers (
            id VARCHAR(64) PRIMARY KEY,
            attempt_id VARCHAR(64) NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
            question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            selected_option VARCHAR(64),
            is_correct INTEGER DEFAULT 0
        )
        """)

        # 13. Exams Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id VARCHAR(64) PRIMARY KEY,
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            duration INTEGER DEFAULT 30,
            duration_minutes INTEGER DEFAULT 30,
            total_questions INTEGER DEFAULT 10,
            passing_score INTEGER DEFAULT 60,
            attempts_allowed INTEGER DEFAULT 3,
            random_questions INTEGER DEFAULT 0,
            randomize_questions INTEGER DEFAULT 0,
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 14. Exam Questions Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exam_questions (
            id VARCHAR(64),
            exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            order_index INTEGER DEFAULT 0,
            PRIMARY KEY (exam_id, question_id)
        )
        """)

        # 15. Exam Attempts Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exam_attempts (
            id VARCHAR(64) PRIMARY KEY,
            exam_id VARCHAR(64) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
            student_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            score INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 100,
            percentage INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            total_count INTEGER DEFAULT 0,
            time_spent_seconds INTEGER DEFAULT 0,
            strengths_json TEXT,
            weaknesses_json TEXT,
            passed INTEGER DEFAULT 0,
            started_at VARCHAR(64) NOT NULL,
            completed_at VARCHAR(64)
        )
        """)

        # 16. Exam Answers Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS exam_answers (
            id VARCHAR(64) PRIMARY KEY,
            attempt_id VARCHAR(64) NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
            question_id VARCHAR(64) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
            answer TEXT,
            selected_option VARCHAR(64),
            is_correct INTEGER DEFAULT 0
        )
        """)

        # 17. Notifications Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(32) DEFAULT 'info',
            is_read INTEGER DEFAULT 0,
            link VARCHAR(255),
            created_at VARCHAR(64) NOT NULL
        )
        """)

        # 18. Announcements Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            badge VARCHAR(64) DEFAULT 'جديد',
            date_str VARCHAR(64),
            published INTEGER DEFAULT 1,
            is_published INTEGER DEFAULT 1,
            created_at VARCHAR(64) NOT NULL
        )
        """)

        # 19. Support Tickets Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS support_tickets (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
            student_name VARCHAR(255),
            student_phone VARCHAR(64),
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(32) DEFAULT 'open',
            reply TEXT,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 20. System Settings Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(128) PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        
        # 21. Password Reset Tokens Table (Hashed Storage & Brute Force Protection)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            code VARCHAR(64) NOT NULL DEFAULT '',
            token_hash VARCHAR(255) NOT NULL,
            reset_token_hash VARCHAR(255),
            attempts INTEGER NOT NULL DEFAULT 0,
            expires_at VARCHAR(64) NOT NULL,
            reset_token_expires_at VARCHAR(64),
            verified_at VARCHAR(64),
            used INTEGER NOT NULL DEFAULT 0,
            created_at VARCHAR(64) NOT NULL
        )
        """)

        # Auto-migrate password_reset_tokens table if columns are missing
        prt_cols = [
            ("attempts", "INTEGER DEFAULT 0"),
            ("reset_token_hash", "VARCHAR(255)"),
            ("reset_token_expires_at", "VARCHAR(64)"),
            ("verified_at", "VARCHAR(64)")
        ]
        for col_name, col_def in prt_cols:
            try:
                if db_type == "postgres":
                    cursor.execute(f"ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
                else:
                    cursor.execute(f"ALTER TABLE password_reset_tokens ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass

        # 22. Subscription Codes Table (Hashed Storage & Atomic Redemption)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscription_codes (
            id VARCHAR(64) PRIMARY KEY,
            code_hash VARCHAR(64) UNIQUE NOT NULL,
            code_prefix VARCHAR(64) NOT NULL,
            masked_code VARCHAR(64) NOT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'active',
            subscription_type VARCHAR(32) NOT NULL DEFAULT '1_month',
            duration_days INTEGER NOT NULL DEFAULT 30,
            max_uses INTEGER NOT NULL DEFAULT 1,
            uses_count INTEGER NOT NULL DEFAULT 0,
            assigned_user_id VARCHAR(64),
            notes TEXT,
            created_at VARCHAR(64) NOT NULL,
            activated_at VARCHAR(64),
            expires_at VARCHAR(64),
            disabled_at VARCHAR(64)
        )
        """)

        # Auto-migrate existing student_profiles table if subscription columns are missing
        sp_sub_cols = [
            ("subscription_status", "VARCHAR(32) DEFAULT 'active'"),
            ("subscription_start", "VARCHAR(64)"),
            ("subscription_expires_at", "VARCHAR(64)"),
            ("subscription_duration_days", "INTEGER DEFAULT -1"),
            ("subscription_type", "VARCHAR(32) DEFAULT 'lifetime'"),
            ("subscription_code_id", "VARCHAR(64)")
        ]
        for col_name, col_def in sp_sub_cols:
            try:
                if db_type == "postgres":
                    cursor.execute(f"ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
                else:
                    cursor.execute(f"ALTER TABLE student_profiles ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass

        # Backfill existing student profiles without subscription status as active lifetime
        try:
            cursor.execute("""
            UPDATE student_profiles
            SET subscription_status = 'active',
                subscription_type = 'lifetime',
                subscription_duration_days = -1,
                subscription_start = COALESCE(created_at, updated_at)
            WHERE subscription_status IS NULL OR subscription_status = ''
            """)
        except Exception:
            pass

        # Performance Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reset_tokens_code ON password_reset_tokens(code)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_codes_hash ON subscription_codes(code_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_codes_status ON subscription_codes(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_codes_user ON subscription_codes(assigned_user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_codes_created ON subscription_codes(created_at)")

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_profiles_user ON student_profiles(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lessons_unit ON lessons(unit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON lesson_progress(lesson_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_questions_lesson ON questions(lesson_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_question_options_q ON question_options(question_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON quizzes(lesson_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_exams_unit ON exams(unit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status)")

        # 23. Activity Logs Table (System & Audit Logging for Super Admin and Assistants)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            user_name VARCHAR(255),
            user_role VARCHAR(32),
            action VARCHAR(64) NOT NULL,
            target_type VARCHAR(64),
            target_id VARCHAR(64),
            target_name VARCHAR(255),
            details TEXT,
            ip_address VARCHAR(64),
            created_at VARCHAR(64) NOT NULL
        )
        """)

        # Auto-migrate users table for soft-delete & created_by
        user_cols = [
            ("is_deleted", "INTEGER DEFAULT 0"),
            ("deleted_at", "VARCHAR(64)"),
            ("created_by", "VARCHAR(64)")
        ]
        for col_name, col_def in user_cols:
            try:
                if db_type == "postgres":
                    cursor.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_def}")
                else:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
            except Exception:
                pass



        # 26. User Bookmarks / Favorites Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_bookmarks (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            item_type VARCHAR(32) NOT NULL,
            item_id VARCHAR(64) NOT NULL,
            title VARCHAR(255) NOT NULL,
            metadata_json TEXT,
            created_at VARCHAR(64) NOT NULL,
            UNIQUE(user_id, item_type, item_id)
        )
        """)

        # 27. Student Notes Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_notes (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id VARCHAR(64) NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            note_text TEXT NOT NULL,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL,
            UNIQUE(user_id, lesson_id)
        )
        """)

        # 28. Student Code Drafts & History Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_code_drafts (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id VARCHAR(64),
            code_type VARCHAR(32) DEFAULT 'playground',
            code TEXT NOT NULL,
            version INTEGER DEFAULT 1,
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # 29. Educational Resources & PDF Files Table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS educational_resources (
            id VARCHAR(64) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            file_url TEXT NOT NULL,
            preview_url TEXT,
            download_url TEXT,
            file_type VARCHAR(32) DEFAULT 'pdf',
            file_size_label VARCHAR(64),
            category VARCHAR(100) DEFAULT 'مذكرات شرح',
            unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
            lesson_id VARCHAR(64) REFERENCES lessons(id) ON DELETE SET NULL,
            is_active INTEGER DEFAULT 1,
            status VARCHAR(32) DEFAULT 'active',
            display_order INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            downloads_count INTEGER DEFAULT 0,
            created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
            created_by_name VARCHAR(255),
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
        """)

        # Performance Indexes for New Features
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON user_bookmarks(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_notes_user ON student_notes(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_code_drafts_user ON student_code_drafts(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_active ON educational_resources(is_active)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_unit ON educational_resources(unit_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_lesson ON educational_resources(lesson_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_order ON educational_resources(display_order)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resources_category ON educational_resources(category)")
        cursor.execute("UPDATE educational_resources SET category = 'ملخصات وتفاصيل' WHERE category = 'ملخصات وقوانين'")

        # Performance Indexes for Activity Logs
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type)")


if __name__ == "__main__":
    init_db()
    print("✓ Code Spark Database schema successfully initialized.")


def log_activity(
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    user_role: Optional[str] = None,
    action: str = "",
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[Union[Dict[str, Any], str]] = None,
    ip_address: Optional[str] = None,
    conn: Optional[Any] = None
) -> None:
    """Thread-safe activity logger for administrative and educational operations."""
    import datetime
    import json
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    rand_suffix = os.urandom(3).hex()
    log_id = f"log_{now_ts}_{rand_suffix}"
    details_str = json.dumps(details, ensure_ascii=False) if isinstance(details, (dict, list)) else (str(details) if details else "")

    sql = """
    INSERT INTO activity_logs (
        id, user_id, user_name, user_role, action, target_type, target_id, target_name, details, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    params = (log_id, user_id, user_name, user_role, action, target_type, target_id, target_name, details_str, ip_address, now)

    if conn is not None:
        try:
            cursor = conn.cursor()
            cursor.execute(sql, params)
        except Exception as e:
            logger.warning(f"Failed to write activity log: {e}")
    else:
        try:
            with get_db() as c:
                cursor = c.cursor()
                cursor.execute(sql, params)
        except Exception as e:
            logger.warning(f"Failed to write activity log: {e}")
