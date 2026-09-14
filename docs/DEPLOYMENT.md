# Code Spark — Production Deployment Guide

## 1. Local Development Execution (SQLite Mode)
Code Spark runs out-of-the-box in local development using Python's native SQLite engine:

```bash
# 1. Navigate to backend directory
cd /working_dir/CodeSpark/backend

# 2. Seed development database (creates test accounts, courses, codes)
python3 -c "import sys; sys.path.insert(0, '.'); from app.db.seed import seed_database; seed_database()"

# 3. Run automated end-to-end tests
python3 tests/test_end_to_end.py

# 4. Start local development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Open `http://localhost:8000` in your browser to access the application.

---

## 2. Production Docker & PostgreSQL Deployment
To deploy using Docker Compose with an enterprise PostgreSQL instance:

```bash
# 1. Clone or extract the CodeSpark directory
cd CodeSpark

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Build and launch services in background
docker-compose up -d --build

# 4. Inspect container health and logs
docker-compose ps
docker-compose logs -f backend
```
