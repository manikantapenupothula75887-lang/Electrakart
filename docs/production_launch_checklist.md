# ElectraKart — Production Launch Readiness Checklist

**Release Target:** Release Freeze (Phase 3H Prepared)  
**Target Deployment Date:** TBD (Pending External Infrastructure & Live Provider Provisioning)  
**Notice:** Do NOT mark any external infrastructure or live provider item as verified until actual live cloud testing has been successfully executed and certified.

---

### Section 1: Code Release
- [ ] NOT VERIFIED — Backend TypeScript compilation passes with zero errors (`npm run build` in `backend`)
- [ ] NOT VERIFIED — Frontend production bundle builds with zero errors (`npm run build` in root)
- [ ] NOT VERIFIED — All 10 backend automated test suites pass with 100% success rate
- [ ] NOT VERIFIED — Zero margin leakage verified across all public and customer catalog endpoints
- [ ] NOT VERIFIED — Dead/debug code and local console logging removed from critical paths

### Section 2: Git Release
- [ ] NOT VERIFIED — Base commit verified on release branch (`phase-3h-production-preparation`)
- [ ] NOT VERIFIED — Production preparation tag `electrakart-phase3h-production-prepared` created
- [ ] NOT VERIFIED — Acceptance tag `electrakart-phase3h-final-acceptance` preserved as immutable baseline
- [ ] NOT VERIFIED — Working tree clean with zero untracked or uncommitted files
- [ ] NOT VERIFIED — Release commit pushed to upstream remote repository

### Section 3: PostgreSQL Database
- [ ] NOT VERIFIED — Dedicated PostgreSQL 15+ cluster provisioned in production cloud VPC
- [ ] NOT VERIFIED — Database connection string configured with SSL enforced (`sslmode=require`)
- [ ] NOT VERIFIED — Connection pooling parameters tuned for expected traffic (`DB_POOL_MAX` 20–50)
- [ ] NOT VERIFIED — PGlite embedded database verified completely disabled in production mode
- [ ] NOT VERIFIED — Database user granted minimum required operational privileges (no superuser in app runtime)

### Section 4: Environment Variables
- [ ] NOT VERIFIED — `NODE_ENV=production` set across all backend containers/processes
- [ ] NOT VERIFIED — `PORT` and `HOST=0.0.0.0` properly assigned and verified
- [ ] NOT VERIFIED — `AUTO_SEED=false` verified to prevent mock seed insertion on startup
- [ ] NOT VERIFIED — `CORS_ORIGIN` restricted strictly to production frontend domains (no `*`)
- [ ] NOT VERIFIED — `VITE_ALLOW_DEMO_FALLBACK=false` verified in frontend production build
- [ ] NOT VERIFIED — `VITE_API_BASE_URL` pointing to production API domain (`https://api.electrakart.com/api/v1`)

### Section 5: Secrets Management
- [ ] NOT VERIFIED — Cryptographically secure `JWT_SECRET` generated ($\ge 64$ characters, high-entropy)
- [ ] NOT VERIFIED — Default, example, and development JWT secrets verified strictly rejected by startup guard
- [ ] NOT VERIFIED — Secrets stored in cloud vault (AWS Secrets Manager / Vault / Provider Env Vault)
- [ ] NOT VERIFIED — Zero secrets hardcoded in repository or exposed in frontend JavaScript bundles
- [ ] NOT VERIFIED — Webhook signing secrets securely injected for payment, email, SMS, and WhatsApp

### Section 6: Payment Gateway
- [ ] NOT VERIFIED — Live Razorpay merchant account verified and KYC completed
- [ ] NOT VERIFIED — Live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` configured in production environment
- [ ] NOT VERIFIED — Razorpay webhook endpoint registered (`https://api.electrakart.com/api/v1/payments/webhook`)
- [ ] NOT VERIFIED — `RAZORPAY_WEBHOOK_SECRET` configured and HMAC-SHA256 signature verification verified
- [ ] NOT VERIFIED — Test end-to-end live ₹1 transaction executed and refunded successfully

### Section 7: OCR & Estimate Ingestion
- [ ] NOT VERIFIED — Google Document AI or AWS Textract production processor provisioned
- [ ] NOT VERIFIED — IAM role or Service Account credentials injected with minimal required OCR permissions
- [ ] NOT VERIFIED — File upload size limit enforced at 25MB with binary magic-byte verification active
- [ ] NOT VERIFIED — S3 / GCS cloud object storage bucket configured for document storage
- [ ] NOT VERIFIED — End-to-end sample contractor electrical estimate processed and verified

### Section 8: Maps & Geospatial Routing
- [ ] NOT VERIFIED — Google Maps Platform or Mapbox production account active with billing enabled
- [ ] NOT VERIFIED — Production API key restricted by IP address to backend server egress IPs
- [ ] NOT VERIFIED — Geocoding and distance matrix APIs enabled on Google Cloud Console
- [ ] NOT VERIFIED — Local fallback Haversine distance engine verified as secondary failover

### Section 9: Transactional Email
- [ ] NOT VERIFIED — Production SendGrid, Resend, or AWS SES account active with dedicated IP
- [ ] NOT VERIFIED — Domain DNS records verified: SPF (`v=spf1 ...`), DKIM, and DMARC for `electrakart.com`
- [ ] NOT VERIFIED — Transactional email templates (order confirmation, tax invoice, dispatch alert) verified
- [ ] NOT VERIFIED — Email bounce and complaint webhook handling configured and active

