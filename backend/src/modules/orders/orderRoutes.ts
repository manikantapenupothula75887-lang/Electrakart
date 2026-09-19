import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';

export async function orderRoutes(fastify: FastifyInstance) {
  // Create unified order with multi-store split fulfillment
  fastify.post('/orders', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const {
      customerName = 'Anil Kumar Reddy',
      customerPhone = '+91 98481 99882',
      deliveryAddress = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city = 'Vijayawada',
      pincode = '520008',
      deliveryMethod = 'EXPRESS',
      paymentMethod = 'UPI',
      cart = [],
    } = request.body as any;

    if (!Array.isArray(cart) || cart.length === 0) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/empty-cart',
        title: 'Empty Cart',
        status: 400,
        detail: 'Cannot create an order with an empty cart.',
        instance: request.url,
      });
    }

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `EK-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const createdOrder = await db.withTransaction(async (tx) => {
        let subtotal = 0;

        // Group items by partner
        const partnerGroups = new Map<string, any[]>();

        for (const item of cart) {
          const skuCode = item.product.sku;
          const qty = item.quantity || 1;
          const partnerId = item.selectedStore?.partnerId || 'partner-vja-elec-1';

          // Step 1: Validate & Lock inventory row in PostgreSQL
          const invRes = await tx.query(
            'SELECT id, in_stock_quantity, reserved_quantity, available_quantity, selling_price_inr FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE',
            [partnerId, skuCode]
          );

          if (invRes.rows.length === 0) {
            throw new Error(`SKU '${skuCode}' is not stocked by store '${partnerId}'`);
          }

          const inv = invRes.rows[0];
          const availableStock = inv.in_stock_quantity - inv.reserved_quantity;

          if (availableStock < qty) {
            throw new Error(
              `Insufficient stock for '${skuCode}' at store '${partnerId}'. Requested: ${qty}, Available: ${availableStock}`
            );
          }

          // Step 2: Atomically reserve stock
          const newReserved = inv.reserved_quantity + qty;
          const newAvailable = inv.in_stock_quantity - newReserved;

          await tx.query(
            `UPDATE partner_inventories 
             SET reserved_quantity = $1, available_quantity = $2, last_updated = NOW() 
             WHERE id = $3`,
            [newReserved, newAvailable, inv.id]
          );

          // Step 3: Record inventory reservation transaction
          await tx.query(
            `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, notes)
             VALUES ($1, $2, $3, $4, 'RESERVATION_ORDER', $5, $6, $7, $8, $9)`,
            [
              `tx-res-${Date.now()}-${skuCode}`,
              inv.id,
              partnerId,
              skuCode,
              qty,
              inv.in_stock_quantity,
              inv.in_stock_quantity,
              orderNumber,
              `Order reservation for ${customerName}`,
            ]
          );

          const price = inv.selling_price_inr || item.product.sellingPrice;
          subtotal += price * qty;

          if (!partnerGroups.has(partnerId)) {
            partnerGroups.set(partnerId, []);
          }
          partnerGroups.get(partnerId)!.push({
            ...item,
            validatedPrice: price,
          });
        }

        const discount = subtotal > 10000 ? 500 : 0;
        const gstTotal = Math.round(subtotal * 0.18);
        const deliveryFee = subtotal > 5000 ? 0 : 150;
        const grandTotal = subtotal + gstTotal - discount + deliveryFee;

        // Step 4: Create Master Order
        const customerId = request.user?.id || 'usr-customer-1';
        await tx.query(
          `INSERT INTO orders (id, order_number, customer_id, customer_name, customer_phone, delivery_address, city, pincode, delivery_method, subtotal_inr, discount_inr, delivery_fee_inr, gst_total_inr, grand_total_inr, payment_method, payment_status, overall_status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'PAID', 'CONFIRMED', NOW(), NOW())`,
          [
            orderId,
            orderNumber,
            customerId,
            customerName,
            customerPhone,
            deliveryAddress,
            city,
            pincode,
            deliveryMethod,
            subtotal,
            discount,
            deliveryFee,
            gstTotal,
            grandTotal,
            paymentMethod,
          ]
        );

        // Step 5: Create split fulfillment records
        const fulfillments: any[] = [];
        let fulIndex = 1;

        for (const [pId, groupItems] of partnerGroups.entries()) {
          const pRes = await tx.query(
            'SELECT business_name, type, address FROM partners WHERE id = $1',
            [pId]
          );
          const partner = pRes.rows[0] || {
            business_name: groupItems[0].selectedStore?.storeName || 'Partner Store',
            type: groupItems[0].selectedStore?.partnerType || 'RETAILER',
            address: groupItems[0].selectedStore?.address || 'Vijayawada',
          };

          const fulId = `ful-${orderId}-${fulIndex}`;
          const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
          const eta = fulIndex === 1 ? '30–45 mins' : '45–60 mins';

          await tx.query(
            `INSERT INTO order_fulfillments (id, order_id, fulfillment_index, partner_id, partner_name, partner_type, partner_address, status, estimated_delivery_time, handover_otp, last_updated, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8, $9, NOW(), NOW())`,
            [
              fulId,
              orderId,
              fulIndex,
              pId,
              partner.business_name,
              partner.type,
              partner.address,
              eta,
              otp,
            ]
          );

          // Fulfillment items
          const savedItems: any[] = [];
          for (const it of groupItems) {
            const fitId = `fit-${Date.now()}-${Math.random()}`;
            const sRes = await tx.query('SELECT id FROM skus WHERE sku_code = $1 OR id = $1', [it.product.sku]);
            const skuId = sRes.rows[0]?.id || it.product.id || it.product.sku;

            await tx.query(
              `INSERT INTO fulfillment_items (id, fulfillment_id, sku_id, sku_code, product_name, brand, series, quantity, unit, unit_price_inr, line_total_inr)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                fitId,
                fulId,
                skuId,
                it.product.sku,
                it.product.name,
                it.product.brand,
                it.product.series,
                it.quantity,
                it.product.unit,
                it.validatedPrice,
                it.validatedPrice * it.quantity,
              ]
            );

            savedItems.push({
              sku: it.product.sku,
              name: it.product.name,
              brand: it.product.brand,
              series: it.product.series,
              quantity: it.quantity,
              unitPrice: it.validatedPrice,
              unit: it.product.unit,
            });
          }

          // Initial Tracking Logs
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          await tx.query(
            `INSERT INTO fulfillment_tracking_logs (id, fulfillment_id, status, title, description, created_at)
             VALUES 
              ($1, $2, 'PLACED', 'Order Placed', $3, NOW() - INTERVAL '2 minutes'),
              ($4, $2, 'CONFIRMED', 'Store Assigned', $5, NOW())`,
            [
              `tl-${Date.now()}-1`,
              fulId,
              `Paid via ${paymentMethod}`,
              `tl-${Date.now()}-2`,
              `Allocated to ${partner.business_name}`,
            ]
          );

          fulfillments.push({
            id: fulId,
            fulfillmentIndex: fulIndex,
            partnerId: pId,
            partnerName: partner.business_name,
            partnerType: partner.type,
            partnerAddress: partner.address,
            status: 'CONFIRMED',
            eta,
            driverName: fulIndex === 1 ? 'K. Somesh (Dunzo/ElectraKart Express)' : 'Regional Logistics Van (AP16-TE-8102)',
            driverPhone: '+91 99482 10928',
            handoverOtp: otp,
            lastUpdated: 'Just now',
            items: savedItems,
            trackingHistory: [
              { status: 'PLACED', timestamp: nowStr, title: 'Order Placed', description: `Paid via ${paymentMethod}` },
              { status: 'CONFIRMED', timestamp: nowStr, title: 'Store Assigned', description: `Allocated to ${partner.business_name}` },
            ],
          });

          fulIndex++;
        }

        return {
          id: orderId,
          orderNumber,
          createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          customerName,
          customerPhone,
          deliveryAddress,
          city,
          pincode,
          deliveryMethod,
          fulfillments,
          subtotal,
          discount,
          deliveryFee,
          gstTotal,
          grandTotal,
          paymentMethod,
          paymentStatus: 'PAID',
          overallStatus: 'CONFIRMED',
        };
      });

      return reply.status(201).send(createdOrder);
    } catch (err: any) {
      return reply.status(409).send({
        type: 'https://api.electrakart.com/errors/order-creation-failed',
        title: 'Order Creation Failed',
        status: 409,
        detail: err.message || 'Transaction rolled back due to error',
        instance: request.url,
      });
    }
  });

  // Get orders list (supports filtering by partner or customer role)
  fastify.get('/orders', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const user = request.user;

    let sql = 'SELECT * FROM orders ORDER BY created_at DESC';
    const params: any[] = [];

    if (user?.role === 'CUSTOMER') {
      sql = 'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC';
      params.push(user.id);
    } else if (user?.role === 'RETAILER' && user.partnerId) {
      sql = `
        SELECT DISTINCT o.* FROM orders o
        JOIN order_fulfillments f ON o.id = f.order_id
        WHERE f.partner_id = $1
        ORDER BY o.created_at DESC
      `;
      params.push(user.partnerId);
    } else if (user?.role === 'DISTRIBUTOR' && user.partnerId) {
      sql = `
        SELECT DISTINCT o.* FROM orders o
        JOIN order_fulfillments f ON o.id = f.order_id
        WHERE f.partner_id = $1
        ORDER BY o.created_at DESC
      `;
      params.push(user.partnerId);
    }

    const ordersRes = await db.query(sql, params);

    // Hydrate each order with fulfillments and tracking history
    const orders = await Promise.all(
      ordersRes.rows.map(async (o) => {
        const fulRes = await db.query(
          'SELECT * FROM order_fulfillments WHERE order_id = $1 ORDER BY fulfillment_index ASC',
          [o.id]
        );

        const fulfillments = await Promise.all(
          fulRes.rows.map(async (f) => {
            const itRes = await db.query(
              'SELECT sku_code AS "sku", product_name AS "name", brand, series, quantity, unit_price_inr AS "unitPrice", unit FROM fulfillment_items WHERE fulfillment_id = $1',
              [f.id]
            );
            const tlRes = await db.query(
              'SELECT status, TO_CHAR(created_at, \'HH24:MI\') AS "timestamp", title, description FROM fulfillment_tracking_logs WHERE fulfillment_id = $1 ORDER BY created_at ASC',
              [f.id]
            );

            return {
              id: f.id,
              fulfillmentIndex: f.fulfillment_index,
              partnerId: f.partner_id,
              partnerName: f.partner_name,
              partnerType: f.partner_type,
              partnerAddress: f.partner_address,
              status: f.status,
              eta: f.estimated_delivery_time,
              driverName: f.assigned_driver_name || 'Assigned Delivery Pilot',
              driverPhone: f.assigned_driver_phone || '+91 99482 10928',
              handoverOtp: f.handover_otp,
              lastUpdated: 'Recently updated',
              items: itRes.rows,
              trackingHistory: tlRes.rows,
            };
          })
        );

        return {
          id: o.id,
          orderNumber: o.order_number,
          createdAt: new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          customerName: o.customer_name,
          customerPhone: o.customer_phone,
          deliveryAddress: o.delivery_address,
          city: o.city,
          pincode: o.pincode,
          deliveryMethod: o.delivery_method,
          subtotal: parseFloat(o.subtotal_inr),
          discount: parseFloat(o.discount_inr),
          deliveryFee: parseFloat(o.delivery_fee_inr),
          gstTotal: parseFloat(o.gst_total_inr),
          grandTotal: parseFloat(o.grand_total_inr),
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          overallStatus: o.overall_status,
          fulfillments,
        };
      })
    );

    return reply.send(orders);
  });

  // Get single order by ID or Number
  fastify.get('/orders/:id', async (request, reply) => {
    const { id } = request.params as any;

    const oRes = await db.query(
      'SELECT * FROM orders WHERE id = $1 OR order_number = $1 LIMIT 1',
      [id]
    );

    if (oRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Order Not Found',
        status: 404,
        detail: `Order '${id}' was not found.`,
        instance: request.url,
      });
    }

    const o = oRes.rows[0];
    const fulRes = await db.query(
      'SELECT * FROM order_fulfillments WHERE order_id = $1 ORDER BY fulfillment_index ASC',
      [o.id]
    );

    const fulfillments = await Promise.all(
      fulRes.rows.map(async (f) => {
        const itRes = await db.query(
          'SELECT sku_code AS "sku", product_name AS "name", brand, series, quantity, unit_price_inr AS "unitPrice", unit FROM fulfillment_items WHERE fulfillment_id = $1',
          [f.id]
        );
        const tlRes = await db.query(
          'SELECT status, TO_CHAR(created_at, \'HH24:MI\') AS "timestamp", title, description FROM fulfillment_tracking_logs WHERE fulfillment_id = $1 ORDER BY created_at ASC',
          [f.id]
        );

        return {
          id: f.id,
          fulfillmentIndex: f.fulfillment_index,
          partnerId: f.partner_id,
          partnerName: f.partner_name,
          partnerType: f.partner_type,
          partnerAddress: f.partner_address,
          status: f.status,
          eta: f.estimated_delivery_time,
          driverName: f.assigned_driver_name || 'Somesh K. (ElectraKart Pilot)',
          driverPhone: f.assigned_driver_phone || '+91 99482 10928',
          handoverOtp: f.handover_otp,
          lastUpdated: 'Recently updated',
          items: itRes.rows,
          trackingHistory: tlRes.rows,
        };
      })
    );

    return reply.send({
      id: o.id,
      orderNumber: o.order_number,
      createdAt: new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      deliveryAddress: o.delivery_address,
      city: o.city,
      pincode: o.pincode,
      deliveryMethod: o.delivery_method,
      subtotal: parseFloat(o.subtotal_inr),
      discount: parseFloat(o.discount_inr),
      deliveryFee: parseFloat(o.delivery_fee_inr),
      gstTotal: parseFloat(o.gst_total_inr),
      grandTotal: parseFloat(o.grand_total_inr),
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      overallStatus: o.overall_status,
      fulfillments,
    });
  });

  // Update fulfillment lifecycle status (Partner / Driver action)
  fastify.post('/orders/:orderId/fulfillments/:fulfillmentId/status', async (request, reply) => {
    const { orderId, fulfillmentId } = request.params as any;
    const { status, note, driverName, driverPhone } = request.body as any;

    await db.withTransaction(async (tx) => {
      await tx.query(
        `UPDATE order_fulfillments 
         SET status = $1, assigned_driver_name = COALESCE($2, assigned_driver_name), assigned_driver_phone = COALESCE($3, assigned_driver_phone), last_updated = NOW()
         WHERE id = $4`,
        [status, driverName, driverPhone, fulfillmentId]
      );

      // Append tracking log
      await tx.query(
        `INSERT INTO fulfillment_tracking_logs (id, fulfillment_id, status, title, description, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          `tl-${Date.now()}`,
          fulfillmentId,
          status,
          `Status: ${status.replace('_', ' ')}`,
          note || `Updated status to ${status}`,
        ]
      );

      // If delivered, finalize inventory deduction
      if (status === 'DELIVERED') {
        const items = await tx.query(
          'SELECT sku_code, quantity FROM fulfillment_items WHERE fulfillment_id = $1',
          [fulfillmentId]
        );
        const fRes = await tx.query('SELECT partner_id FROM order_fulfillments WHERE id = $1', [fulfillmentId]);
        const partnerId = fRes.rows[0]?.partner_id;

        for (const item of items.rows) {
          await tx.query(
            `UPDATE partner_inventories
             SET in_stock_quantity = GREATEST(0, in_stock_quantity - $1),
                 reserved_quantity = GREATEST(0, reserved_quantity - $1)
             WHERE partner_id = $2 AND sku_code = $3`,
            [item.quantity, partnerId, item.sku_code]
          );
        }
      }

      // Check if all fulfillments in this order are delivered
      const allFuls = await tx.query(
        'SELECT status FROM order_fulfillments WHERE order_id = $1',
        [orderId]
      );
      const allDelivered = allFuls.rows.every((f) => f.status === 'DELIVERED');
      if (allDelivered) {
        await tx.query("UPDATE orders SET overall_status = 'DELIVERED', updated_at = NOW() WHERE id = $1", [orderId]);
      } else {
        await tx.query('UPDATE orders SET overall_status = $1, updated_at = NOW() WHERE id = $2', [status, orderId]);
      }
    });

    return reply.send({
      orderId,
      fulfillmentId,
      status,
      updatedAt: new Date().toISOString(),
    });
  });
}
