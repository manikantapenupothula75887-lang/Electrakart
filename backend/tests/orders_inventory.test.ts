import assert from 'assert';
import { buildApp } from '../src/app.js';
import { db } from '../src/db/connection.js';

export async function runOrdersInventoryTests() {
  console.log('\n--- Running Orders & Inventory Reservation Tests ---');
  const app = buildApp();
  await app.ready();

  // 1. Check baseline stock for Polycab 2.5 wire at Vijayawada Electricals
  const baseRes = await db.query(
    'SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
    ['partner-vja-elec-1', 'POL-WX-25-RED-90M']
  );
  const baseline = baseRes.rows[0];
  console.log(`Baseline stock: in_stock=${baseline.in_stock_quantity}, reserved=${baseline.reserved_quantity}, available=${baseline.available_quantity}`);

  // 2. Create multi-store order with 2 items from different stores
  const orderPayload = {
    customerName: 'K. Somasekhar (Contractor)',
    customerPhone: '+91 98481 11223',
    deliveryAddress: 'Plot 12, Guru Nanak Colony, Vijayawada',
    city: 'Vijayawada',
    pincode: '520008',
    deliveryMethod: 'EXPRESS',
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
        quantity: 2,
        selectedStore: {
          partnerId: 'partner-vja-elec-1',
          storeName: 'Vijayawada Electricals & Hardware',
          partnerType: 'RETAILER',
          address: 'Besant Road, Vijayawada',
        },
      },
      {
        product: {
          sku: 'ANC-ROM-6M-PLT-WHT',
          name: 'Anchor Roma Classic 6-Module Plate White',
          brand: 'Anchor',
          series: 'Roma Classic',
          sellingPrice: 185,
          unit: 'Nos',
        },
        quantity: 3,
        selectedStore: {
          partnerId: 'partner-anchor-exclusive',
          storeName: 'Sri Balaji Anchor World',
          partnerType: 'RETAILER',
          address: 'Eluru Road, Vijayawada',
        },
      },
    ],
  };

  const createRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    payload: orderPayload,
  });

  if (createRes.statusCode !== 201) {
    console.error('CREATE ORDER ERROR PAYLOAD:', createRes.payload);
  }
  assert.strictEqual(createRes.statusCode, 201, 'Order must be created successfully');
  const createdOrder = JSON.parse(createRes.payload);
  assert.ok(createdOrder.id);
  assert.ok(createdOrder.orderNumber);
  assert.strictEqual(createdOrder.fulfillments.length, 2, 'Must create 2 split fulfillments for 2 distinct stores');
  console.log(`✓ Order ${createdOrder.orderNumber} created with ${createdOrder.fulfillments.length} split fulfillments`);

  // 3. Verify stock was atomically reserved in PostgreSQL
  const afterRes = await db.query(
    'SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
    ['partner-vja-elec-1', 'POL-WX-25-RED-90M']
  );
  const afterStock = afterRes.rows[0];
  assert.strictEqual(afterStock.reserved_quantity, baseline.reserved_quantity + 2, 'Reserved quantity must increase by 2');
  assert.strictEqual(afterStock.available_quantity, baseline.available_quantity - 2, 'Available quantity must decrease by 2');
  console.log(`✓ Inventory atomically reserved: new reserved=${afterStock.reserved_quantity}, available=${afterStock.available_quantity}`);

  // 4. Over-reservation test: Attempt to order 500 coils (exceeding stock)
  const failPayload = {
    ...orderPayload,
    cart: [
      {
        product: {
          sku: 'POL-WX-25-RED-90M',
          sellingPrice: 3100,
        },
        quantity: 500, // Impossibly large
        selectedStore: { partnerId: 'partner-vja-elec-1' },
      },
    ],
  };

  const failRes = await app.inject({
    method: 'POST',
    url: '/api/v1/orders',
    payload: failPayload,
  });
  assert.strictEqual(failRes.statusCode, 409, 'Over-reservation must be rejected with 409');
  console.log('✓ Over-reservation rejected with 409 Conflict');

  // Verify stock was not changed after failed transaction
  const afterFailRes = await db.query(
    'SELECT in_stock_quantity, reserved_quantity, available_quantity FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2',
    ['partner-vja-elec-1', 'POL-WX-25-RED-90M']
  );
  assert.strictEqual(afterFailRes.rows[0].reserved_quantity, afterStock.reserved_quantity, 'Stock must not change after rolled-back transaction');
  console.log('✓ Transaction rollback verified: 0 partial inventory changes');

  // 5. Test fulfillment status progression
  const ful1 = createdOrder.fulfillments[0];
  const updateRes = await app.inject({
    method: 'POST',
    url: `/api/v1/orders/${createdOrder.id}/fulfillments/${ful1.id}/status`,
    payload: {
      status: 'PACKED',
      note: 'Coils boxed and ready for pilot pickup',
    },
  });
  assert.strictEqual(updateRes.statusCode, 200);
  console.log(`✓ Fulfillment ${ful1.id} updated to PACKED`);

  await app.close();
}
