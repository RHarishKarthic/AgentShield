"""
Unified Tool Services Launcher.

Starts all three downstream microservices concurrently in a single process:
- Customer Database API (Port 8001)
- Email Service API (Port 8002)
- File Storage API (Port 8003)
"""

import asyncio
import sys

import uvicorn

from tools.customer_service.main import app as customer_app
from tools.email_service.main import app as email_app
from tools.file_service.main import app as file_app


async def run_server(app, port: int, name: str):
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
        access_log=False,
    )
    server = uvicorn.Server(config)
    print(f"[*] Started {name} on http://0.0.0.0:{port}")
    await server.serve()


async def main():
    print("=" * 60)
    print("AgentShield Downstream Tool Services Starting...")
    print("=" * 60)
    await asyncio.gather(
        run_server(customer_app, 8001, "Customer Database Service"),
        run_server(email_app, 8002, "Email Service"),
        run_server(file_app, 8003, "File Storage Service"),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nAll tool services stopped.")
        sys.exit(0)
