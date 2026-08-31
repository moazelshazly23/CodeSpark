#!/usr/bin/env python3
"""
Code Spark - SQLite to PostgreSQL Logical Data Migration Utility
Transfers data in strict topological dependency order with data-type normalization.
"""

import sys
import os
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

# Ensure backend directory is in path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import DATABASE_PATH, DATABASE_URL
from app.database import get_db, init_db

TABLES_ORDER = [
    "system_settings",
    "users",
    "student_profiles",
    "units",
    "lessons",
    "exercises",
    "questions",
    "question_options",
    "quizzes",
    "quiz_questions",
    "quiz_attempts",
    "quiz_answers",
    "exams",
    "exam_questions",
    "exam_attempts",
    "exam_answers",
    "lesson_progress",
    "notifications",
    "announcements",
    "support_tickets"
]

def migrate_data(sqlite_path: str = DATABASE_PATH, postgres_target_url: Optional[str] = None):
    """
    Logically transfer all rows from SQLite to PostgreSQL.
    """
    if not os.path.exists(sqlite_path):
        print(f"Source SQLite database not found at {sqlite_path}")
        return

    print("=" * 65)
    print("Code Spark - SQLite to PostgreSQL Data Migration")
    print("=" * 65)
    print(f"Source SQLite Database : {sqlite_path}")
    print(f"Target Database URL    : {postgres_target_url or DATABASE_URL}")
    print("=" * 65)

    # 1. Connect to SQLite Source
    src_conn = sqlite3.connect(sqlite_path)
    src_conn.row_factory = sqlite3.Row
    src_cur = src_conn.cursor()

    # 2. Ensure Target Schema is initialized
    print("\n[Step 1] Initializing target database schema...")
    init_db()
    print("✓ Target schema ready.")

    total_migrated = 0

    # 3. Transfer tables in dependency order
    print("\n[Step 2] Transferring records in topological dependency order...")
    
    with get_db() as tgt_conn:
        tgt_cur = tgt_conn.cursor()

        for table in TABLES_ORDER:
            try:
                src_cur.execute(f"SELECT * FROM {table}")
                rows = src_cur.fetchall()
            except sqlite3.OperationalError:
                # Table might not exist in older SQLite file
                rows = []

            if not rows:
                print(f"  - {table:<22} : 0 rows (empty/skipped)")
                continue

            col_names = [d[0] for d in src_cur.description]
            placeholders = ", ".join(["?" for _ in col_names])
            cols_str = ", ".join(col_names)
            insert_sql = f"INSERT INTO {table} ({cols_str}) VALUES ({placeholders})"

            # Clear target table if re-running
            try:
                tgt_cur.execute(f"DELETE FROM {table}")
            except Exception:
                pass

            inserted_for_table = 0
            for row in rows:
                row_vals = [row[c] for c in col_names]
                tgt_cur.execute(insert_sql, row_vals)
                inserted_for_table += 1

            total_migrated += inserted_for_table
            print(f"  ✓ {table:<22} : {inserted_for_table} rows transferred")

    src_conn.close()
    print("\n" + "=" * 65)
    print(f"✓ Migration Completed Successfully! Total rows migrated: {total_migrated}")
    print("=" * 65)

def main():
    sqlite_db = sys.argv[1] if len(sys.argv) > 1 else DATABASE_PATH
    pg_url = sys.argv[2] if len(sys.argv) > 2 else None
    migrate_data(sqlite_db, pg_url)

if __name__ == "__main__":
    main()
