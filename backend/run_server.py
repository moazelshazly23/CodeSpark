import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import uvicorn
from app.config import HOST, PORT, DEBUG
from app.main import app  # Export app object for ASGI servers (e.g. uvicorn run_server:app)

if __name__ == "__main__":
    print(f"⚡ Starting Code Spark Educational Backend on http://{HOST}:{PORT}")
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=DEBUG)
