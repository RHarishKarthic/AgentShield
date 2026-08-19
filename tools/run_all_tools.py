"""
Unified Tool Services Launcher.

Starts the downstream mock microservices:
- Customer Database API
- Email Service API
- File Storage API

Binds to Render's $PORT for cloud deployment while maintaining local multi-port support.
"""

import asyncio
import os
import sys

import uvicorn
from fastapi import FastAPI

from tools.customer_service.main import app as customer_app
from tools.email_service.main import app as email_app
from tools.file_service.main import app as file_app

# Create unified FastAPI composite app for cloud deployment
unified_app = FastAPI(
    title="AgentShield Tool Services Gateway",
    description="Unified downstream tools gateway for Customer, Email, and File services.",
)


@unified_app.get("/health")
@unified_app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "AgentShield Tool Services",
        "tools": ["customer_database", "email_service", "file_service"],
    }


# Include routes from each sub-service into unified app
for route in customer_app.routes:
    if route not in unified_app.routes:
        unified_app.routes.append(route)

for route in email_app.routes:
    if route not in unified_app.routes:
        unified_app.routes.append(route)

for route in file_app.routes:
    if route not in unified_app.routes:
        unified_app.routes.append(route)


async def run_server(app, port: int, name: str):
    config = uvicorn.Config(
        app=app,
        host="0.0.0.0",
        port=port,
        log_level="info",
        access_log=False,
    )
    server = uvicorn.Server(config)
    print(f"[*] Started {name} on http://0.0.0.0:{port}")
    await server.serve()


async def main():
    print("=" * 60)
    print("AgentShield Downstream Tool Services Starting...")
    print("=" * 60)

    port = int(os.getenv("PORT", "8001"))

    # In cloud environments (e.g. Render), run unified server on assigned $PORT
    if os.getenv("ENVIRONMENT") == "production" or os.getenv("PORT"):
        print(f"[*] Running Unified Tool Services on Render PORT: {port}")
        await run_server(unified_app, port, "Unified Tool Services")
    else:
        # In local Docker Compose, run all 3 dedicated ports
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
