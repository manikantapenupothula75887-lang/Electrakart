# ElectraKart Production Readiness & Deployment Checklist

This document details the production operational requirements, environment configuration, database migration protocols, and security hardening for deploying ElectraKart.

---

## 1. Production Build & Verification

Before promoting code to production, both client and server builds must complete cleanly:

### Backend Build
```powershell
cd backend
npm ci
npm run build
```
- Transpiles TypeScript to `dist/` via `tsc`.
- Copies migration SQL files to `dist/db/migrations`.
- Verifies zero type errors and missing imports.

### Frontend Build
```powershell
npm ci
npm run build
```
- Bundles React 19 application via `vite build`.
- Generates optimized static assets in `dist/`.

---

## 2. Health & Readiness Observability

ElectraKart exposes RFC-compliant monitoring endpoints:

- **Liveness Probe**: `GET /api/v1/health`
  - Returns `200 OK` with uptime, memory usage, timestamp, and version.
  - Excluded from rate limiting.
- **Readiness Probe**: `GET /api/v1/ready`
  - Performs an active database connection check (`SELECT 1`).
  - Returns `200 OK` if the database pool is healthy; returns `503 Service Unavailable` during startup or connectivity degradation.

---

## 3. Environment Variables Reference

### Backend Production Configuration (`backend/.env`)

```ini
# Core Environment
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DATABASE_URL=postgres://user:password@host:5432/electrakart_production?sslmode=require
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

# Security & Secrets
JWT_SECRET=super_secret_production_key_minimum_32_characters
JWT_EXPIRES_IN=86400
CORS_ORIGIN=https://electrakart.in,https://electrakart-web.onrender.com

# Rate Limiting & Limits
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
BODY_LIMIT_BYTES=10485760

# Payment Gateway (Razorpay)
PAYMENT_PROVIDER=razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Document AI / OCR
OCR_PROVIDER=google_document_ai
GOOGLE_DOC_AI_PROJECT_ID=electrakart-prod
GOOGLE_DOC_AI_LOCATION=us
GOOGLE_DOC_AI_PROCESSOR_ID=xxxxxxxxxxxxxxxx

# Automated Logistics (Rapido)
DELIVERY_PROVIDER=rapido
RAPIDO_API_KEY=rap_live_xxxxxxxxxxxxxx
RAPIDO_CLIENT_ID=rap_client_xxxxxxxxxxxxxx
RAPIDO_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAPIDO_BASE_URL=https://api.rapido.bike/v2
RAPIDO_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

### Frontend Production Configuration (`.env.production`)

```ini
VITE_API_BASE_URL=https://electrakart-api.onrender.com/api/v1
VITE_ALLOW_DEMO_FALLBACK=false
```

---

## 4. Security Hardening Checklist

1. **Strict Cross-Origin Resource Sharing (CORS)**:
   - Locked strictly to verified customer and partner domains in production.
2. **Helmet Security Directives**:
   - `Content-Security-Policy`: Default-src `'self'`, fonts from Google Fonts, styles from trusted sources.
   - `Strict-Transport-Security (HSTS)`: `max-age=31536000; includeSubDomains`.
3. **Structured Request Logging & Sensitive Field Redaction**:
   - Passwords, hashes, JWT tokens, bank accounts, OTPs, and webhook secrets are automatically redacted from logs.
4. **Idempotency Defense**:
   - Enforced on all financial charges, inventory reservations, delivery dispatches, and incoming webhooks.
5. **Graceful Teardown**:
   - Traps `SIGTERM` and `SIGINT` to gracefully drain HTTP requests, close open SSE streaming connections, and terminate the database connection pool cleanly.
