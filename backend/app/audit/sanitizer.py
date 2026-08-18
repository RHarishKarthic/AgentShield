"""
Audit Parameter Sanitizer.

Redacts sensitive credentials, tokens, and PII from parameter payloads
before storing audit logs in PostgreSQL.
"""

from typing import Any

# Sensitive field name keywords to redact
SENSITIVE_KEYS = {
    "password",
    "token",
    "secret",
    "api_key",
    "apikey",
    "auth",
    "authorization",
    "credentials",
    "credential",
    "private_key",
    "access_token",
    "refresh_token",
    "card_number",
    "cvv",
    "ssn",
}


def sanitize_parameters(params: Any, max_string_len: int = 500) -> Any:
    """
    Recursively sanitize and redact sensitive fields in a parameters structure.

    Args:
        params: Arbitrary parameter data (dict, list, primitive).
        max_string_len: Max allowed length for a string before truncation.

    Returns:
        Deep sanitized copy of the parameters with secrets redacted.
    """
    if isinstance(params, dict):
        sanitized = {}
        for key, value in params.items():
            key_str = str(key).lower()
            if any(sens in key_str for sens in SENSITIVE_KEYS):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = sanitize_parameters(value, max_string_len)
        return sanitized

    elif isinstance(params, (list, tuple)):
        return [sanitize_parameters(item, max_string_len) for item in params]

    elif isinstance(params, str):
        if len(params) > max_string_len:
            return params[:max_string_len] + f"... [TRUNCATED ({len(params)} chars)]"
        return params

    return params
