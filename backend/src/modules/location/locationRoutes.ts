import { FastifyInstance } from 'fastify';
import { geocodingService } from './geocoding.service.js';

export async function locationRoutes(fastify: FastifyInstance) {
  // POST /location/resolve - Resolve coordinates or address details
  fastify.post('/location/resolve', async (request, reply) => {
    const body = (request.body as any) || {};
    const { latitude, longitude, address, pincode } = body;

    const result = await geocodingService.resolveLocation({
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
      address,
      pincode,
    });

    return reply.send({ location: result });
  });
}
