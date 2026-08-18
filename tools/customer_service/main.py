"""
Customer Database Microservice API.

Provides real endpoints for:
- Authenticating a customer
- Retrieving customer records (used in sequence rules and scope tests)
- Updating customer records
"""

from typing import Any

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from tools.customer_service.data import CUSTOMERS_DB

app = FastAPI(
    title="Customer Database Service",
    description="Microservice providing customer management tools for AI agents.",
    version="1.0.0",
)


class AuthRequest(BaseModel):
    customer_id: int = Field(..., description="Customer ID to authenticate")
    credentials: str | None = Field(default="passcode-valid", description="Auth credential")


class UpdateCustomerRequest(BaseModel):
    customer_id: int = Field(..., description="Customer ID to update")
    name: str | None = None
    email: str | None = None
    notes: str | None = None
    tier: str | None = None


class CustomerQueryRequest(BaseModel):
    customer_id: int = Field(..., description="Customer ID to fetch")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "customer_database"}


@app.get("/customers")
async def list_customers() -> list[dict[str, Any]]:
    """Return all customer summaries."""
    return [{"customer_id": c["customer_id"], "name": c["name"], "tier": c["tier"]} for c in CUSTOMERS_DB.values()]


@app.post("/authenticate")
@app.post("/authenticate_customer")
async def authenticate_customer(req: AuthRequest) -> dict[str, Any]:
    """
    Authenticate customer session.
    First step in the mandatory sequence rule:
    authenticate_customer -> get_customer_data -> update_customer.
    """
    customer_id = req.customer_id
    if customer_id not in CUSTOMERS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer ID {customer_id} not found in database",
        )

    CUSTOMERS_DB[customer_id]["authenticated"] = True
    return {
        "status": "authenticated",
        "customer_id": customer_id,
        "name": CUSTOMERS_DB[customer_id]["name"],
        "session_token": f"token-cust-{customer_id}-valid",
        "message": f"Customer {customer_id} successfully authenticated",
    }


@app.post("/get_customer")
@app.post("/get_customer_data")
@app.get("/customers/{customer_id}")
async def get_customer(customer_id: int | None = None, body: CustomerQueryRequest | None = None) -> dict[str, Any]:
    """Retrieve customer profile."""
    target_id = customer_id if customer_id is not None else (body.customer_id if body else None)
    if target_id is None:
        raise HTTPException(status_code=400, detail="customer_id is required")

    if target_id not in CUSTOMERS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer ID {target_id} not found",
        )

    return {
        "status": "success",
        "customer": CUSTOMERS_DB[target_id],
    }


@app.post("/update_customer")
async def update_customer(req: UpdateCustomerRequest) -> dict[str, Any]:
    """Update customer record."""
    customer_id = req.customer_id
    if customer_id not in CUSTOMERS_DB:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer ID {customer_id} not found",
        )

    cust = CUSTOMERS_DB[customer_id]
    if req.name is not None:
        cust["name"] = req.name
    if req.email is not None:
        cust["email"] = req.email
    if req.notes is not None:
        cust["notes"] = req.notes
    if req.tier is not None:
        cust["tier"] = req.tier

    return {
        "status": "updated",
        "customer_id": customer_id,
        "updated_customer": cust,
        "message": f"Customer {customer_id} record successfully updated",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
