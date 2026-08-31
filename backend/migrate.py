#!/usr/bin/env python3
"""
Code Spark - Database Migration Runner
Supports schema upgrades, status checks, verification, and seeding across PostgreSQL & SQLite.
"""

import sys
import os
import glob
from pathlib import Path
from typing import List

# Ensure backend path is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import get_db, get_db_type, check_db_health, init_db
from app.seed_data import seed_database, get_utc_now_iso

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"

def ensure_migration_table():
    """Ensure schema_migrations tracking table exists."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(255) PRIMARY KEY,
            applied_at VARCHAR(64) NOT NULL
        )
        """)

def get_applied_migrations() -> List[str]:
    """Retrieve list of applied migration versions."""
    ensure_migration_table()
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        rows = cur.fetchall()
        return [r["version"] if isinstance(r, dict) else r[0] for r in rows]

def run_upgrade():
    """Apply all pending migration scripts."""
    ensure_migration_table()
    applied = set(get_applied_migrations())
    
    migration_files = sorted(glob.glob(str(MIGRATIONS_DIR / "*.sql")))
    if not migration_files:
        print("No SQL migration files found. Running native schema initialization...")
        init_db()
        print("✓ Native schema initialized.")
        return

    print(f"Checking migrations in {MIGRATIONS_DIR}...")
    applied_count = 0
    now = get_utc_now_iso()

    for mf in migration_files:
        version_name = os.path.basename(mf)
        if version_name in applied:
            print(f"  [ALREADY APPLIED] {version_name}")
            continue

        print(f"  [APPLYING] {version_name}...")
        with open(mf, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with get_db() as conn:
            cur = conn.cursor()
            # Split and execute non-empty statements
            statements = [s.strip() for s in sql_content.split(";") if s.strip()]
            for stmt in statements:
                if stmt.upper() in ("BEGIN", "COMMIT", "BEGIN;", "COMMIT;"):
                    continue
                try:
                    cur.execute(stmt)
                except Exception as e:
                    # Ignore table already exists warnings if using IF NOT EXISTS
                    if "already exists" not in str(e).lower():
                        print(f"    Warning executing statement: {e}")
            
            cur.execute("""
            INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)
            """, (version_name, now))
        
        print(f"  ✓ Applied {version_name}")
        applied_count += 1

    print(f"\n✓ Migration complete! Applied {applied_count} new migration(s).")

def check_status():
    """Show database engine, connectivity, and applied migrations."""
    db_type = get_db_type()
    health = check_db_health()
    applied = get_applied_migrations()
    
    print("=" * 60)
    print("Code Spark - Database Status")
    print("=" * 60)
    print(f"Configured Engine : {db_type.upper()}")
    print(f"Database Health   : {health.get('status')} (Database: {health.get('database')})")
    applied_count = len(applied)
    print(f"Applied Migrations: {applied_count}")
    for v in applied:
        print(f"  - {v}")
    print("=" * 60)

def verify_schema():
    """Verify all 20 required tables and their row counts."""
    tables = [
        "users", "student_profiles", "units", "lessons", "lesson_progress",
        "exercises", "questions", "question_options", "quizzes", "quiz_questions",
        "quiz_attempts", "quiz_answers", "exams", "exam_questions", "exam_attempts",
        "exam_answers", "notifications", "announcements", "support_tickets", "system_settings", "password_reset_tokens"
    ]
    
    print("\nVerifying Database Schema Tables & Data Integrity:")
    print("-" * 60)
    with get_db() as conn:
        cur = conn.cursor()
        for t in tables:
            try:
                cur.execute(f"SELECT COUNT(*) as cnt FROM {t}")
                res = cur.fetchone()
                cnt = res["cnt"] if res else 0
                print(f"  ✓ Table: {t:<22} | Rows: {cnt}")
            except Exception as e:
                print(f"  ✗ Table: {t:<22} | Error: {e}")
    print("-" * 60)

def main():
    args = sys.argv[1:]
    command = args[0] if args else "status"

    if command in ("upgrade", "upgrade_head", "head"):
        run_upgrade()
    elif command == "status":
        check_status()
    elif command == "verify":
        verify_schema()
    elif command == "seed":
        force = "--force" in args or "-f" in args
        seed_database(force_refresh=force)
    elif command in ("init", "init_db"):
        init_db()
        print("✓ Database initialized.")
    else:
        print("Usage: python migrate.py [upgrade|status|verify|seed|init]")

if __name__ == "__main__":
    main()
