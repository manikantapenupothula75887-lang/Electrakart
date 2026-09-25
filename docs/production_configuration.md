# ElectraKart — Production Configuration & Hardening Guide

**System Name:** ElectraKart Hyperlocal B2B/B2C Marketplace  
**Document Version:** 1.0.0  
**Target Release:** Release Freeze (Phase 3H Hardened)  
**Applicability:** Production Cloud, Dedicated VM, Container Orchestration (Docker / Kubernetes / ECS)

---

## 1. Overview & Operational Principles

This document specifies the exact configuration, environment variables, security baselines, and infrastructure prerequisites required to run the ElectraKart platform in a production environment. 

### Core Deployment Principles
1. **Zero Mock Policies in Production:** When `NODE_ENV=production`, the application strictly rejects mock payment, mock OCR, mock maps, and mock communication providers at startup.
2. **PostgreSQL Mandatory:** The embedded PGlite database is prohibited in production. A production deployment requires a remote or managed PostgreSQL 15+ cluster.
3. **Strict Secrets Isolation:** Real credentials and private keys must never be committed to source control or baked into container images. They must be injected at runtime via environment variables or a secure cloud secret manager.
4. **Authoritative Server Pricing:** Client price overrides are ignored. All financial calculations occur on the backend using database records.
5. **Fail-Closed Tenancy:** Missing authorization or tenant claims immediately result in `401 Unauthorized` or `403 Forbidden`.

---

## 2. Required Infrastructure

