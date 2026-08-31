# Code Spark — PostgreSQL Production Backup & Disaster Recovery Guide

This document outlines standard operating procedures for taking backups, restoring databases, and verifying data integrity for the **Code Spark** educational platform.

---

## 1. Quick Backup Commands

### A. Full Compressed Archive Backup (Recommended)
Creates a compressed binary backup including schema, data, indexes, constraints, and sequences.
```bash
# Set credentials
export PGPASSWORD="your_secure_password"
export PGHOST="localhost"
export PGPORT="5432"
export PGUSER="codespark"
export PGDATABASE="codespark"

# Execute pg_dump custom format (-Fc)
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -Fc -v -f "codespark_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### B. Plain Text SQL Dump
Creates a human-readable, portable SQL file.
```bash
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE --clean --if-exists --no-owner --no-privileges -f "codespark_dump_$(date +%Y%m%d_%H%M%S).sql"
```

### C. Schema-Only Backup
```bash
pg_dump -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE --schema-only -f "codespark_schema_$(date +%Y%m%d_%H%M%S).sql"
```

---

## 2. Automated Daily Backup Script

Save as `/opt/codespark/scripts/backup.sh` and set permissions `chmod +x backup.sh`:

```bash
#!/usr/bin/env bash
set -eo pipefail

BACKUP_DIR="/var/backups/codespark"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/codespark_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD environment variable is required}"
export PGUSER="${DB_USER:-codespark}"
export PGHOST="${DB_HOST:-localhost}"
export PGPORT="${DB_PORT:-5432}"
export PGDATABASE="${DB_NAME:-codespark}"

echo "[$(date)] Starting backup to ${BACKUP_FILE}..." >> "${LOG_FILE}"

pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -Fc -Z 6 -f "${BACKUP_FILE}"

echo "[$(date)] Backup completed successfully. Size: $(du -sh ${BACKUP_FILE} | cut -f1)" >> "${LOG_FILE}"

# Retention: Delete backups older than 30 days
find "${BACKUP_DIR}" -name "codespark_*.dump" -mtime +30 -delete
```

### Add to Crontab (Runs daily at 03:00 AM)
```bash
0 3 * * * /opt/codespark/scripts/backup.sh >> /var/backups/codespark/cron.log 2>&1
```

---

## 3. Database Restoration Procedures

### A. Restore from Compressed Dump (`.dump`)
```bash
# 1. Terminate active application connections (if restoring over existing database)
psql -h $PGHOST -U $PGUSER -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'codespark'
  AND pid <> pg_backend_pid();
"

# 2. Recreate target database
dropdb -h $PGHOST -U $PGUSER --if-exists codespark
createdb -h $PGHOST -U $PGUSER codespark

# 3. Restore using pg_restore
pg_restore -h $PGHOST -p $PGPORT -U $PGUSER -d codespark -v "codespark_backup_YYYYMMDD_HHMMSS.dump"
```

### B. Restore from Plain SQL File (`.sql`)
```bash
psql -h $PGHOST -p $PGPORT -U $PGUSER -d codespark -f "codespark_dump_YYYYMMDD_HHMMSS.sql"
```

---

## 4. Post-Restore Verification Checklist

After restoring, verify the database health and table integrity:

```bash
# 1. Run the Code Spark verification tool
python3 backend/migrate.py verify

# 2. Check health endpoint
curl -s http://localhost:8000/api/health | jq .
```
