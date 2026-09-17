#!/bin/bash
# ==============================================================================
# CodeSpark Educational Platform - Unified Startup Script
# Starts FastAPI server with uvicorn serving both API and Frontend SPA
# ==============================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/backend"

export PYTHONPATH="$SCRIPT_DIR/backend"
export DATA_DIR="${DATA_DIR:-/home/spark/codespark_data}"
export PORT="${PORT:-8000}"
export HOST="${HOST:-0.0.0.0}"

mkdir -p "$DATA_DIR"
mkdir -p "$SCRIPT_DIR/backend/data"

echo "=========================================================="
echo "⚡ Starting CodeSpark Educational Platform"
echo "• Host: $HOST"
echo "• Port: $PORT"
echo "• Data Directory: $DATA_DIR"
echo "• Database URL: ${DATABASE_URL:-sqlite:///$DATA_DIR/codespark_persistent.db}"
echo "=========================================================="

python3 -m uvicorn app.main:app --host "$HOST" --port "$PORT"
