# =============================================================================
# AgentShield Frontend Multi-Stage Dockerfile
# Stage 1: Build static assets with Node.js
# Stage 2: Serve with Nginx Alpine + runtime config injection
# =============================================================================

FROM node:22-alpine AS build

WORKDIR /app

# Optional build-time base URL (for local builds / CI)
# On Render / cloud, API_BASE env var is injected at runtime via start.sh
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:1.27-alpine

# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy runtime startup script that injects config.js
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

# Use our entrypoint to inject config.js then start nginx
CMD ["/start.sh"]
