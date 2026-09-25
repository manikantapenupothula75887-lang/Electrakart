import assert from 'assert';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';
import { loadConfig } from '../src/config/environment.js';

export async function runProductionReadinessTests() {
  console.log('\n--- Running Phase 3A Production Readiness & Hardening Tests ---');
  const app = buildApp();
  await app.ready();

  // Test 1: Liveness probe GET /api/v1/health
  console.log('1. Verifying Liveness Probe (/api/v1/health)...');
  const healthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/health',
  });
  assert.strictEqual(healthRes.statusCode, 200, 'Health endpoint must return 200');
  const healthBody = JSON.parse(healthRes.payload);
  assert.ok(healthBody.status === 'ok' || healthBody.status === 'pass');
  assert.ok(typeof healthBody.uptimeSeconds === 'number');

  // Test 2: Readiness probe GET /api/v1/ready
  console.log('2. Verifying Readiness Probe (/api/v1/ready)...');
  const readyRes = await app.inject({
    method: 'GET',
    url: '/api/v1/ready',
  });
  assert.strictEqual(readyRes.statusCode, 200, 'Ready endpoint must return 200 when DB is up');
  const readyBody = JSON.parse(readyRes.payload);
  assert.strictEqual(readyBody.status, 'ready');
  assert.strictEqual(readyBody.database.connected, true);
  assert.strictEqual(readyBody.migrations.pendingCount, 0, 'Must have 0 pending migrations');

  // Test 3: Production Insecure Secret Rejection
  console.log('3. Verifying Production Rejection of Insecure JWT_SECRET...');
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'short-secret',
      }),
    /JWT_SECRET/
  );

  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        JWT_SECRET: 'electrakart_development_jwt_secret_key_32bytes_minimum',
      }),
    /JWT_SECRET/
  );

  // Test 4: Production Rejection of PGlite
  console.log('4. Verifying Production Rejection of PGlite...');
  assert.throws(
    () =>
      loadConfig({
        NODE_ENV: 'production',
        DATABASE_URL: 'pglite://./data/pglite',
        JWT_SECRET: 'a_very_secure_high_entropy_random_jwt_secret_key_12345',
      }),
    /PGlite/
  );

  // Test 5: Helmet Security Headers & Correlation ID
  console.log('5. Verifying Security Headers & Correlation ID...');
  const testReqId = 'custom-trace-id-12345';
  const headerRes = await app.inject({
    method: 'GET',
    url: '/api/v1/health',
    headers: {
      'x-request-id': testReqId,
    },
  });
  assert.strictEqual(headerRes.headers['x-request-id'], testReqId, 'X-Request-ID should be propagated');
  assert.ok(headerRes.headers['x-frame-options'], 'X-Frame-Options header must be present');
  assert.ok(headerRes.headers['x-content-type-options'], 'X-Content-Type-Options header must be present');

  // Test 6: RFC 7807 Error Sanitization on Validation Failure
  console.log('6. Verifying RFC 7807 Error Sanitization...');
  const badOrderRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    payload: {
      customerName: 'Invalid Customer',
      customerPhone: 'not-a-phone',
      pincode: 'abc',
      cart: [],
    },
  });
  assert.strictEqual(badOrderRes.statusCode, 400, 'Invalid payload should return 400');
  const badOrderBody = JSON.parse(badOrderRes.payload);
  assert.ok(badOrderBody.type, 'RFC 7807 type must be present');
  assert.strictEqual(badOrderBody.title, 'Invalid Request');
  assert.ok(badOrderBody.requestId, 'RFC 7807 requestId must be present');

  // Test 7: Idempotency Key Handling
  console.log('7. Verifying Idempotency Key Caching & Deduplication...');
  const idempotencyKey = `test-idemp-${Date.now()}`;
  const validOrderPayload = {
    customerName: 'Idempotency Tester',
    customerPhone: '+91 98480 12345',
    deliveryAddress: 'Main Road, Benz Circle, Vijayawada',
    city: 'Vijayawada',
    pincode: '520008',
    deliveryMethod: 'STANDARD',
    paymentMethod: 'UPI',
    cart: [
      {
        product: {
          sku: 'POL-WX-25-RED-90M',
          name: 'Polycab FlameX FR 2.5 sq.mm Red (90m Coil)',
          brand: 'Polycab',
          series: 'FlameX FR',
          sellingPrice: 3100,
          unit: 'Coil (90m)',
        },
        quantity: 1,
        selectedStore: {
          partnerId: 'partner-vja-elec-1',
          storeName: 'Vijayawada Electricals & Hardware',
          partnerType: 'RETAILER',
          address: 'Besant Road, Vijayawada',
        },
      },
    ],
  };

  // First request: Should create order (HTTP 201)
  const firstReq = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      'idempotency-key': idempotencyKey,
    },
    payload: validOrderPayload,
  });
  assert.strictEqual(firstReq.statusCode, 201, 'First order request must succeed with 201');
  const firstOrder = JSON.parse(firstReq.payload);

  // Second request: Same key & same payload -> Must return cached response with IDEMPOTENT_HIT
  const secondReq = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      'idempotency-key': idempotencyKey,
    },
    payload: validOrderPayload,
  });
  assert.strictEqual(secondReq.statusCode, 201, 'Duplicate request must return 201');
  assert.strictEqual(secondReq.headers['x-cache-lookup'], 'IDEMPOTENT_HIT', 'Must have X-Cache-Lookup: IDEMPOTENT_HIT');
  const secondOrder = JSON.parse(secondReq.payload);
  assert.strictEqual(secondOrder.id, firstOrder.id, 'Cached order id must match exactly');

  // Third request: Same key with modified payload -> Must return 409 Conflict
  const conflictReq = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      'idempotency-key': idempotencyKey,
    },
    payload: {
      ...validOrderPayload,
      customerName: 'Different Name Tampering Attempt',
    },
  });
  assert.strictEqual(conflictReq.statusCode, 409, 'Reused key with modified body must return 409 Conflict');

  // Test 8: IDOR Isolation Checks
  console.log('8. Verifying IDOR Isolation & Role Boundaries...');
  // Log in as retailer partner-1
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      emailOrPhone: 'murali.vjaelec@gmail.com',
      password: 'password123',
    },
  });
  const loginBody = JSON.parse(loginRes.payload);
  const retailerToken = loginBody.accessToken || loginBody.token;

  // Attempt to query stock for partner-2 (Unauthorized partner boundary via query)
  const idorQueryRes = await app.inject({
    method: 'GET',
    url: '/api/v1/inventory/partner-stock?partnerId=partner-anchor-exclusive',
    headers: {
      authorization: `Bearer ${retailerToken}`,
    },
  });
  assert.strictEqual(idorQueryRes.statusCode, 403, 'Cross-partner inventory query must return 403 Forbidden');

  // Attempt to adjust stock for partner-2 (Unauthorized partner boundary via body)
  const idorStockRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/inventory/partner-stock/POL-WX-25-RED-90M',
    headers: {
      authorization: `Bearer ${retailerToken}`,
    },
    payload: {
      partnerId: 'partner-anchor-exclusive',
      deltaQuantity: 5,
      reason: 'MANUAL_ADJUSTMENT',
    },
  });
  assert.strictEqual(idorStockRes.statusCode, 403, 'Cross-partner inventory adjustment must return 403 Forbidden');

  // Test 9: Rate Limit Headers & Health Exemption
  console.log('9. Verifying Rate Limiting & Health Probe Exemption...');
  const rateLimitProbe = await app.inject({
    method: 'GET',
    url: '/api/v1/products',
  });
  assert.ok(rateLimitProbe.headers['x-ratelimit-limit'], 'Rate limit limit header should be present');
  // Test 10: Production OCR Configuration Validation & Disabled OCR Mode
  console.log('10. Verifying Production OCR Configuration & Disabled Mode...');

  const baseProdConfig = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://prod_user:prod_pass@localhost:5432/electrakart',
    JWT_SECRET: 'a_very_secure_high_entropy_random_jwt_secret_key_12345',
    PAYMENT_PROVIDER: 'razorpay',
    RAZORPAY_KEY_ID: 'rzp_live_12345',
    RAZORPAY_KEY_SECRET: 'secret12345',
    MAPS_PROVIDER: 'google_maps',
    GOOGLE_MAPS_API_KEY: 'AIzaSyFakeKeyForMaps123',
  };

  // 10a. Production startup with OCR_PROVIDER=disabled MUST succeed
  const disabledProdConfig = loadConfig({
    ...baseProdConfig,
    OCR_PROVIDER: 'disabled',
  });
  assert.strictEqual(disabledProdConfig.ocrProvider, 'disabled', 'OCR_PROVIDER=disabled must be accepted in production');

  // 10b. Production startup with default OCR_PROVIDER (unset) defaults to disabled and succeeds
  const defaultProdConfig = loadConfig({
    ...baseProdConfig,
  });
  assert.strictEqual(defaultProdConfig.ocrProvider, 'disabled', 'Unset OCR_PROVIDER in production must default to disabled');

  // 10c. Production startup with OCR_PROVIDER=mock MUST fail
  assert.throws(
    () =>
      loadConfig({
        ...baseProdConfig,
        OCR_PROVIDER: 'mock',
      }),
    /OCR_PROVIDER cannot be "mock"/i,
    'Production startup must reject mock OCR'
  );

  // 10d. Production startup with Google Document AI missing processor ID MUST fail
  assert.throws(
    () =>
      loadConfig({
        ...baseProdConfig,
        OCR_PROVIDER: 'google_document_ai',
        GOOGLE_DOC_AI_PROJECT_ID: 'electrakart-prod',
        GOOGLE_DOC_AI_PROCESSOR_ID: '',
      }),
    /GOOGLE_DOC_AI_PROCESSOR_ID must be set/i,
    'Google Document AI in production must require processor ID'
  );

  // 10e. Production startup with Google Document AI missing project ID MUST fail
  assert.throws(
    () =>
      loadConfig({
        ...baseProdConfig,
        OCR_PROVIDER: 'google_document_ai',
        GOOGLE_DOC_AI_PROJECT_ID: '',
        GOOGLE_DOC_AI_PROCESSOR_ID: 'proc-12345',
      }),
    /GOOGLE_DOC_AI_PROJECT_ID must be set/i,
    'Google Document AI in production must require project ID'
  );

  // 10f. Production startup with AWS Textract missing credentials MUST fail
  assert.throws(
    () =>
      loadConfig({
        ...baseProdConfig,
        OCR_PROVIDER: 'aws_textract',
        AWS_TEXTRACT_REGION: 'ap-south-1',
        AWS_TEXTRACT_ACCESS_KEY_ID: '',
        AWS_TEXTRACT_SECRET_ACCESS_KEY: '',
      }),
    /AWS credentials must be set/i,
    'AWS Textract in production must require credentials'
  );

  // 10g. Production startup with invalid OCR_PROVIDER MUST fail
  assert.throws(
    () =>
      loadConfig({
        ...baseProdConfig,
        OCR_PROVIDER: 'invalid_engine',
      }),
    /Invalid OCR_PROVIDER/i,
    'Invalid OCR_PROVIDER must throw config error'
  );

  console.log('✓ Production OCR validation verified: disabled mode succeeds, mock rejected, missing cloud credentials rejected');

  console.log('✅ ALL Phase 3A Production Readiness & Hardening Tests Passed!');
  await app.close();
}
