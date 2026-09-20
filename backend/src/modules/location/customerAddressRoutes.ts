import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../db/connection.js';
import { geocodingService } from './geocoding.service.js';
import { CustomerAddress, CreateAddressInput, UpdateAddressInput } from './location.types.js';

export async function customerAddressRoutes(fastify: FastifyInstance) {
  // 1. GET /customers/me/addresses - List addresses for authenticated customer
  fastify.get('/customers/me/addresses', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;

    const res = await db.query<CustomerAddress>(
      `SELECT id, user_id, recipient_name, phone_number, address_line1, address_line2,
              landmark, city, state, pincode, country, address_type, is_default, source,
              latitude, longitude, normalized_address, created_at, updated_at
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return reply.send({ addresses: res.rows });
  });

  // 2. POST /customers/me/addresses - Create new address
  fastify.post('/customers/me/addresses', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const body = request.body as CreateAddressInput;

    if (!body.recipient_name || !body.phone_number || !body.address_line1 || !body.city || !body.pincode) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/validation',
        title: 'Validation Error',
        status: 400,
        detail: 'recipient_name, phone_number, address_line1, city, and pincode are required.',
        instance: request.url,
      });
    }

    // Resolve coordinates if not provided
    let lat = body.latitude;
    let lng = body.longitude;
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      const resolved = await geocodingService.resolveLocation({
        address: `${body.address_line1}, ${body.city}`,
        pincode: body.pincode,
      });
      lat = resolved.latitude;
      lng = resolved.longitude;
    }

    const normalized = geocodingService.normalizeAddress({
      address_line1: body.address_line1,
      address_line2: body.address_line2,
      landmark: body.landmark,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      country: body.country,
    });

    // Check existing addresses
    const existing = await db.query('SELECT COUNT(*) as count FROM addresses WHERE user_id = $1', [userId]);
    const isFirst = parseInt(existing.rows[0]?.count || '0', 10) === 0;
    const isDefault = body.is_default !== undefined ? Boolean(body.is_default) : isFirst;

    if (isDefault) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const addressId = `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const addressType = body.address_type || 'HOME';
    const source = body.source || 'MANUAL';
    const state = body.state || 'Andhra Pradesh';
    const country = body.country || 'India';

    const insertRes = await db.query<CustomerAddress>(
      `INSERT INTO addresses (
        id, user_id, recipient_name, phone_number, address_line1, address_line2,
        landmark, city, state, pincode, country, address_type, is_default, source,
        latitude, longitude, normalized_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        addressId,
        userId,
        body.recipient_name,
        body.phone_number,
        body.address_line1,
        body.address_line2 || null,
        body.landmark || null,
        body.city,
        state,
        body.pincode,
        country,
        addressType,
        isDefault,
        source,
        lat,
        lng,
        normalized,
      ]
    );

    return reply.status(201).send({ address: insertRes.rows[0] });
  });

  // 3. GET /customers/me/addresses/:id - Single address with IDOR protection
  fastify.get('/customers/me/addresses/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params as { id: string };

    const res = await db.query<CustomerAddress>('SELECT * FROM addresses WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Address Not Found',
        status: 404,
        detail: `Address with id ${id} does not exist.`,
        instance: request.url,
      });
    }

    const addr = res.rows[0];
    if (addr.user_id !== userId && request.user.role !== 'ADMIN') {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to view this customer address.',
        instance: request.url,
      });
    }

    return reply.send({ address: addr });
  });

  // 4. PATCH /customers/me/addresses/:id - Update address with IDOR protection
  fastify.patch('/customers/me/addresses/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params as { id: string };
    const body = request.body as UpdateAddressInput;

    const existingRes = await db.query<CustomerAddress>('SELECT * FROM addresses WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Address Not Found',
        status: 404,
        detail: `Address with id ${id} does not exist.`,
        instance: request.url,
      });
    }

    const existing = existingRes.rows[0];
    if (existing.user_id !== userId && request.user.role !== 'ADMIN') {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to modify this customer address.',
        instance: request.url,
      });
    }

    if (body.is_default === true) {
      await db.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const updatedRecipient = body.recipient_name ?? existing.recipient_name;
    const updatedPhone = body.phone_number ?? existing.phone_number;
    const updatedLine1 = body.address_line1 ?? existing.address_line1;
    const updatedLine2 = body.address_line2 !== undefined ? body.address_line2 : existing.address_line2;
    const updatedLandmark = body.landmark !== undefined ? body.landmark : existing.landmark;
    const updatedCity = body.city ?? existing.city;
    const updatedState = body.state ?? existing.state;
    const updatedPincode = body.pincode ?? existing.pincode;
    const updatedCountry = body.country ?? existing.country;
    const updatedType = body.address_type ?? existing.address_type;
    const updatedDefault = body.is_default !== undefined ? body.is_default : existing.is_default;
    const updatedSource = body.source ?? existing.source;
    let updatedLat = body.latitude !== undefined ? body.latitude : existing.latitude;
    let updatedLng = body.longitude !== undefined ? body.longitude : existing.longitude;

    if (body.address_line1 || body.city || body.pincode) {
      if (body.latitude === undefined && body.longitude === undefined) {
        const resolved = await geocodingService.resolveLocation({
          address: `${updatedLine1}, ${updatedCity}`,
          pincode: updatedPincode,
        });
        updatedLat = resolved.latitude;
        updatedLng = resolved.longitude;
      }
    }

    const normalized = geocodingService.normalizeAddress({
      address_line1: updatedLine1,
      address_line2: updatedLine2,
      landmark: updatedLandmark,
      city: updatedCity,
      state: updatedState,
      pincode: updatedPincode,
      country: updatedCountry,
    });

    const updateRes = await db.query<CustomerAddress>(
      `UPDATE addresses
       SET recipient_name = $1, phone_number = $2, address_line1 = $3, address_line2 = $4,
           landmark = $5, city = $6, state = $7, pincode = $8, country = $9,
           address_type = $10, is_default = $11, source = $12, latitude = $13, longitude = $14,
           normalized_address = $15, updated_at = NOW()
       WHERE id = $16
       RETURNING *`,
      [
        updatedRecipient,
        updatedPhone,
        updatedLine1,
        updatedLine2,
        updatedLandmark,
        updatedCity,
        updatedState,
        updatedPincode,
        updatedCountry,
        updatedType,
        updatedDefault,
        updatedSource,
        updatedLat,
        updatedLng,
        normalized,
        id,
      ]
    );

    return reply.send({ address: updateRes.rows[0] });
  });

  // 5. DELETE /customers/me/addresses/:id - Delete address with IDOR protection
  fastify.delete('/customers/me/addresses/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user.id;
    const { id } = request.params as { id: string };

    const existingRes = await db.query<CustomerAddress>('SELECT * FROM addresses WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Address Not Found',
        status: 404,
        detail: `Address with id ${id} does not exist.`,
        instance: request.url,
      });
    }

    const existing = existingRes.rows[0];
    if (existing.user_id !== userId && request.user.role !== 'ADMIN') {
      return reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'You do not have permission to delete this customer address.',
        instance: request.url,
      });
    }

    await db.query('DELETE FROM addresses WHERE id = $1', [id]);
    return reply.send({ success: true, message: 'Address deleted successfully.' });
  });
}
