# ElectraKart — Production Deployment Guide

This document outlines the standard operating procedures, architectural topology, configuration requirements, and step-by-step deployment instructions for taking ElectraKart into production.

---

## 1. Architectural Topology

ElectraKart follows a cloud-native, decoupled, zero-trust microservice/modular architecture:

```
                          [ Internet Traffic / CDN / WAF (Cloudflare) ]
                                            │
                                            ▼
                           [ Reverse Proxy / Nginx Gateway ]
                                  (SSL/TLS 1.3 Termination)
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [ Static SPA Assets ]                         [ Fastify API Service ]
          - React 19 + Vite SPA                         - Node.js 22 LTS
          - Nginx Alpine Cache                          - Helmet + Rate Limit
          - Gzip Compression                            - RBAC & IDOR Enforcement
          - Port 80 / 443                               - Port 5000
                                                           │
                                                           ▼
                                                [ PostgreSQL 16 Cluster ]
                                                - AWS RDS / GCP Cloud SQL
                                                - Connection Pool (10-20)
                                                - 32 Normalized Tables
                                                - Row-Level Customer Views
```

---

## 2. Environment Variables & Secret Configuration

Production strictly prohibits hardcoded secrets and silent mock fallbacks. All secrets must be injected via secure environment variable injection (AWS Secrets Manager, Doppler, Vault, or container orchestration secrets).

### Backend (`backend/.env.production`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | **YES** | `production` | Enables production hardening, RFC 7807 error masking, and strict secret checks |
| `PORT` | NO | `5000` | HTTP port on which Fastify listens |
| `HOST` | NO | `0.0.0.0` | Bind address for container environments |
| `DATABASE_URL` | **YES** | *None* | Must be a valid PostgreSQL connection string (`postgresql://...`). PGlite is prohibited in production. |
| `JWT_SECRET` | **YES** | *None* | High-entropy random secret key (minimum 32 characters). Startup fails if missing or default. |
| `CORS_ORIGIN` | **YES** | *None* | Comma-delimited list of trusted client origins (e.g. `https://electrakart.in,https://admin.electrakart.in`). Wildcard `*` is prohibited. |
| `RATE_LIMIT_MAX` | NO | `100` | Maximum requests per client IP per window |
| `RATE_LIMIT_WINDOW_MS`| NO | `60000` | Rate limit window in milliseconds (1 minute) |
| `BODY_LIMIT_BYTES` | NO | `2097152` | Maximum HTTP body payload (2 MB) |
| `DB_POOL_MAX` | NO | `20` | Maximum concurrent connections in pg.Pool |
| `DB_IDLE_TIMEOUT_MS` | NO | `30000` | Connection pool idle timeout (30s) |
| `DB_CONNECTION_TIMEOUT_MS` | NO | `5000` | Database connection establishment timeout (5s) |
| `LOG_LEVEL` | NO | `warn` | Logging level (`fatal`, `error`, `warn`, `info`, `debug`) |
| `AUTO_SEED` | NO | `false` | Must remain `false` in production to prevent test data injection |

### Frontend Build Time Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | **YES** | `https://api.electrakart.in/api/v1` | Publicly accessible API base URL |
| `VITE_ALLOW_DEMO_FALLBACK`| **YES** | `false` | When `false`, suppresses silent mock data fallback on network failure |

---

## 3. Docker Container Deployment

### 3.1 Building Production Images

```bash
# 1. Build Backend Image
docker build -t electrakart-backend:latest ./backend

# 2. Build Frontend SPA Image
docker build \
  --build-arg VITE_API_BASE_URL=https://api.electrakart.in/api/v1 \
  --build-arg VITE_ALLOW_DEMO_FALLBACK=false \
  -t electrakart-frontend:latest .
```

### 3.2 Running via Docker Compose

```bash
# Copy and populate production secrets
cp .env.production.example .env.production
chmod 600 .env.production

# Start containerized stack
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

---

## 4. Health Checks & Kubernetes / ECS Probes

The backend exposes two dedicated observability endpoints:

### Liveness Probe (`GET /api/v1/health`)
- **Purpose**: Verifies that the Fastify HTTP process is running and accepting event loop cycles.
- **Rate Limit**: Exempt from rate limiting.
- **Expected Status**: `200 OK`
- **Response Format**:
  ```json
  {
    "status": "pass",
    "timestamp": "2026-09-19T17:30:00.000Z",
    "uptimeSeconds": 1845.2,
    "environment": "production"
  }
  ```

### Readiness Probe (`GET /api/v1/ready`)
- **Purpose**: Verifies that the service can actively serve database traffic and has 0 unapplied schema migrations.
- **Rate Limit**: Exempt from rate limiting.
- **Expected Status**: `200 OK` (or `503 Service Unavailable` if database is down or migrations are pending).
- **Response Format**:
  ```json
  {
    "status": "ready",
    "database": {
      "connected": true,
      "latencyMs": 3.4
    },
    "migrations": {
      "pendingCount": 0
    }
  }
  ```

### Kubernetes Pod Spec Example
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 15
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/v1/ready
    port: 5000
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 2
```

---

## 5. Graceful Shutdown

The backend listens for `SIGTERM` and `SIGINT` signals:
1. Rejects incoming new requests with HTTP 503.
2. Waits up to 10 seconds (`SHUTDOWN_TIMEOUT_MS = 10000`) for in-flight requests to complete.
3. Drains and closes the PostgreSQL connection pool.
4. Exits cleanly with code 0 without dropping active payment or quotation database transactions.

---

## 6. Zero-Downtime Deployment & Rollback Strategy

1. **Pre-flight**: Run migrations against PostgreSQL before updating app containers:
   ```bash
   npm run migrate
   ```
2. **Blue/Green Deployment**: Launch new backend containers running version `N+1`.
3. **Traffic Shift**: Switch reverse proxy routing once readiness probe returns `status: "ready"`.
4. **Rollback**: If error rate exceeds 0.5%, immediately revert DNS/proxy to version `N`.