| Component | Minimum Specification | Recommended Production Service |
| :--- | :--- | :--- |
| **PostgreSQL Database** | PostgreSQL 15 or 16, 2 vCPU, 4GB RAM, SSL enabled, connection pool $\ge 25$ | AWS RDS PostgreSQL, Supabase Dedicated, Google Cloud SQL |
| **Backend Runtime** | Node.js v20.x or v22.x LTS (x86_64 or arm64), 1 vCPU, 1GB RAM | Containerized (Docker / ECS / Render / Railway / K8s) |
| **Frontend Hosting** | Static file hosting with HTTP/2 and SPA rewrite support (all non-asset routes $\to$ `/index.html`) | Cloudflare Pages, AWS S3 + CloudFront, Vercel, Nginx reverse proxy |
| **Domain & TLS** | Valid fully qualified domain name (FQDN) with automated TLS (Let's Encrypt or Cloud ACM) | Cloudflare, AWS Route 53, Let's Encrypt Certbot |
| **Object Storage (OCR Uploads)** | S3-compatible private bucket with IAM role access | AWS S3, Google Cloud Storage, Cloudflare R2 |

---

## 3. Environment Variables & Required Secrets

> [!CAUTION]
> **NEVER** commit actual secret values to git. The list below contains variable **NAMES ONLY**.

### 3.1 Backend Core Configuration
| Variable Name | Required? | Description | Example / Recommended Format |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **REQUIRED** | Execution environment. Must be `production`. | `production` |
| `PORT` or `API_PORT` | **REQUIRED** | TCP port the Fastify server binds to. | `5000` |
| `HOST` or `API_HOST` | **REQUIRED** | Host network interface. In containers, bind to `0.0.0.0`. | `0.0.0.0` |
| `DATABASE_URL` | **REQUIRED** | PostgreSQL connection URI. Must start with `postgresql://` or `postgres://`. | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | **REQUIRED** | High-entropy cryptographic string ($\ge 32$ characters). Insecure default values are rejected. | Generated random 64-character hexadecimal or base64 string |
| `JWT_EXPIRES_IN` | **REQUIRED** | JWT access token validity period. | `86400` (seconds) or `24h` |
| `CORS_ORIGIN` | **REQUIRED** | Allowed client origins (comma-separated). Wildcard `*` is strictly rejected. | `https://electrakart.com,https://app.electrakart.com` |
| `LOG_LEVEL` | **REQUIRED** | Application logging verbosity. | `info` or `warn` |
| `RATE_LIMIT_MAX` | OPTIONAL | Maximum requests permitted per client IP within the rate limit window. | `100` (Default: 100 in prod) |
| `RATE_LIMIT_WINDOW_MS` | OPTIONAL | Rate limit time window in milliseconds. | `60000` (1 minute) |
| `BODY_LIMIT_BYTES` | OPTIONAL | Maximum request body payload limit in bytes. | `26214400` (25 MB) |
| `DB_POOL_MAX` | OPTIONAL | Maximum active connections in PostgreSQL connection pool. | `20` to `50` |
| `DB_IDLE_TIMEOUT_MS` | OPTIONAL | Idle connection cleanup timeout in ms. | `30000` |
| `DB_CONNECTION_TIMEOUT_MS` | OPTIONAL | Connection establishment timeout in ms. | `5000` |
| `AUTO_SEED` | OPTIONAL | Database automatic seed flag. Must be `false` in production. | `false` |

---

## 4. Third-Party Provider Configuration

Every external provider is classified below as either **OPTIONAL** or **REQUIRED FOR SPECIFIC PRODUCTION FEATURE**.

### 4.1 Payment Gateway
- **Classification:** `REQUIRED FOR DIGITAL PAYMENTS & CHECKOUT`
- **Supported Providers:** `razorpay` | `cashfree` (Value `mock` will abort production startup)
- **Configuration Variables:**
  - `PAYMENT_PROVIDER`: Set to `razorpay` or `cashfree`.
  - `RAZORPAY_KEY_ID`: Razorpay live API key ID (`rzp_live_...`).
  - `RAZORPAY_KEY_SECRET`: Razorpay live API key secret.
  - `RAZORPAY_WEBHOOK_SECRET`: Razorpay webhook signature verification secret.
  - `CASHFREE_APP_ID`: Cashfree production Client ID (if using Cashfree).
  - `CASHFREE_SECRET_KEY`: Cashfree production Client Secret (if using Cashfree).
  - `CASHFREE_API_VERSION`: Cashfree API version (default: `2023-08-01`).

### 4.2 OCR & Contractor Estimate Ingestion
- **Classification:** `REQUIRED FOR AUTOMATED ESTIMATE & BILL OF MATERIALS EXTRACTION`
- **Supported Providers:** `google_document_ai` | `aws_textract` (Value `mock` will abort production startup)
- **Configuration Variables:**
  - `OCR_PROVIDER`: Set to `google_document_ai` or `aws_textract`.
  - *For Google Document AI:*
    - `GOOGLE_DOC_AI_PROJECT_ID`: Google Cloud Project ID.
    - `GOOGLE_DOC_AI_LOCATION`: Processor region (e.g. `us` or `eu`).
    - `GOOGLE_DOC_AI_PROCESSOR_ID`: Live Document AI Processor ID.
    - `GOOGLE_APPLICATION_CREDENTIALS`: Path or secret vault reference to GCP Service Account JSON.
  - *For AWS Textract:*
    - `AWS_TEXTRACT_REGION`: AWS region (e.g. `ap-south-1`).
    - `AWS_TEXTRACT_ACCESS_KEY_ID`: AWS IAM access key ID with Textract permissions.
    - `AWS_TEXTRACT_SECRET_ACCESS_KEY`: AWS IAM secret access key.

### 4.3 Maps & Geospatial Routing
- **Classification:** `OPTIONAL EXTERNAL INTEGRATION` (Defaults to `disabled` in production)
- **Supported Providers:** `disabled` | `google_maps` | `mapbox` (Value `mock` will abort production startup)
- **Configuration Variables:**
  - `MAPS_PROVIDER`: Set to `disabled`, `google_maps`, or `mapbox`. When `disabled`, distances are computed using transparent mathematical Haversine geodesic calculations (`mode: 'GEODESIC_FALLBACK'`, `is_fallback: true`) without external API calls or billing.
  - `GOOGLE_MAPS_API_KEY`: Live Google Maps Platform API key (strictly required only when `MAPS_PROVIDER=google_maps`).
  - `MAPBOX_ACCESS_TOKEN`: Live Mapbox public/secret token (strictly required only when `MAPS_PROVIDER=mapbox`).

### 4.4 Transactional Email Notifications
- **Classification:** `REQUIRED FOR ORDER INVOICES & EMAIL ALERTS`
- **Supported Providers:** `resend` | `sendgrid` | `smtp`
- **Configuration Variables:**
  - `EMAIL_ENABLED`: Set to `true`.
  - `EMAIL_PROVIDER`: Set to `resend`, `sendgrid`, or `smtp`.
  - `RESEND_API_KEY`: Live Resend API key (`re_...`).
  - `EMAIL_FROM`: Verified sender address (e.g. `ElectraKart Alerts <alerts@electrakart.com>`).
  - `EMAIL_WEBHOOK_SECRET`: Webhook signing secret for delivery receipts.
  - *If using SMTP:* `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

### 4.5 Transactional SMS Notifications & OTP Delivery
- **Classification:** `REQUIRED FOR CUSTOMER OTP LOGIN & DISPATCH ALERTS`
- **Supported Providers:** `twilio` | `msg91` | `fast2sms`
- **Configuration Variables:**
  - `SMS_ENABLED`: Set to `true`.
  - `SMS_PROVIDER`: Set to `twilio`, `msg91`, or `fast2sms`.
  - `TWILIO_ACCOUNT_SID`: Live Twilio Account SID.
  - `TWILIO_AUTH_TOKEN`: Live Twilio Auth Token.
  - `TWILIO_FROM_NUMBER`: Registered sender phone number or approved alphanumeric sender ID.
  - `SMS_WEBHOOK_SECRET`: Webhook signing secret for status callbacks.

### 4.6 WhatsApp Business Notifications
- **Classification:** `OPTIONAL (ENHANCED CUSTOMER ENGAGEMENT)`
- **Supported Providers:** `meta_whatsapp` | `twilio_whatsapp`
- **Configuration Variables:**
  - `WHATSAPP_ENABLED`: Set to `true` if activated.
  - `WHATSAPP_PROVIDER`: Set to `meta_whatsapp` or `twilio_whatsapp`.
  - `WHATSAPP_API_TOKEN`: Permanent System User Access Token from Meta Business Manager.
  - `WHATSAPP_PHONE_NUMBER_ID`: Meta Cloud API Phone Number ID.
  - `WHATSAPP_WEBHOOK_SECRET`: Webhook verification token.

---

## 5. Frontend Production Configuration

The React 19 SPA frontend requires two build-time environment variables:

| Variable Name | Required Value | Security Context |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `https://api.electrakart.com/api/v1` | Publicly accessible URL of the production API. Never point to `localhost`. |
| `VITE_ALLOW_DEMO_FALLBACK` | `false` | **MUST BE FALSE** in production. Completely disables mock and local fallback data. |

> [!WARNING]
> No internal server secrets (such as `JWT_SECRET`, database passwords, or provider API secrets) should ever be prefixed with `VITE_` or referenced in frontend code.

---

## 6. Security Hardening & Pre-Launch Verification

Before opening network traffic to production users, the operations team must verify the following:

1. **JWT Secret Strength:**
   - Execute: Generate high-entropy 256-bit key:
     ```bash
     openssl rand -base64 48
     ```
   - Verify that the secret length is $\ge 32$ characters and not a default string.
2. **CORS Lockdown:**
   - Confirm that `CORS_ORIGIN` matches the exact scheme, domain, and port of the frontend SPA.
3. **Database SSL:**
   - Ensure the database connection string contains `sslmode=require` or `sslmode=verify-full`.
4. **Security Headers (Helmet & Nginx):**
   - Confirm that API and web responses deliver:
     - `Content-Security-Policy`
     - `X-Content-Type-Options: nosniff`
     - `X-Frame-Options: SAMEORIGIN`
     - `Referrer-Policy: strict-origin-when-cross-origin`
     - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
5. **Rate Limiting:**
   - Confirm that global rate limiting is active while `/api/v1/health` and `/api/v1/ready` remain accessible for monitoring.
6. **Statutory Tax & Regulatory Verification:**
   - Confirm that GSTIN formats, tax breakdown rates (CGST/SGST/IGST), and TDS deduction rates have received formal sign-off from a certified Indian Chartered Accountant / Tax Consultant before executing commercial transactions.
