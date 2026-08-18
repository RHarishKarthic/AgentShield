# AgentShield — Production Cloud Deployment Guide

This guide provides end-to-end instructions for deploying AgentShield in production across **AWS**, **Kubernetes**, and **Cloud PaaS (Railway / Render)**.

---

## 1. Architecture Topology

In production, AgentShield is deployed in a high-availability, multi-AZ configuration:
- **Compute**: Autoscaled container replicas (AWS ECS Fargate or Kubernetes Deployment with HPA)
- **Database**: Managed PostgreSQL 16 (AWS RDS or Cloud SQL) with automated backups and read replicas
- **In-Memory Cache**: Managed Redis 7 (AWS ElastiCache or Redis Enterprise) in cluster mode
- **Edge / CDN**: AWS CloudFront / Nginx Ingress terminating TLS and routing WebSocket / API traffic

---

## 2. Option A: Kubernetes Deployment (EKS / GKE / AKS)

### Prerequisites:
- `kubectl` configured with cluster admin context
- `helm` v3 installed
- Nginx Ingress Controller & Cert-Manager installed

### Step-by-Step Instructions:

```bash
# 1. Clone repository
git clone https://github.com/RHarishKarthic/AgentShield.git
cd AgentShield

# 2. Build and push container images to your container registry
docker build -t your-registry/agentshield-backend:latest ./backend
docker build -t your-registry/agentshield-frontend:latest ./frontend
docker build -t your-registry/agentshield-tools:latest ./tools

docker push your-registry/agentshield-backend:latest
docker push your-registry/agentshield-frontend:latest
docker push your-registry/agentshield-tools:latest

# 3. Apply Namespace, ConfigMaps, and Secrets
kubectl apply -f deploy/k8s/00-namespace-and-config.yaml

# 4. Deploy PostgreSQL & Redis StatefulSets
kubectl apply -f deploy/k8s/01-postgres-redis.yaml

# 5. Deploy Backend WAF, Tools, Frontend, and Ingress
kubectl apply -f deploy/k8s/02-apps.yaml

# 6. Verify rollout status
kubectl get pods -n agentshield -w
```

---

## 3. Option B: AWS Production Deployment (ECS Fargate + RDS + ElastiCache)

### Infrastructure Setup:
1. **Amazon RDS for PostgreSQL**:
   - Engine: PostgreSQL 16.2
   - Instance Class: `db.t4g.medium` (or `db.r6g.large` for high throughput)
   - Multi-AZ: Enabled
2. **Amazon ElastiCache for Redis**:
   - Engine: Redis 7.1
   - Node Type: `cache.t4g.medium`
   - In-transit encryption & Auth Token: Enabled
3. **AWS Application Load Balancer (ALB)**:
   - HTTPS Listener on port 443 with ACM SSL Certificate
   - Forward `/api/*` and `/ws/*` to Backend Target Group (Port 8000)
   - Forward `/*` to Frontend S3 / CloudFront or Nginx Target Group

### Deploying to ECS Fargate:
```bash
# 1. Login to Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# 2. Register Task Definition
aws ecs register-task-definition --cli-input-json file://deploy/aws/ecs-task-definition.json

# 3. Create or Update ECS Service
aws ecs update-service \
  --cluster agentshield-cluster \
  --service agentshield-service \
  --task-definition agentshield-production \
  --force-new-deployment
```

---

## 4. Option C: Single-Click Cloud PaaS Deployment (Render / Railway)

### Using Railway:
1. Connect your GitHub repository to [Railway.app](https://railway.app).
2. Add a **PostgreSQL** plugin and a **Redis** plugin from the template gallery.
3. Deploy the backend service pointing to the `backend/Dockerfile`.
4. Deploy the tools service pointing to `tools/Dockerfile`.
5. Deploy the frontend service pointing to `frontend/Dockerfile`.
6. Bind environment variables (`DATABASE_URL`, `REDIS_URL`, `WAF_API_KEY`).

---

## 5. Security & Production Checklist

- [x] **Zero Plaintext Secrets**: Passwords and keys injected via AWS Secrets Manager or Kubernetes Secrets.
- [x] **Non-Root Execution**: Backend and Tools run under non-privileged UID `1000`.
- [x] **Health & Readiness Probes**: Verified `/health` (liveness) and `/ready` (DB + Redis connectivity) probes.
- [x] **Rate Limiting Resilience**: Distributed Redis sliding-window prevents burst exhaustion.
- [x] **Fail-Closed Stance**: Unhandled exceptions or unavailable policy stores halt traffic securely.
- [x] **Audit Log Sanitization**: Sensitive keys redacted (`[REDACTED]`) before database storage.
