"""
Customer Database Service - Mock Database Store.

Provides sample customer records for testing data scope rules,
parameter validation, and sequence enforcement.
"""

from typing import Any

# Initial mock database of customers
# Customer IDs 101, 102, 103 are within typical authorized scopes
# Customer ID 999 represents an out-of-scope customer
CUSTOMERS_DB: dict[int, dict[str, Any]] = {
    101: {
        "customer_id": 101,
        "name": "Alice Johnson",
        "email": "alice.johnson@example.com",
        "tier": "enterprise",
        "balance": 15420.50,
        "department": "Engineering",
        "authenticated": False,
        "notes": "Primary account holder",
    },
    102: {
        "customer_id": 102,
        "name": "Bob Smith",
        "email": "bob.smith@example.com",
        "tier": "premium",
        "balance": 3200.00,
        "department": "Marketing",
        "authenticated": False,
        "notes": "Requires quarterly review",
    },
    103: {
        "customer_id": 103,
        "name": "Charlie Davis",
        "email": "charlie.davis@example.com",
        "tier": "standard",
        "balance": 450.75,
        "department": "Finance",
        "authenticated": False,
        "notes": "Standard plan",
    },
    999: {
        "customer_id": 999,
        "name": "Top Secret Executive",
        "email": "executive.confidential@enterprise.corp",
        "tier": "restricted",
        "balance": 999999.99,
        "department": "Executive Board",
        "authenticated": False,
        "notes": "Strictly restricted data - requires special clearance",
    },
}
