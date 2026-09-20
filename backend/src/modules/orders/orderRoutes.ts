import { FastifyInstance } from 'fastify';
import { db } from '../../db/connection.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';
import { checkIdempotency, recordIdempotency } from '../../middleware/idempotency.js';
import { paymentService } from '../payments/payment.service.js';
import { fulfillmentSelectionService } from '../fulfillment/fulfillment-selection.service.js';
import { FulfillmentCartItem } from '../fulfillment/fulfillment.types.js';
import { notificationService } from '../notifications/notification.service.js';

export async function orderRoutes(fastify: FastifyInstance) {
  // Create unified order with multi-store split fulfillment
  fastify.post('/orders', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    // 1. Check Idempotency Key
    if (await checkIdempotency(request, reply)) {
      return;
    }

    const {
      customerName = 'Anil Kumar Reddy',
      customerPhone = '+91 98481 99882',
      deliveryAddress = 'Flat 301, Sri Sai Residency, Guru Nanak Colony, Vijayawada',
      city = 'Vijayawada',
      pincode = '520008',
      deliveryMethod = 'EXPRESS',
      paymentMethod = 'UPI',
      cart = [],
      addressId,
      latitude,
      longitude,
    } = (request.body as any) || {};

    // 2. Validate input parameters
    if (!customerName || typeof customerName !== 'string' || customerName.trim().length === 0) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Invalid Request',
        status: 400,
        detail: 'customerName is required.',
        instance: request.url,
        requestId: request.id,
        invalidParams: [{ name: 'customerName', reason: 'Missing customerName' }],
      });
    }

    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.replace(/\D/g, '').length < 10) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Invalid Request',
        status: 400,
        detail: 'A valid 10-digit customerPhone is required.',
        instance: request.url,
        requestId: request.id,
        invalidParams: [{ name: 'customerPhone', reason: 'Phone must have at least 10 digits' }],
      });
    }

    if (!pincode || !/^\d{6}$/.test(pincode.trim())) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation-error',
        title: 'Invalid Request',
        status: 400,
        detail: 'A valid 6-digit Indian postal pincode is required.',
        instance: request.url,
        requestId: request.id,
        invalidParams: [{ name: 'pincode', reason: 'Must be 6 digits' }],
      });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/empty-cart',
        title: 'Empty Cart',
        status: 400,
        detail: 'Cannot create an order with an empty cart.',
        instance: request.url,
        requestId: request.id,
      });
    }

    // 3. Authoritative fulfillment planning
    const fulfillmentCartItems: FulfillmentCartItem[] = cart.map((i: any) => ({
      sku_code: i.product?.sku || i.sku || i.sku_code,
      quantity: i.quantity || 1,
      preferred_partner_id: i.selectedStore?.partnerId || i.partnerId,
    }));

    const clientPartnerHint =
      cart[0]?.selectedStore?.partnerId || cart[0]?.partnerId || (request.body as any)?.partnerId;

    let plan;
    try {
      plan = await fulfillmentSelectionService.computeFulfillmentPlan({
        items: fulfillmentCartItems,
        location: {
          addressId,
          latitude: latitude !== undefined ? Number(latitude) : undefined,
          longitude: longitude !== undefined ? Number(longitude) : undefined,
          city,
          pincode,
        },
        userId: request.user?.id,
        clientPartnerHint,
      });
    } catch (planErr: any) {
      const statusCode = planErr.statusCode || 400;
      return reply.status(statusCode).send({
        type: 'https://api.electrakart.com/errors/fulfillment-error',
        title: 'Fulfillment Error',
        status: statusCode,
        detail: planErr.message || 'Could not resolve delivery location or fulfillment.',
        instance: request.url,
      });
    }

    if (!plan.is_fulfillable) {
      return reply.status(409).send({
        type: 'https://api.electrakart.com/errors/unserviceable',
        title: 'Order Cannot Be Fulfilled',
        status: 409,
        detail: 'One or more items cannot be fulfilled for the selected delivery location.',
        instance: request.url,
        unfulfillable_items: plan.unfulfillable_items,
      });
    }

    const orderId = `ord-${Date.now()}`;
    const orderNumber = `EK-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      const createdOrder = await db.withTransaction(async (tx) => {
        let subtotal = 0;
        for (const group of plan.groups) {
          for (const item of group.items) {
            subtotal += item.subtotal;
          }
        }

        const discount = subtotal > 10000 ? 500 : 0;
        const deliveryFee = subtotal > 5000 ? 0 : 150;
        const gstTotal = Math.round((subtotal - discount) * 0.18);
        const grandTotal = subtotal - discount + gstTotal + deliveryFee;

        // Step 1: Insert Master Order FIRST
        const customerId = request.user?.id || 'usr-customer-1';
        const finalDeliveryAddress = plan.delivery_location.normalized_address || deliveryAddress;

        await tx.query(
          `INSERT INTO orders (
            id, order_number, customer_id, customer_name, customer_phone,
            delivery_address, city, pincode, delivery_method, payment_method,
            payment_status, overall_status, subtotal_inr, discount_inr,
            delivery_fee_inr, gst_total_inr, grand_total_inr, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PAID', 'CONFIRMED', $11, $12, $13, $14, $15, NOW(), NOW())`,
          [
            orderId,
            orderNumber,
            customerId,
            customerName,
            customerPhone,
            finalDeliveryAddress,
            plan.delivery_location.city || city,
            plan.delivery_location.pincode || pincode,
            deliveryMethod,
            paymentMethod,
            subtotal,
            discount,
            deliveryFee,
            gstTotal,
            grandTotal,
          ]
        );

        // Step 2: Create Split Fulfillments for each partner node
        const fulfillments: any[] = [];
        let fulIndex = 1;

        for (const group of plan.groups) {
          const fulId = `ful-${orderId}-${fulIndex}`;
          const partnerId = group.partner_id;

          // Lookup partner details
          const pRes = await tx.query('SELECT business_name, type FROM partners WHERE id = $1', [partnerId]);
          const partner = pRes.rows[0] || { business_name: group.partner_name, type: group.partner_type };
          const addrRes = await tx.query('SELECT address, city FROM partners WHERE id = $1 LIMIT 1', [partnerId]);
          const partnerAddr = addrRes.rows[0]
            ? `${addrRes.rows[0].address}, ${addrRes.rows[0].city}`
            : 'Governorpet, Vijayawada';

          const eta =
            group.estimated_delivery_hours <= 2
              ? '30–45 mins'
              : group.estimated_delivery_hours <= 4
              ? '1–2 hours'
              : 'Next Day (24 hrs)';
          const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

          // Insert fulfillment parent record
          await tx.query(
            `INSERT INTO order_fulfillments (
              id, order_id, fulfillment_index, partner_id, partner_name,
              partner_type, partner_address, status, estimated_delivery_time,
              assigned_driver_name, assigned_driver_phone, handover_otp,
              last_updated, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'CONFIRMED', $8, $9, $10, $11, NOW(), NOW())`,
            [
              fulId,
              orderId,
              fulIndex,
              partnerId,
              partner.business_name,
              partner.type,
              partnerAddr,
              eta,
              fulIndex === 1 ? 'K. Somesh (ElectraKart Pilot)' : 'Regional Logistics Van (AP16-TE-8102)',
              '+91 99482 10928',
              otp,
            ]
          );

          // Step 3: Reserve stock and insert fulfillment items
          const savedItems: any[] = [];

          for (const item of group.items) {
            const skuCode = item.sku_code;
            const qty = item.quantity;

            if (!skuCode || qty <= 0) {
              throw new Error(`Invalid item in cart: SKU '${skuCode}', quantity ${qty}`);
            }

            // Validate & Lock inventory row in PostgreSQL
            const invRes = await tx.query(
              'SELECT id, in_stock_quantity, reserved_quantity, available_quantity, selling_price_inr FROM partner_inventories WHERE partner_id = $1 AND sku_code = $2 FOR UPDATE',
              [partnerId, skuCode]
            );

            if (invRes.rows.length === 0) {
              throw new Error(`SKU '${skuCode}' is not stocked by partner '${partnerId}'`);
            }

            const inv = invRes.rows[0];
            const availableStock = inv.in_stock_quantity - inv.reserved_quantity;

            if (availableStock < qty) {
              throw new Error(
                `Insufficient stock for '${skuCode}' at partner '${partnerId}'. Requested: ${qty}, Available: ${availableStock}`
              );
            }

            // Atomically reserve stock
            const newReserved = inv.reserved_quantity + qty;
            const newAvailable = inv.in_stock_quantity - newReserved;

            await tx.query(
              `UPDATE partner_inventories 
               SET reserved_quantity = $1, available_quantity = $2, last_updated = NOW() 
               WHERE id = $3`,
              [newReserved, newAvailable, inv.id]
            );

            // Record inventory reservation transaction
            await tx.query(
              `INSERT INTO inventory_transactions (id, inventory_id, partner_id, sku_code, transaction_type, quantity_change, previous_quantity, new_quantity, reference_id, notes)
               VALUES ($1, $2, $3, $4, 'RESERVATION_ORDER', $5, $6, $7, $8, $9)`,
              [
                `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                inv.id,
                partnerId,
                skuCode,
                -qty,
                inv.available_quantity,
                newAvailable,
                orderId,
                `Reserved for order ${orderNumber}`,
              ]
            );

            const unitPrice = parseFloat(inv.selling_price_inr);
            const lineTotal = Math.round(unitPrice * qty * 100) / 100;

            // Resolve sku_id foreign key from skus table
            const skuLookup = await tx.query(
              'SELECT id, name, unit_of_measure FROM skus WHERE sku_code = $1 OR id = $1',
              [skuCode]
            );
            const skuRow = skuLookup.rows[0];
            const skuId = skuRow?.id || skuCode;
            const name = item.item_name || skuRow?.name || skuCode;
            const brand = 'Polycab';
            const series = 'Standard';
            const unit = skuRow?.unit_of_measure || 'Nos';

            const fitId = `fit-${fulId}-${savedItems.length + 1}`;
            await tx.query(
              `INSERT INTO fulfillment_items (id, fulfillment_id, sku_id, sku_code, product_name, brand, series, quantity, unit_price_inr, line_total_inr, unit)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [fitId, fulId, skuId, skuCode, name, brand, series, qty, unitPrice, lineTotal, unit]
            );

            savedItems.push({
              sku: skuCode,
              name,
              brand,
              series,
              quantity: qty,
              unitPrice,
              unit,
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
            partnerId,
            partnerName: partner.business_name,
            partnerType: partner.type,
            partnerAddress: partnerAddr,
            status: 'CONFIRMED',
            eta,
            driverName: fulIndex === 1 ? 'K. Somesh (ElectraKart Pilot)' : 'Regional Logistics Van (AP16-TE-8102)',
            driverPhone: '+91 99482 10928',
            handoverOtp: otp,
            lastUpdated: 'Just now',
            items: savedItems,
            trackingHistory: [
              { status: 'PLACED', timestamp: nowStr, title: 'Order Placed', description: `Paid via ${paymentMethod}` },
              {
                status: 'CONFIRMED',
                timestamp: nowStr,
                title: 'Store Assigned',
                description: `Allocated to ${partner.business_name}`,
              },
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

      // Record Idempotency Key if header present
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
      if (idempotencyKey) {
        await recordIdempotency(idempotencyKey, request.user?.id, request.url, request.body, 201, createdOrder);
      }

      // Post-Commit Notification Event Hook
      const customerUserId = request.user?.id || 'usr-customer-1';
      notificationService
        .publishEvent({
          eventType: 'ORDER_PLACED',
          userId: customerUserId,
          role: 'CUSTOMER',
          title: `Order Placed: ${createdOrder.orderNumber}`,
          message: `Your order for ${createdOrder.fulfillments.length} package(s) has been placed successfully.`,
          entityType: 'ORDER',
          entityId: createdOrder.id,
          linkActionUrl: `/orders/${createdOrder.id}`,
          recipientEmail: request.user?.email || 'customer@electrakart.com',
          recipientPhone: customerPhone,
          metadata: {
            orderId: createdOrder.id,
            orderNumber: createdOrder.orderNumber,
            customerName,
            grandTotal: createdOrder.grandTotal,
            itemCount: createdOrder.fulfillments.reduce((acc: number, f: any) => acc + f.items.length, 0),
          },
          isCriticalTransactional: true,
        })
        .catch((e) => console.error('[Notification Hook Error] ORDER_PLACED:', e));

      for (const ful of createdOrder.fulfillments) {
        const isDist = ful.partnerType === 'DISTRIBUTOR' || (ful.partnerId && ful.partnerId.startsWith('dist-'));
        const partnerRole = isDist ? 'DISTRIBUTOR' : 'RETAILER';
        let partnerUserId: string | undefined = undefined;
        if (ful.partnerId === 'dist-abc-vja-hub') {
          partnerUserId = 'usr-distributor-1';
        } else if (ful.partnerId === 'partner-vja-elec-1' || ful.partnerId === 'partner-anchor-exclusive') {
          partnerUserId = 'usr-retailer-1';
        }

        notificationService
          .publishEvent({
            eventType: 'FULFILLMENT_ASSIGNED',
            userId: partnerUserId,
            role: partnerRole,
            title: `New Fulfillment Assigned: ${createdOrder.orderNumber}`,
            message: `Package allocated for fulfillment. Items: ${ful.items.length}.`,
            entityType: 'FULFILLMENT',
            entityId: ful.id,
            linkActionUrl: isDist ? '/distributor/orders' : '/retailer/orders',
            metadata: {
              orderId: createdOrder.id,
              fulfillmentId: ful.id,
              partnerId: ful.partnerId,
              partnerName: ful.partnerName,
            },
          })
          .catch((e) => console.error('[Notification Hook Error] FULFILLMENT_ASSIGNED:', e));
      }

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

  // Get single order by ID or Number (with IDOR ownership protection)
  fastify.get('/orders/:id', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
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

    // IDOR Ownership verification
    if (request.user) {
      const user = request.user;
      if (user.role === 'CUSTOMER') {
        if (o.customer_id && o.customer_id !== user.id) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You do not have permission to view another customer’s order.',
            instance: request.url,
          });
        }
      } else if (user.role === 'RETAILER' || user.role === 'DISTRIBUTOR') {
        const hasFulfillment = fulfillments.some((f) => f.partnerId === user.partnerId);
        if (!hasFulfillment) {
          return reply.status(403).send({
            type: 'https://api.electrakart.com/errors/forbidden',
            title: 'Forbidden',
            status: 403,
            detail: 'You do not have permission to view an order not allocated to your store/depot.',
            instance: request.url,
          });
        }
      }
    }

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

  // Update fulfillment lifecycle status (Partner action with ownership checks)
  const handleFulfillmentStatus = async (request: any, reply: any) => {
    const { orderId, fulfillmentId } = request.params as any;
    const { status, note, driverName, driverPhone } = (request.body as any) || {};

    const allowedStatuses = ['CONFIRMED', 'PREPARING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];
    if (!status || !allowedStatuses.includes(status)) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/invalid-status',
        title: 'Invalid Status',
        status: 400,
        detail: `Status must be one of: ${allowedStatuses.join(', ')}`,
        instance: request.url,
      });
    }

    // Check fulfillment existence
    const fRes = await db.query(
      'SELECT partner_id FROM order_fulfillments WHERE id = $1 AND order_id = $2',
      [fulfillmentId, orderId]
    );

    if (fRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Fulfillment Not Found',
        status: 404,
        detail: `Fulfillment '${fulfillmentId}' for order '${orderId}' was not found.`,
        instance: request.url,
      });
    }

    const ful = fRes.rows[0];
    const user = request.user;

    // If authenticated user is present, enforce role boundaries
    if (user) {
      // Customers cannot update fulfillment status
      if (user.role === 'CUSTOMER') {
        return reply.status(403).send({
          type: 'https://api.electrakart.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Customers are not authorized to update fulfillment logistics.',
          instance: request.url,
        });
      }

      // Retailer / Distributor can only update their own partner fulfillment
      if ((user.role === 'RETAILER' || user.role === 'DISTRIBUTOR') && ful.partner_id !== user.partnerId) {
        return reply.status(403).send({
          type: 'https://api.electrakart.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You are not authorized to update a fulfillment assigned to another partner node.',
          instance: request.url,
        });
      }
    }

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
        const partnerId = ful.partner_id;

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

    // Post-Commit Notification Hook
    const orderDetailsRes = await db.query(
      'SELECT customer_id, customer_name, customer_phone, order_number FROM orders WHERE id = $1',
      [orderId]
    );
    const ordMeta = orderDetailsRes.rows[0] || {};
    const fulOtpRes = await db.query('SELECT handover_otp FROM order_fulfillments WHERE id = $1', [fulfillmentId]);

    let eventType: any = 'ORDER_CONFIRMED';
    if (status === 'PREPARING') eventType = 'FULFILLMENT_PREPARING';
    else if (status === 'PACKED') eventType = 'FULFILLMENT_PACKED';
    else if (status === 'DISPATCHED') eventType = 'ORDER_DISPATCHED';
    else if (status === 'DELIVERED') eventType = 'ORDER_DELIVERED';
    else if (status === 'CANCELLED') eventType = 'ORDER_CANCELLED';

    notificationService
      .publishEvent({
        eventType,
        userId: ordMeta.customer_id,
        role: 'CUSTOMER',
        title: `Order ${ordMeta.order_number}: ${status.replace('_', ' ')}`,
        message: `Your package fulfillment status has been updated to ${status}.`,
        entityType: 'ORDER',
        entityId: orderId,
        linkActionUrl: `/orders/${orderId}`,
        recipientPhone: ordMeta.customer_phone,
        metadata: {
          orderId,
          orderNumber: ordMeta.order_number,
          customerName: ordMeta.customer_name,
          fulfillmentId,
          status,
          otp: fulOtpRes.rows[0]?.handover_otp,
        },
        isCriticalTransactional: true,
      })
      .catch((e) => console.error('[Notification Hook Error] FULFILLMENT_STATUS:', e));

    return reply.send({
      orderId,
      fulfillmentId,
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  fastify.post('/orders/:orderId/fulfillments/:fulfillmentId/status', { preHandler: [optionalAuthenticate] }, handleFulfillmentStatus);
  fastify.patch('/orders/:orderId/fulfillments/:fulfillmentId/status', { preHandler: [optionalAuthenticate] }, handleFulfillmentStatus);

  // Cancel entire order & atomically roll back inventory
  fastify.post('/orders/:id/cancel', { preHandler: [optionalAuthenticate] }, async (request, reply) => {
    const { id } = request.params as any;
    const { reason } = (request.body as any) || {};

    try {
      const result = await paymentService.cancelOrder(id, request.user, reason);

      // Notification hook for cancelled order
      notificationService
        .publishEvent({
          eventType: 'ORDER_CANCELLED',
          userId: request.user?.id || 'usr-customer-1',
          role: 'CUSTOMER',
          title: `Order Cancelled: ${result.orderNumber || id}`,
          message: `Your order has been cancelled. Reason: ${reason || 'Customer request'}.`,
          entityType: 'ORDER',
          entityId: id,
          linkActionUrl: `/orders/${id}`,
          metadata: { orderId: id, orderNumber: result.orderNumber, reason },
          isCriticalTransactional: true,
        })
        .catch((e) => console.error('[Notification Hook Error] ORDER_CANCELLED:', e));

      return reply.send(result);
    } catch (err: any) {
      const isForbidden = err.message.includes('Forbidden');
      const isProhibited = err.message.includes('dispatched or delivered');
      const status = isForbidden ? 403 : isProhibited ? 409 : 404;

      return reply.status(status).send({
        type: 'https://api.electrakart.com/errors/cancellation-failed',
        title: 'Cancellation Failed',
        status,
        detail: err.message,
        instance: request.url,
      });
    }
  });
}
