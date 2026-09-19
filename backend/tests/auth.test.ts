import assert from 'assert';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';

export async function runAuthTests() {
  console.log('\n--- Running Auth & RBAC Tests ---');
  const app = buildApp();
  await app.ready();

  // 1. Health check
  const healthRes = await app.inject({
    method: 'GET',
    url: '/api/v1/health',
  });
  assert.strictEqual(healthRes.statusCode, 200);
  const health = JSON.parse(healthRes.payload);
  assert.strictEqual(health.status, 'ok');
  assert.strictEqual(health.database, 'connected');
  console.log('✓ GET /api/v1/health verified connected to database');

  // 2. Login with valid customer credentials
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      emailOrPhone: 'anil.reddy@gmail.com',
      password: 'password123',
    },
  });
  assert.strictEqual(loginRes.statusCode, 200);
  const loginData = JSON.parse(loginRes.payload);
  assert.ok(loginData.accessToken, 'Access token must be returned');
  assert.strictEqual(loginData.user.role, 'CUSTOMER');
  assert.strictEqual(loginData.user.fullName, 'Anil Kumar Reddy');
  console.log('✓ POST /api/v1/auth/login successfully issued JWT for Customer');

  // 3. Login with invalid password
  const badLoginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      emailOrPhone: 'anil.reddy@gmail.com',
      password: 'wrongpassword',
    },
  });
  assert.strictEqual(badLoginRes.statusCode, 401);
  console.log('✓ Invalid password correctly rejected with 401');

  // 4. Test GET /api/v1/auth/me with valid Bearer token
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: {
      authorization: `Bearer ${loginData.accessToken}`,
    },
  });
  assert.strictEqual(meRes.statusCode, 200);
  const meData = JSON.parse(meRes.payload);
  assert.strictEqual(meData.email, 'anil.reddy@gmail.com');
  assert.strictEqual(meData.role, 'CUSTOMER');
  console.log('✓ GET /api/v1/auth/me authenticated profile matches token');

  // 5. Test demo-switch endpoint for all roles
  for (const role of ['CUSTOMER', 'RETAILER', 'DISTRIBUTOR', 'ADMIN'] as const) {
    const switchRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/demo-switch',
      payload: { role },
    });
    assert.strictEqual(switchRes.statusCode, 200);
    const switchData = JSON.parse(switchRes.payload);
    assert.ok(switchData.token);
    assert.strictEqual(switchData.user.role, role);
  }
  console.log('✓ POST /api/v1/auth/demo-switch successfully generated tokens for all 4 roles');

  await app.close();
}