### Section 10: Transactional SMS & OTP
- [ ] NOT VERIFIED — Indian Telecom DLT (Distributed Ledger Technology) Entity registration approved
- [ ] NOT VERIFIED — Sender Header / Sender ID approved on DLT portal (e.g. `ELKART`)
- [ ] NOT VERIFIED — SMS OTP and transactional message templates registered and approved on DLT
- [ ] NOT VERIFIED — Twilio / Msg91 production account funded with live SMS routing verified to Indian mobile numbers
- [ ] NOT VERIFIED — 4-digit handover OTP delivery tested to physical recipient mobile phone

### Section 11: WhatsApp Business Communications
- [ ] NOT VERIFIED — Meta Business Manager business verification completed
- [ ] NOT VERIFIED — WhatsApp Business API Phone Number ID and System User token generated
- [ ] NOT VERIFIED — High-priority transactional WhatsApp message templates submitted and approved by Meta
- [ ] NOT VERIFIED — Webhook verification token and subscription configured on Meta Developer portal

### Section 12: Domain & DNS
- [ ] NOT VERIFIED — Production domains registered: `electrakart.com`, `api.electrakart.com`, `app.electrakart.com`
- [ ] NOT VERIFIED — DNS A/CNAME records configured with low TTL (300s) during initial launch window
- [ ] NOT VERIFIED — Anycast CDN / Cloudflare proxy enabled for DDoS mitigation and static asset caching
- [ ] NOT VERIFIED — Apex domain redirection configured (`electrakart.com` $\to$ `https://www.electrakart.com` or vice versa)

### Section 13: HTTPS & Transport Security
- [ ] NOT VERIFIED — Automated TLS/SSL certificate provisioned and valid (Let's Encrypt / AWS ACM)
- [ ] NOT VERIFIED — HTTP to HTTPS automatic 301 redirection active on all endpoints
- [ ] NOT VERIFIED — HSTS (`Strict-Transport-Security`) header configured with minimum 1-year max-age
- [ ] NOT VERIFIED — TLS 1.2 and TLS 1.3 enforced (TLS 1.0 and 1.1 disabled)

### Section 14: Database Migration
- [ ] NOT VERIFIED — Production PostgreSQL database initialized
- [ ] NOT VERIFIED — Migration runner executed sequentially (`001` through `010`) against live database
- [ ] NOT VERIFIED — `schema_migrations` table verified with all 10 applied migration records
- [ ] NOT VERIFIED — Foreign key constraints, unique constraints, and check constraints verified intact
- [ ] NOT VERIFIED — Initial system administrator user provisioned via secure CLI tool

### Section 15: Production Smoke Testing
- [ ] NOT VERIFIED — Health check endpoint responds: `GET https://api.electrakart.com/api/v1/health` (HTTP 200)
- [ ] NOT VERIFIED — Readiness probe responds: `GET https://api.electrakart.com/api/v1/ready` (HTTP 200)
- [ ] NOT VERIFIED — Customer OTP authentication flow executed successfully on live site
- [ ] NOT VERIFIED — Product catalog search and product detail retrieval verified
- [ ] NOT VERIFIED — Cart checkout, split fulfillment calculation, and tax invoice generation verified

### Section 16: Monitoring & Observability
- [ ] NOT VERIFIED — Centralized structured logging configured (Datadog / CloudWatch / Grafana Loki)
- [ ] NOT VERIFIED — PII and credential redaction active in production logs
- [ ] NOT VERIFIED — Application Performance Monitoring (APM) and error alerting (Sentry / Datadog) active
- [ ] NOT VERIFIED — Critical business alerts configured (payment failures, high error rates, unhandled rejections)

### Section 17: Backup & Disaster Recovery
- [ ] NOT VERIFIED — Automated daily PostgreSQL backups enabled with 30-day retention
- [ ] NOT VERIFIED — Point-in-time recovery (PITR) enabled with Write-Ahead Logging (WAL) archiving
- [ ] NOT VERIFIED — Test database restore executed successfully from backup archive
- [ ] NOT VERIFIED — RPO (Recovery Point Objective $\le 15$ min) and RTO (Recovery Time Objective $\le 1$ hr) verified

### Section 18: Tax, Legal & Accounting Verification
- [ ] NOT VERIFIED — Certified Indian Chartered Accountant / Tax Consultant formal review completed
- [ ] NOT VERIFIED — Applicable GST treatment (CGST 9% + SGST 9% vs IGST 18%) certified for marketplace transactions
- [ ] NOT VERIFIED — Applicable statutory TDS governing provisions, rates, and thresholds confirmed for 2026 transactions
- [ ] NOT VERIFIED — Merchant Terms of Service, Privacy Policy, Return/Refund Policy published on storefront
- [ ] NOT VERIFIED — Grievance Officer details and corporate registration details displayed on contact page

### Section 19: Launch Approval
- [ ] NOT VERIFIED — Engineering Team Lead release sign-off
- [ ] NOT VERIFIED — Security & Compliance audit sign-off
- [ ] NOT VERIFIED — Product / Business Operations sign-off
- [ ] NOT VERIFIED — Customer Support on-call roster staffed for launch window

### Section 20: Rollback & Contingency Plan
- [ ] NOT VERIFIED — Previous stable artifact release tagged and archived in container registry
- [ ] NOT VERIFIED — Database downward migration / rollback script documented and tested
- [ ] NOT VERIFIED — DNS fallback procedure documented to route traffic to maintenance page within 5 minutes
- [ ] NOT VERIFIED — Incident Commander designated with unilateral authority to trigger rollback
