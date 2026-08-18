"""Quick test script for Stage 1 verification."""

import httpx

BASE = "http://localhost:8000"

# Test 1: Health endpoint
r = httpx.get(f"{BASE}/health")
print("=== /health ===")
print(f"Status: {r.status_code}")
print(f"Body: {r.json()}")
print()

# Test 2: Readiness endpoint
r2 = httpx.get(f"{BASE}/ready")
print("=== /ready ===")
print(f"Status: {r2.status_code}")
print(f"Body: {r2.json()}")
print()

# Test 3: OpenAPI spec
r3 = httpx.get(f"{BASE}/openapi.json")
spec = r3.json()
print("=== OpenAPI Spec ===")
print(f"Title: {spec['info']['title']}")
print(f"Version: {spec['info']['version']}")
print(f"Paths: {list(spec['paths'].keys())}")
print()

# Test 4: Security headers
r4 = httpx.get(f"{BASE}/health")
print("=== Security Headers ===")
for h in [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Referrer-Policy",
    "Cache-Control",
    "X-Request-ID",
]:
    print(f"  {h}: {r4.headers.get(h, 'MISSING')}")
print()

# Test 5: Swagger UI
r5 = httpx.get(f"{BASE}/docs")
print("=== Swagger UI ===")
print(f"Status: {r5.status_code}")
print(f"Contains SwaggerUI: {'swagger' in r5.text.lower()}")
print()

# Test 6: 404 handling
r6 = httpx.get(f"{BASE}/nonexistent")
print("=== 404 Test ===")
print(f"Status: {r6.status_code}")
print()

print("=" * 50)
print(
    "STAGE 1 VERIFICATION: ALL CHECKS PASSED"
    if all(
        [
            r.status_code == 200,
            r2.status_code == 200,
            r3.status_code == 200,
            r4.headers.get("X-Request-ID") is not None,
            r5.status_code == 200,
            r6.status_code == 404,
        ]
    )
    else "STAGE 1 VERIFICATION: SOME CHECKS FAILED"
)
