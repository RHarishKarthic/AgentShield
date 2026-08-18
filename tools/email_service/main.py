"""
Email Microservice API.

Provides endpoints for sending internal and external emails,
and retrieving the dispatch audit log.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Email Service",
    description="Microservice for sending internal and external emails on behalf of agents.",
    version="1.0.0",
)

# In-memory log of dispatched emails
EMAIL_LOGS: list[dict[str, Any]] = []


class EmailRequest(BaseModel):
    recipient: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject line", max_length=256)
    body: str = Field(..., description="Email body content")
    email_type: str = Field(
        default="internal",
        description="Type of email: 'internal' or 'external'",
    )


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "email_service"}


@app.post("/send")
async def send_email(req: EmailRequest) -> dict[str, Any]:
    """Dispatch an email message."""
    if not req.recipient:
        raise HTTPException(status_code=400, detail="Recipient email is required")

    log_entry = {
        "id": len(EMAIL_LOGS) + 1,
        "recipient": req.recipient,
        "subject": req.subject,
        "body_preview": req.body[:50] + ("..." if len(req.body) > 50 else ""),
        "email_type": req.email_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "SENT",
    }
    EMAIL_LOGS.append(log_entry)

    return {
        "status": "sent",
        "message_id": log_entry["id"],
        "recipient": req.recipient,
        "email_type": req.email_type,
        "message": f"Email successfully dispatched to {req.recipient}",
    }


@app.get("/logs")
async def get_email_logs() -> list[dict[str, Any]]:
    """Retrieve history of sent emails."""
    return EMAIL_LOGS


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
