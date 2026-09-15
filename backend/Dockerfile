FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && ln -sf /usr/local/bin/python3 /usr/bin/python3 || true \
    && ln -sf /usr/local/bin/python /usr/bin/python || true \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend
COPY frontend /app/frontend
COPY storage /app/storage

ENV PYTHONPATH=/app/backend
ENV PYTHON_EXECUTABLE=/usr/local/bin/python3
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
