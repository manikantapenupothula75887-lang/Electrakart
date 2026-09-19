import assert from 'assert';
import { buildApp } from '../src/app.js';

export async function runSecurityLeakageTests() {
  console.log('\n--- Running Zero Financial Leakage & RBAC Isolation Tests ---');
  const app = buildApp();
  await app.ready();

  // Obtain Customer JWT
  const custLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/demo-switch',
    payload: { role: 'CUSTOMER' },
  });
  const custToken = JSON.parse(custLogin.payload).token;

  // Obtain Retailer JWT
  const retLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/demo-switch',
    payload: { role: 'RETAILER' },
  });
  const retToken = JSON.parse(retLogin.payload).token;

  // Obtain Admin JWT
  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/demo-switch',
    payload: { role: 'ADMIN' },
  });
  const adminToken = JSON.parse(adminLogin.payload).token;

  // 1. Verify GET /api/v1/products NEVER leaks wholesale costs or margins
  const prodsRes = await app.inject({
    method: 'GET',
    url: '/api/v1/products',
  });
  assert.strictEqual(prodsRes.statusCode, 200);
  const products = JSON.parse(prodsRes.payload);
  assert.ok(products.length > 0, 'Products list should not be empty');

  for (const p of products) {
    assert.strictEqual(p.purchaseCostINR, undefined, 'purchaseCostINR leaked in product list');
    assert.strictEqual(p.purchase_cost_inr, undefined, 'purchase_cost_inr leaked in product list');
    assert.strictEqual(p.commissionRatePercent, undefined, 'commissionRatePercent leaked in product list');
    assert.strictEqual(p.minPlatformMarginPercent, undefined, 'minPlatformMarginPercent leaked in product list');
  }
  console.log('✓ GET /api/v1/products contains 0 internal purchase costs or platform margins');

  // 2. Verify GET /api/v1/catalog/products/POL-WX-25-RED-90M
  const singleProdRes = await app.inject({
    method: 'GET',
    url: '/api/v1/catalog/products/POL-WX-25-RED-90M',
  });
  assert.strictEqual(singleProdRes.statusCode, 200);
  const prod = JSON.parse(singleProdRes.payload);
  assert.strictEqual(prod.purchaseCostINR, undefined);
  assert.strictEqual(prod.purchase_cost_inr, undefined);
  for (const st of prod.nearbyStores || []) {
    assert.strictEqual(st.purchaseCostINR, undefined);
    assert.strictEqual(st.commissionRatePercent, undefined);
  }
  console.log('✓ GET /api/v1/catalog/products/:sku contains 0 financial margin leaks in store stock');

  // 3. RBAC: Customer attempting admin-only governance
  const govRes = await app.inject({
    method: 'PATCH',
    url: '/api/v1/partners/partner-vja-elec-1/governance',
    headers: { authorization: `Bearer ${custToken}` },
    payload: { commissionRatePercent: 2.0 },
  });
  assert.strictEqual(govRes.statusCode, 403, 'Customer must be blocked from partner governance');
  console.log('✓ Customer blocked with 403 when attempting admin governance endpoint');

  // 4. RBAC: Customer attempting retailer-only inventory endpoint
  const invRes = await app.inject({
    method: 'GET',
    url: '/api/v1/inventory/partner-stock',
    headers: { authorization: `Bearer ${custToken}` },
  });
  assert.strictEqual(invRes.statusCode, 403, 'Customer must be blocked from retailer partner stock');
  console.log('✓ Customer blocked with 403 when attempting retailer inventory endpoint');

  // 5. RBAC: Retailer attempting Admin executive dashboard
  const adminDashRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/dashboard',
    headers: { authorization: `Bearer ${retToken}` },
  });
  assert.strictEqual(adminDashRes.statusCode, 403, 'Retailer must be blocked from admin dashboard');
  console.log('✓ Retailer blocked with 403 when attempting admin dashboard');

  // 6. RBAC: Admin accessing Admin executive dashboard
  const okAdminRes = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/dashboard',
    headers: { authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(okAdminRes.statusCode, 200, 'Admin must be granted access to admin dashboard');
  const dashData = JSON.parse(okAdminRes.payload);
  assert.ok(dashData.activeRetailers > 0);
  console.log('✓ Admin successfully accessed admin dashboard with 200 OK');

  await app.close();
}
