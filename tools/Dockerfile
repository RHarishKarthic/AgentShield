# =============================================================================
# AgentShield Tools Container Dockerfile
# Runs Customer, Email, and File services concurrently
# =============================================================================

FROM python:3.14-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/tools

EXPOSE 8001 8002 8003

CMD ["python", "/app/tools/run_all_tools.py"]
