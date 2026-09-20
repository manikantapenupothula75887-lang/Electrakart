# ElectraKart — Production-Ready Notification & Communication Architecture

**ElectraKart** (*"From Estimate to Delivery"*) — Enterprise Electrical Commerce & Hyperlocal Logistics Platform.

---

## 1. Architectural Overview & Design Principles

The ElectraKart Notification & Communication Architecture provides a provider-independent, event-driven communication framework across four unified channels:
- **In-App Notifications**: Tenancy-isolated operational updates with real-time unread badges.
- **Email**: Transaction receipts, detailed invoices, order updates, and quotation dispatches.
- **SMS**: Time-sensitive order alerts, delivery OTP handovers, and security verifications.
- **WhatsApp**: Rich media order updates, delivery partner tracking links, and interactive confirmations.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   EVENT PRODUCERS & EMITTERS                                    │
│  [ Order Lifecycle ]    [ Payment Gateway ]   [ OCR / Quotation ]   [ Inventory Watchdog ]       │
└──────────────────────────────────────────────┬──────────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              NOTIFICATION ORCHESTRATION SERVICE                                 │
│                                                                                                 │
│  1. Zero-Leakage Scrubbing: Strips wholesale buy rates, distributor margins & warehouse IDs     │
│  2. Preference Filtering: Evaluates recipient channel opt-ins (notification_preferences)         │
│  3. Multi-Channel Dispatch: Concurrent fanout to In-App, Email, SMS, WhatsApp                   │
│  4. Delivery Auditing: Immutable ledger tracking in notification_logs                           │
│  5. Failure Isolation: External provider timeout/downtime NEVER impacts core DB transactions    │
└──────────────┬───────────────────┬───────────────────┬───────────────────┬──────────────────────┘
               │                   │                   │                   │
               ▼                   ▼                   ▼                   ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  IN-APP STORAGE  │  │  EMAIL PROVIDER  │  │   SMS PROVIDER   │  │WHATSAPP PROVIDER │
    │   PostgreSQL     │  │  AWS SES / Mock  │  │ Twilio / Mock    │  │ Twilio / Gupshup │
    └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Core Architecture Tenets:
1. **Provider-Independent Abstraction**: All channels implement standardized contracts (`IEmailProvider`, `ISmsProvider`, `IWhatsAppProvider`). The business layer never couples to external vendor SDKs.
2. **Strict Production Environment Guard**: When `NODE_ENV=production`, any active channel configured with `mock` fails fast during server boot. Authentic gateway credentials (`aws_ses`, `sendgrid`, `twilio`, `gupshup`, `karix`) are strictly mandated.
3. **Resilient Failure Isolation**: Notifications are dispatched asynchronously after primary database transactions commit (`post-transaction hooks`). Third-party API failures, network latencies, or provider 5xx errors never trigger database rollbacks for orders or payments.
4. **Zero Financial Leakage**: All notification payloads and rendered templates undergo strict field scrubbing. Wholesale prices, retailer buy rates, platform commissions, internal partner IDs, and driver private credentials are eradicated from customer notifications.
5. **Multi-Tenancy & IDOR Protection**: In-app notifications are filtered by user tenancy (`user_id = authUser.id`). Cross-customer inspection is blocked with HTTP 403 / 404.
6. **Webhook Signature Verification & Idempotency**: External delivery receipts (DLR) undergo HMAC-SHA256 timing-safe signature verification and idempotency deduplication to prevent replay attacks.

---

## 2. Notification Event Catalog & Payloads

The platform standardizes on the following 12 domain event types:

| Event Type | Target Roles | Enabled Channels | Purpose |
| :--- | :--- | :--- | :--- |
| `ORDER_PLACED` | CUSTOMER, ADMIN | In-App, SMS, Email | Confirms successful order placement with order summary |
| `ORDER_CONFIRMED` | CUSTOMER | In-App, SMS, Email | Order accepted by local partner hub |
| `FULFILLMENT_ASSIGNED` | RETAILER, DISTRIBUTOR | In-App, SMS | Alerts partner of newly allocated items to fulfill |
| `FULFILLMENT_PREPARING` | CUSTOMER | In-App | Informs customer that items are being picked & packed |
| `FULFILLMENT_PACKED` | CUSTOMER | In-App, SMS | Ready for dispatch pilot handover |
| `ORDER_DISPATCHED` | CUSTOMER | In-App, SMS, WhatsApp | Order en route with tracking carrier and driver name |
| `ORDER_DELIVERED` | CUSTOMER, RETAILER | In-App, SMS, WhatsApp | Handover completed via OTP confirmation |
| `ORDER_CANCELLED` | CUSTOMER, RETAILER | In-App, SMS, Email | Order cancelled and refund initiated |
| `ORDER_PAYMENT_SUCCESS` | CUSTOMER, ADMIN | In-App, SMS, Email | Payment captured with authoritative receipt |
| `ORDER_PAYMENT_FAILED` | CUSTOMER | In-App, SMS | Payment failure notification with retry link |
| `ESTIMATE_NEEDS_CLARIFICATION` | CUSTOMER | In-App, SMS, WhatsApp | Ambiguous OCR line-item requires brand/spec choice |
| `ESTIMATE_PROCESSED` | CUSTOMER | In-App, SMS, WhatsApp | OCR matched; line-item pricing ready |
| `QUOTATION_CREATED` | CUSTOMER | In-App, Email, WhatsApp | Formal PDF/B2B quotation generated |
| `INVENTORY_LOW` | RETAILER, DISTRIBUTOR | In-App, SMS, Email | Stock dropped below reorder threshold (with 24h cooldown) |

