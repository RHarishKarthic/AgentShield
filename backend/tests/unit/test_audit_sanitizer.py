"""
Unit Tests for Audit Parameter Sanitizer.
"""

from app.audit.sanitizer import sanitize_parameters


def test_sanitizer_redacts_sensitive_keys():
    raw_params = {
        "customer_id": 101,
        "api_key": "sk-secret-token-12345",
        "auth_token": "bearer-jwt-token-9999",
        "password": "SuperSecretPassword!",
        "profile": {
            "name": "Alice",
            "card_number": "4111-2222-3333-4444",
            "nested_secret": "hidden-value",
        },
    }

    sanitized = sanitize_parameters(raw_params)

    assert sanitized["customer_id"] == 101
    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["auth_token"] == "[REDACTED]"
    assert sanitized["password"] == "[REDACTED]"
    assert sanitized["profile"]["name"] == "Alice"
    assert sanitized["profile"]["card_number"] == "[REDACTED]"
    assert sanitized["profile"]["nested_secret"] == "[REDACTED]"


def test_sanitizer_truncates_long_strings():
    huge_string = "X" * 1000
    raw_params = {"content": huge_string}
    sanitized = sanitize_parameters(raw_params, max_string_len=100)

    assert len(sanitized["content"]) < 200
    assert "[TRUNCATED (1000 chars)]" in sanitized["content"]
