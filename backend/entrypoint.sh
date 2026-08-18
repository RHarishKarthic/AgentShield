#!/bin/sh
set -e

echo "=== AgentShield WAF Backend Starting ==="

# Wait for PostgreSQL
echo "[*] Waiting for PostgreSQL database to be ready..."
while ! python -c "import psycopg, os; psycopg.connect(os.getenv('DATABASE_URL_SYNC', 'postgresql+psycopg://agentshield:agentshield_dev_password@postgres:5432/agentshield').replace('+psycopg', ''))" 2>/dev/null; do
  sleep 1
done
echo "[+] PostgreSQL connected successfully."

# Run database migrations
echo "[*] Running Alembic database migrations..."
alembic upgrade head

# Seed default policies, tools, and agents if seed script exists
if [ -f "/app/seed_data.py" ]; then
  echo "[*] Seeding default WAF database state..."
  python /app/seed_data.py || true
fi

# Start FastAPI server
echo "[*] Launching Uvicorn ASGI Server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
