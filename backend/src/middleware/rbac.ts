import { FastifyReply, FastifyRequest } from 'fastify';

export function requireRole(...allowedRoles: Array<'CUSTOMER' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN'>) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.status(401).send({
        type: 'https://api.electrakart.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'User not authenticated',
        instance: request.url,
        timestamp: new Date().toISOString(),
        errorCode: 'ERR_UNAUTHORIZED',
      });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      reply.status(403).send({
        type: 'https://api.electrakart.com/errors/forbidden',
        title: 'Access Forbidden',
        status: 403,
        detail: `Role '${request.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`,
        instance: request.url,
        timestamp: new Date().toISOString(),
        errorCode: 'ERR_FORBIDDEN',
      });
      return;
    }
  };
}
