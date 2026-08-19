#!/bin/sh
# =============================================================================
# AgentShield Frontend Runtime Config Injector
# Writes /config.js with runtime env vars before nginx starts.
# This allows API base URL to be changed per-environment without rebuilding.
# =============================================================================

set -e

API_BASE="${API_BASE:-/api/v1}"

echo "[agentshield] Injecting runtime config..."
echo "[agentshield]   API_BASE = $API_BASE"

# Write runtime config into the served static directory
cat > /usr/share/nginx/html/config.js << EOF
// AgentShield runtime configuration - auto-generated at container startup
window.__AGENTSHIELD_CONFIG__ = {
  apiBase: "${API_BASE}"
};
EOF

echo "[agentshield] config.js written successfully."

# Hand off to the default nginx entrypoint
exec /docker-entrypoint.sh nginx -g "daemon off;"
