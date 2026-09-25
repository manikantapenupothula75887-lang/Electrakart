/**
 * ElectraKart Electrician Marketplace Fastify Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ElectricianService } from './electrician.service.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import {
  ElectricianRegisterInput,
  ElectricianSearchQuery,
  CreateServiceRequestInput,
  ServiceRequestStatus,
  SubmitRatingInput,
  ElectricianVerificationStatus,
} from './electrician.types.js';

const electricianService = new ElectricianService();

export async function electricianRoutes(app: FastifyInstance): Promise<void> {
  // 1. Electrician Registration (Public)
  app.post('/electricians/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = (request.body as ElectricianRegisterInput) || {};
      if (
        !body.fullName ||
        !body.phone ||
        !body.city ||
        !body.pincode ||
        body.latitude === undefined ||
        body.longitude === undefined
      ) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/validation',
          title: 'Validation Failed',
          status: 400,
          detail: 'Full name, phone, city, pincode, latitude, and longitude are required.',
        });
      }

      const result = await electricianService.registerElectrician(body);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/bad-request',
        title: 'Registration Error',
        status: 400,
        detail: err.message,
      });
    }
  });

  // 2. Get My Electrician Profile (ELECTRICIAN only)
  app.get(
    '/electricians/me',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const profile = await electricianService.getProfileByUserId(request.user!.id);
      if (!profile) {
        return reply.status(404).send({
          type: 'https://api.electrakart.com/errors/not-found',
          title: 'Profile Not Found',
          status: 404,
          detail: 'Electrician profile not found for the authenticated account.',
        });
      }
      return reply.send(profile);
    }
  );

  // 3. Toggle Online/Offline Status (ELECTRICIAN only)
  app.put(
    '/electricians/me/status',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as { isOnline: boolean }) || {};
        const profile = await electricianService.getProfileByUserId(request.user!.id);
        if (!profile) {
          return reply.status(404).send({ status: 404, detail: 'Electrician profile not found' });
        }
        const updated = await electricianService.updateOnlineStatus(
          profile.id,
          Boolean(body.isOnline)
        );
        return reply.send(updated);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Status Update Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 4. Update Profile & Specializations (ELECTRICIAN only)
  app.put(
    '/electricians/me/profile',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as Partial<ElectricianRegisterInput>) || {};
        const profile = await electricianService.getProfileByUserId(request.user!.id);
        if (!profile) {
          return reply.status(404).send({ status: 404, detail: 'Electrician profile not found' });
        }
        const updated = await electricianService.updateProfile(profile.id, body);
        return reply.send(updated);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Update Profile Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 5. Customer Search Nearby Electricians (Public or Customer)
  app.get('/electricians/search', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = (request.query as ElectricianSearchQuery) || {};
      if (query.latitude === undefined || query.longitude === undefined) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/validation',
          title: 'Validation Error',
          status: 400,
          detail: 'Customer latitude and longitude are required for searching nearby electricians.',
        });
      }
      const results = await electricianService.searchElectricians(query);
      return reply.send(results);
    } catch (err: any) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/bad-request',
        title: 'Search Failed',
        status: 400,
        detail: err.message,
      });
    }
  });

  // 6. Customer Create Service Request (CUSTOMER only)
  app.post(
    '/electricians/requests',
    { preHandler: [authenticate, requireRole('CUSTOMER')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = (request.body as CreateServiceRequestInput) || {};
        if (
          !body.category ||
          !body.description ||
          !body.address ||
          !body.city ||
          !body.pincode ||
          body.latitude === undefined ||
          body.longitude === undefined
        ) {
          return reply.status(400).send({
            type: 'https://api.electrakart.com/errors/validation',
            title: 'Validation Error',
            status: 400,
            detail:
              'Category, description, address, city, pincode, latitude, and longitude are required.',
          });
        }
        const result = await electricianService.createServiceRequest(request.user!.id, body);
        return reply.status(201).send(result);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Create Request Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 7. Get My Requests (CUSTOMER or ELECTRICIAN)
  app.get(
    '/electricians/requests/my',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const results = await electricianService.getMyRequests(user.id, user.role);
      return reply.send(results);
    }
  );

  // 8. Get Available Requests for Electrician (ELECTRICIAN only)
  app.get(
    '/electricians/requests/available',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const profile = await electricianService.getProfileByUserId(request.user!.id);
      if (!profile) return reply.status(404).send({ status: 404, detail: 'Electrician profile not found' });
      const available = await electricianService.getAvailableRequestsForElectrician(profile.id);
      return reply.send(available);
    }
  );

  // 9. Atomic Acceptance (ELECTRICIAN only)
  app.post(
    '/electricians/requests/:id/accept',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const profile = await electricianService.getProfileByUserId(request.user!.id);
        if (!profile) return reply.status(404).send({ status: 404, detail: 'Electrician profile not found' });

        const result = await electricianService.acceptRequestAtomic(id, profile.id);
        return reply.send(result);
      } catch (err: any) {
        if (err.message.includes('JOB_ALREADY_ASSIGNED') || err.message.includes('no longer available')) {
          return reply.status(409).send({
            type: 'https://api.electrakart.com/errors/conflict',
            title: 'Job Already Assigned',
            status: 409,
            detail: err.message,
            errorCode: 'ERR_JOB_ALREADY_ASSIGNED',
          });
        }
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Acceptance Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 10. Update Request Status progression (ELECTRICIAN only)
  app.put(
    '/electricians/requests/:id/status',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const body = (request.body as { status: ServiceRequestStatus; totalCharges?: number }) || {};
        const profile = await electricianService.getProfileByUserId(request.user!.id);
        if (!profile) return reply.status(404).send({ status: 404, detail: 'Electrician profile not found' });

        const updated = await electricianService.updateRequestStatus(
          id,
          profile.id,
          body.status,
          body.totalCharges
        );
        return reply.send(updated);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Status Update Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 11. Cancel Request (CUSTOMER or ELECTRICIAN)
  app.post(
    '/electricians/requests/:id/cancel',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const body = (request.body as { reason: string }) || {};
        const user = request.user!;
        const cancelled = await electricianService.cancelRequest(
          id,
          user.id,
          user.role,
          body.reason || 'Cancelled by user'
        );
        return reply.send(cancelled);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Cancellation Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 12. Submit Rating & Review (CUSTOMER only)
  app.post(
    '/electricians/requests/:id/rate',
    { preHandler: [authenticate, requireRole('CUSTOMER')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const body = (request.body as SubmitRatingInput) || {};
        const result = await electricianService.submitRating(id, request.user!.id, body);
        return reply.send(result);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Rating Submission Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 13. Admin: List All Electricians (ADMIN only)
  app.get(
    '/admin/electricians',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = (request.query as { status?: ElectricianVerificationStatus }) || {};
      const list = await electricianService.adminListElectricians(query.status);
      return reply.send(list);
    }
  );

  // 14. Admin: Verify / Approve / Reject / Suspend Electrician (ADMIN only)
  app.put(
    '/admin/electricians/:id/verify',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const body =
          (request.body as {
            status: ElectricianVerificationStatus;
            rejectionReason?: string;
          }) || {};
        const result = await electricianService.adminVerifyElectrician(
          id,
          body.status,
          body.rejectionReason
        );
        return reply.send(result);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Verification Action Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 15. Admin: Electrician Marketplace Metrics (ADMIN only)
  app.get(
    '/admin/electricians/metrics',
    { preHandler: [authenticate, requireRole('ADMIN')] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = await electricianService.adminGetMetrics();
      return reply.send(metrics);
    }
  );

  // 16. Electrician GPS Telemetry Ingestion (Electrician mobile app / portal)
  app.post(
    '/electricians/me/location',
    { preHandler: [authenticate, requireRole('ELECTRICIAN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const profile = await electricianService.getProfileByUserId(request.user!.id);
        if (!profile) {
          return reply.status(404).send({
            type: 'https://api.electrakart.com/errors/not-found',
            title: 'Profile Not Found',
            status: 404,
            detail: 'Electrician profile not found.',
          });
        }

        const body = (request.body as any) || {};
        if (body.latitude === undefined || body.longitude === undefined) {
          return reply.status(400).send({
            type: 'https://api.electrakart.com/errors/validation',
            title: 'Validation Failed',
            status: 400,
            detail: 'latitude and longitude are required.',
          });
        }

        const result = await electricianService.recordLocation(profile.id, {
          latitude: Number(body.latitude),
          longitude: Number(body.longitude),
          accuracy: body.accuracy ? Number(body.accuracy) : undefined,
          heading: body.heading ? Number(body.heading) : undefined,
          speed: body.speed ? Number(body.speed) : undefined,
          jobId: body.jobId,
        });

        return reply.status(201).send(result);
      } catch (err: any) {
        return reply.status(400).send({
          type: 'https://api.electrakart.com/errors/bad-request',
          title: 'Location Ingestion Failed',
          status: 400,
          detail: err.message,
        });
      }
    }
  );

  // 17. Customer Live Electrician Job Tracking
  app.get(
    '/electricians/requests/:id/tracking',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = (request.params as { id: string }) || {};
        const customerId = request.user!.role === 'CUSTOMER' ? request.user!.id : undefined;
        const tracking = await electricianService.getJobTracking(id, customerId);
        return reply.send(tracking);
      } catch (err: any) {
        const status = err.message.includes('Forbidden') ? 403 : 404;
        return reply.status(status).send({
          type: 'https://api.electrakart.com/errors/tracking-error',
          title: 'Tracking Error',
          status,
          detail: err.message,
        });
      }
    }
  );
}
