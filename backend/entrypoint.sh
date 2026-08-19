#!/bin/sh
set -e

echo "=== AgentShield WAF Backend Starting ==="

# Wait for PostgreSQL
echo "[*] Waiting for PostgreSQL database to be ready..."
python - << 'EOF'
import os
import sys
import time
import psycopg

# Resolve DB URL
db_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URL_SYNC")
if not db_url:
    user = os.getenv("POSTGRES_USER", "agentshield")
    password = os.getenv("POSTGRES_PASSWORD", "agentshield_dev_password")
    server = os.getenv("POSTGRES_SERVER", "postgres")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "agentshield")
    db_url = f"postgresql://{user}:{password}@{server}:{port}/{db}"

# Clean SQLAlchemy driver prefixes
db_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("postgresql+psycopg://", "postgresql://")

max_retries = 30
for i in range(max_retries):
    try:
        with psycopg.connect(db_url, connect_timeout=3) as conn:
            print(f"[+] Connected to PostgreSQL successfully.")
            sys.exit(0)
    except Exception as e:
        print(f"[*] Waiting for PostgreSQL... ({i+1}/{max_retries}) - {e}")
        time.sleep(2)

print("[!] Warning: PostgreSQL connection attempt timed out. Continuing startup...")
EOF

# Run database migrations
echo "[*] Running Alembic database migrations..."
alembic upgrade head || echo "[!] Migration notice: already up to date or initialized."

# Seed default policies, tools, and agents if seed script exists
if [ -f "/app/seed_data.py" ]; then
  echo "[*] Seeding default WAF database state..."
  python /app/seed_data.py || true
fi

# Start FastAPI server respecting Render's $PORT
PORT="${PORT:-8000}"
echo "[*] Launching Uvicorn ASGI Server on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --workers 2