---

## 3. Provider Abstraction Contracts

### 3.1 Interface Specifications
```typescript
export interface IEmailProvider {
  sendEmail(options: SendEmailOptions): Promise<EmailSendResult>;
}

export interface ISmsProvider {
  sendSms(options: SendSmsOptions): Promise<SmsSendResult>;
}

export interface IWhatsAppProvider {
  sendWhatsApp(options: SendWhatsAppOptions): Promise<WhatsAppSendResult>;
}
```

### 3.2 Implemented Adapters
- `MockEmailProvider`, `MockSmsProvider`, `MockWhatsAppProvider`: Deterministic in-memory providers logging sent payloads to internal registries for automated testing without network egress.
- `GenericEmailProvider`, `GenericSmsProvider`, `GenericWhatsAppProvider`: Production-grade HTTP adapters configured for AWS SES, Twilio, Gupshup, and SendGrid with standard payload mapping.

---

## 4. Delivery Tracking, Logs & Auditing

Every attempted communication across any external channel records an entry in `notification_logs`:

```sql
CREATE TABLE notification_logs (
    id VARCHAR(64) PRIMARY KEY,
    notification_id VARCHAR(64) REFERENCES notifications(id) ON DELETE SET NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL, -- 'IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'
    recipient VARCHAR(255) NOT NULL,
    template_id VARCHAR(100),
    status VARCHAR(20) NOT NULL, -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'
    provider VARCHAR(50) NOT NULL,
    provider_message_id VARCHAR(255),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Failed Notification Retry Workflow
Administrators can trigger a manual retry for failed notifications via `POST /api/v1/notifications/:logId/retry`.
The service inspects previous metadata, increments `retry_count`, and re-invokes the appropriate provider adapter without re-triggering parent order events.

---

## 5. Webhook Architecture & Signature Verification

Providers report asynchronous delivery status (DLR) via webhook endpoints:
- `POST /api/v1/notifications/webhooks/email`
- `POST /api/v1/notifications/webhooks/sms`
- `POST /api/v1/notifications/webhooks/whatsapp`

### Webhook Security Protocol:
1. **HMAC-SHA256 Header Validation**: The provider signature is computed over the payload using the channel-specific webhook secret (`EMAIL_WEBHOOK_SECRET`, `SMS_WEBHOOK_SECRET`, `WHATSAPP_WEBHOOK_SECRET`).
2. **Timing-Safe Comparison**: `crypto.timingSafeEqual` prevents side-channel timing attacks.
3. **Idempotency & Replay Resistance**: If a provider sends duplicate status updates, the system matches `provider_message_id` and ignores redundant transitions.

---

## 6. Zero Financial Leakage Protection

Customer notifications are strictly scrubbed through `scrubFinancialData`:
- `buyPrice`, `unitCostINR`, `wholesalePrice`, `margin`, `platformFee`, `dealerCut` are deleted.
- Internal warehouse storage aisles and partner ledger IDs are excluded.
- Customer notifications only contain:
  - Public MRP / Authoritative Selling Price
  - Order Grand Total, GST Breakdown, Delivery Fee
  - SKU code and human-readable product name

---

## 7. Migration Guide to Live Gateways

To transition from local testing to live enterprise communication providers:

1. **Email (AWS SES or SendGrid)**:
   ```env
   EMAIL_PROVIDER=aws_ses
   AWS_SES_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   EMAIL_FROM=orders@electrakart.com
   EMAIL_WEBHOOK_SECRET=whsec_ses_prod_xyz
   ```

2. **SMS (Twilio or Karix / DLT Compliance)**:
   ```env
   SMS_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_FROM_PHONE=+1234567890
   SMS_WEBHOOK_SECRET=whsec_twilio_prod_xyz
   ```

3. **WhatsApp (Twilio Business WhatsApp / Gupshup)**:
   ```env
   WHATSAPP_PROVIDER=twilio
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   WHATSAPP_WEBHOOK_SECRET=whsec_wa_prod_xyz
   ```

4. Ensure `NODE_ENV=production` is set; the bootloader will verify that all active credentials pass configuration validation.
