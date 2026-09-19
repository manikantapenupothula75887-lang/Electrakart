import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  errorCode?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const problem: ProblemDetails = {
    type: `https://api.electrakart.com/errors/${error.code || 'internal-error'}`,
    title: error.name || 'Internal Server Error',
    status: statusCode,
    detail: isProd && statusCode === 500 ? 'An unexpected error occurred. Please try again later.' : error.message,
    instance: request.url,
    timestamp: new Date().toISOString(),
    errorCode: error.code || 'ERR_INTERNAL_SERVER',
  };

  if (statusCode >= 500) {
    request.log.error(error);
  }

  reply.status(statusCode).header('Content-Type', 'application/problem+json').send(problem);
}
