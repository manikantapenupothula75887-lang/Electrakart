import { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthUser {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'RETAILER' | 'DISTRIBUTOR' | 'ADMIN';
  partnerId?: string;
  fullName: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send({
      type: 'https://api.electrakart.com/errors/unauthorized',
      title: 'Authentication Required',
      status: 401,
      detail: 'Missing or invalid Authorization header. Please provide Bearer token.',
      instance: request.url,
      timestamp: new Date().toISOString(),
      errorCode: 'ERR_UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await request.server.jwt.verify<AuthUser>(token);
    request.user = decoded;
  } catch (err: any) {
    reply.status(401).send({
      type: 'https://api.electrakart.com/errors/token-invalid',
      title: 'Invalid or Expired Token',
      status: 401,
      detail: err.message || 'Token verification failed.',
      instance: request.url,
      timestamp: new Date().toISOString(),
      errorCode: 'ERR_TOKEN_INVALID',
    });
  }
}

export async function optionalAuthenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = await request.server.jwt.verify<AuthUser>(token);
      request.user = decoded;
    } catch {
      // Ignored for optional
    }
  }
}
