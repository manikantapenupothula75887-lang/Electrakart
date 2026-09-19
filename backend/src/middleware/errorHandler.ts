import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  requestId: string;
  errorCode?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Handle Fastify validation errors
  let invalidParams: Array<{ name: string; reason: string }> | undefined;
  if (error.validation) {
    invalidParams = error.validation.map((v) => ({
      name: String(v.instancePath || (v.params as any)?.missingProperty || 'unknown'),
      reason: v.message || 'Validation failed',
    }));
  }

  const problem: ProblemDetails = {
    type: `https://api.electrakart.com/errors/${error.code || (statusCode === 400 ? 'validation-error' : 'internal-error')}`,
    title: error.validation ? 'Invalid Request Parameters' : error.name || 'Internal Server Error',
    status: statusCode,
    detail:
      isProd && statusCode >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : error.message,
    instance: request.url,
    timestamp: new Date().toISOString(),
    requestId: request.id,
    errorCode: error.code || (error.validation ? 'ERR_VALIDATION_FAILED' : 'ERR_INTERNAL_SERVER'),
    invalidParams,
  };

  if (statusCode >= 500) {
    request.log.error(
      {
        err: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        requestId: request.id,
      },
      'Internal Server Error'
    );
  }

  reply
    .status(statusCode)
    .header('Content-Type', 'application/problem+json')
    .header('X-Request-ID', request.id)
    .send(problem);
}
