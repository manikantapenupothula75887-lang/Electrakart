# ElectraKart External Integrations Configuration Matrix

This document provides an exhaustive reference of all third-party and external services in the ElectraKart platform, their implementation status, required credentials, billing requirements, and fallback strategies.

---

## 1. External Integrations Matrix

| Integration Category | Provider | Implementation Status | Environment Variables Required | External Requirements | Mock Fallback in Dev/Test |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **Relational Database** | Managed PostgreSQL (Render / RDS / Supabase) | `IMPLEMENTED` | `DATABASE_URL` | PostgreSQL 16+ instance with SSL | Embedded PGlite (Local storage in `backend/data/pgdata`) |
| **Payment Gateway** | Razorpay Standard Checkout | `IMPLEMENTED` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Active Razorpay Merchant Account + KYC Approval | `MockPaymentProvider` (Simulates instant authorization & webhook capture) |
| **Payment Gateway** | Cashfree PG (Alternative) | `IMPLEMENTED` | `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_API_VERSION` | Cashfree Merchant Account | `MockPaymentProvider` |
| **Document AI / OCR** | Google Cloud Document AI | `IMPLEMENTED` | `GOOGLE_DOC_AI_PROJECT_ID`, `GOOGLE_DOC_AI_LOCATION`, `GOOGLE_DOC_AI_PROCESSOR_ID` | Google Cloud Paid Project with Document AI API & Custom Processor enabled | `MockOcrProvider` (Deterministic catalog matching) |
| **Document AI / OCR** | AWS Textract | `IMPLEMENTED` | `AWS_TEXTRACT_REGION`, `AWS_TEXTRACT_ACCESS_KEY_ID`, `AWS_TEXTRACT_SECRET_ACCESS_KEY` | AWS Account with Amazon Textract IAM permissions | `MockOcrProvider` |
| **Logistics & Delivery** | Rapido B2B Developer API | `IMPLEMENTED` | `RAPIDO_API_KEY`, `RAPIDO_CLIENT_ID`, `RAPIDO_CLIENT_SECRET`, `RAPIDO_BASE_URL`, `RAPIDO_WEBHOOK_SECRET` | Official Rapido Enterprise/Business Partnership Approval | `MockDeliveryProvider` (Instant booking, simulated tracking URLs) |
| **Fleet / Mobility Telemetry** | Google Maps Mobility / Fleet Engine | `ARCHITECTED` | `GOOGLE_MAPS_API_KEY`, `FLEET_ENGINE_PROJECT_ID` | Commercial Google Maps Mobility agreement with Google Cloud | Internal Driver Telemetry API (`/deliveries/driver/location`) |
| **Maps & Tiles** | OpenStreetMap / Vector SVG Tiles | `IMPLEMENTED` | None (Free open data tiles) | Public Internet access | Native Vector SVG Grid & projection |
| **Email Dispatch** | Resend / SMTP | `IMPLEMENTED` | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Verified Sending Domain (SPF/DKIM/DMARC) | In-Memory / Console Logger |
| **SMS Dispatch** | Twilio / Fast2SMS | `IMPLEMENTED` | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Approved DLT Header & SMS Templates (India Telecom Regulatory) | In-App Notification Center |
| **WhatsApp Notifications**| Meta Cloud API / Twilio WhatsApp | `IMPLEMENTED` | `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Verified Meta Business Account + WhatsApp Template Approval | In-App Notification Center |
| **Real-Time Telemetry** | Native Server-Sent Events (SSE) | `IMPLEMENTED` | None (Native HTTP streaming) | Standard HTTP/1.1 or HTTP/2 proxy | Built-in EventHub pub/sub |

---

## 2. Strict Production Guard Rules

1. **No Silent Mocking in Production**:
   - In `NODE_ENV=production`, if `PAYMENT_PROVIDER=razorpay` is declared without `RAZORPAY_KEY_ID`, the server will refuse to process live payments and report a configuration error rather than falling back to simulated charges.
   - Similarly, if `DELIVERY_PROVIDER=rapido` is declared without API credentials, `RapidoDeliveryProvider` flags `RAPIDO_NOT_CONFIGURED` without mock-faking or scraping.
2. **Zero-Credentials Leakage in Frontend Bundle**:
   - Secret API keys (`RAZORPAY_KEY_SECRET`, `RAPIDO_CLIENT_SECRET`, `JWT_SECRET`, `DATABASE_URL`) are isolated strictly inside `backend/src/config/environment.ts`.
   - The Vite frontend bundle contains only public identifiers prefixed with `VITE_` (`VITE_API_BASE_URL`).
