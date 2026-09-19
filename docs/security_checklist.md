# ElectraKart — Production Security Checklist

This document details the production security architecture, control mechanisms, and verification tests implemented in ElectraKart Phase 3A.

---

## 1. Security Controls Summary Matrix

| Security Domain | Control Mechanism | Status | Implementation Reference |
|---|---|---|---|
| **Secret Management** | Reject default/short JWT secret at boot | **ENFORCED** | `backend/src/config/environment.ts` |
| **Database Engine** | Reject PGlite in production environment | **ENFORCED** | `backend/src/db/connection.ts` |
| **CORS Policy** | Whitelisted origins only (no wildcard `*`) | **ENFORCED** | `backend/src/app.ts` |
| **HTTP Headers** | Content Security Policy, HSTS, X-Frame-Options | **ENFORCED** | `@fastify/helmet` in `app.ts` |
| **Rate Limiting** | 100 req/min per IP; `/health` exempt | **ENFORCED** | `@fastify/rate-limit` in `app.ts` |
| **Payload Limiting** | Max request body 2 MB | **ENFORCED** | `bodyLimit` in `app.ts` |
| **Correlation ID** | `X-Request-ID` on all requests/responses/logs | **ENFORCED** | `fastify.addHook('onRequest')` |
| **Error Sanitization** | RFC 7807 Problem Details; 500 masked in prod | **ENFORCED** | `backend/src/middleware/errorHandler.ts` |
| **Idempotency** | `Idempotency-Key` header with 24-hr cache | **ENFORCED** | `backend/src/middleware/idempotency.ts` |
| **Role-Based Access** | JWT token verification & role enforcement | **ENFORCED** | `backend/src/middleware/auth.ts` |
| **IDOR Isolation** | Partner boundary checks & user ownership | **ENFORCED** | Order, Inventory, and Quotation routes |
| **Silent Fallback** | Prohibited in production (`VITE_ALLOW_DEMO_FALLBACK=false`) | **ENFORCED** | `src/services/production/fallbackPolicy.ts` |

---

## 2. Authentication & JWT Hardening

1. **Secret Key Entropy**:
   - In `production`, the server evaluates the length and character distribution of `JWT_SECRET`.
   - If the secret is missing, equal to the development fallback, or shorter than 32 bytes, the process immediately logs a critical security error and terminates (`process.exit(1)`).
2. **Token Expiration**:
   - Access tokens have an explicit 24-hour expiration (`expiresIn: '24h'`).
3. **Payload Claims**:
   - Token claims contain: `userId`, `email`, `role`, and optional `partnerId`. No passwords or sensitive credit/financial data are ever encoded into JWT claims.

---

## 3. Authorization & IDOR Protection

ElectraKart enforces zero-trust resource boundary validation across all mutative and confidential endpoints:

### 3.1 Partner Boundary Enforcement (Retailers & Distributors)
- Route handlers verify whether the authenticated actor's `partnerId` matches the requested resource.
- **Inventory Modifications**: A retailer cannot inspect, adjust stock, or perform bulk inward for another store's inventory (`403 Forbidden: Cannot modify inventory for a different partner`).
- **Partner Orders**: A partner cannot update fulfillment statuses or accept orders assigned to a different store.

### 3.2 Customer Boundary Enforcement
- Orders and generated quotations verify `req.user.userId === order.customer_id`.
- Non-admin callers attempting to view or accept orders belonging to another user are rejected with `403 Forbidden: You do not have permission to view this order`.

---

## 4. Network & Input Sanitization

1. **SQL Injection Prevention**:
   - 100% of queries across services and route handlers use parameterized placeholders (`$1`, `$2`, ...). Zero dynamic string concatenation is allowed in SQL query builders.
2. **Cross-Site Scripting (XSS)**:
   - Helmet CSP explicitly restricts script execution to trusted domains (`'self'`).
   - HTML injection is mitigated by React 19's virtual DOM auto-escaping.
3. **HTTP Parameter Pollution & Large Payloads**:
   - Fastify enforces a strict 2 MB body size ceiling. Requests exceeding this threshold receive immediate `413 Payload Too Large`.

---

## 5. Idempotency Key Architecture

Critical mutation endpoints (`POST /api/v1/orders`, `POST /api/v1/quotations/generate`) accept an optional `Idempotency-Key` HTTP header.

```
Client ──[ POST /orders (Key: abc-123) ]──► Fastify ──[ Lock & Insert DB ]──► 201 Created (Order 1001)
Client ──[ POST /orders (Key: abc-123) ]──► Fastify ──[ Cache Hit ]──────────► 201 Created (Cached 1001)
                                                       (Header: X-Cache-Lookup: IDEMPOTENT_HIT)
```

- **Persistence**: Cached in `idempotency_keys` with SHA-256 request payload hash.
- **Payload Tampering Detection**: If the client resends the same key with a altered payload body, Fastify returns `409 Conflict: Idempotency key reused with different request payload`.
- **TTL**: Automatically expires after 24 hours.

---

## 6. Error Masking & Observability

- **Production Sanitization**:
  - In `production`, internal server errors (`500`) return a generic RFC 7807 response:
    ```json
    {
      "type": "https://api.electrakart.in/errors/internal-server-error",
      "title": "Internal Server Error",
      "status": 500,
      "detail": "An unexpected error occurred. Please contact ElectraKart support with the request ID.",
      "requestId": "req-9c84e1b7"
    }
    ```
  - Database error details, SQL queries, table schemas, and Node.js stack traces are completely stripped from HTTP responses.
- **Log Redaction**:
  - Passwords, authorization tokens, credit cards, and customer PII are redacted from request/response loggers.
