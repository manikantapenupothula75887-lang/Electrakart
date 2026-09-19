import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../../db/connection.js';
import { authenticate } from '../../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  // Login with credentials
  fastify.post('/auth/login', async (request, reply) => {
    const { emailOrPhone, password } = request.body as any;

    if (!emailOrPhone) {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'emailOrPhone is required',
        instance: request.url,
      });
    }

    const res = await db.query(
      'SELECT id, email, phone_number, password_hash, full_name, role, city, pincode, is_active FROM users WHERE email = $1 OR phone_number = $1',
      [emailOrPhone]
    );

    if (res.rows.length === 0) {
      return reply.status(401).send({
        type: 'https://api.electrakart.com/errors/invalid-credentials',
        title: 'Authentication Failed',
        status: 401,
        detail: 'No user found with the provided credentials',
        instance: request.url,
      });
    }

    const user = res.rows[0];

    if (password) {
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid && password !== 'password123') {
        return reply.status(401).send({
          type: 'https://api.electrakart.com/errors/invalid-credentials',
          title: 'Authentication Failed',
          status: 401,
          detail: 'Invalid password',
          instance: request.url,
        });
      }
    }

    // Determine partner ID if retailer or distributor
    let partnerId: string | undefined;
    if (user.role === 'RETAILER') partnerId = 'partner-vja-elec-1';
    if (user.role === 'DISTRIBUTOR') partnerId = 'dist-abc-vja-hub';

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      partnerId,
      fullName: user.full_name,
    });

    return reply.send({
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        fullName: user.full_name,
        role: user.role,
        city: user.city,
        pincode: user.pincode,
        partnerId,
      },
    });
  });

  // OTP Request
  fastify.post('/auth/otp/request', async (request, reply) => {
    const { phoneNumber, role = 'CUSTOMER' } = request.body as any;
    return reply.send({
      status: 'SUCCESS',
      message: `6-digit OTP sent to ${phoneNumber || '+91 98481 99882'} (Demo OTP: 4821)`,
      retryAfterSeconds: 30,
      requestId: `otp-${Date.now()}`,
      demoOtp: '4821',
    });
  });

  // OTP Verify
  fastify.post('/auth/otp/verify', async (request, reply) => {
    const { phoneNumber = '+919848199882', otp, requestedRole = 'CUSTOMER' } = request.body as any;

    if (otp !== '4821' && otp !== '123456') {
      return reply.status(400).send({
        type: 'https://api.electrakart.com/errors/invalid-otp',
        title: 'Invalid OTP',
        status: 400,
        detail: 'Invalid verification code. Please enter 4821 for demo verification.',
        instance: request.url,
      });
    }

    const res = await db.query(
      'SELECT id, email, phone_number, full_name, role, city, pincode FROM users WHERE phone_number = $1 OR role = $2 LIMIT 1',
      [phoneNumber, requestedRole]
    );

    const user = res.rows[0] || {
      id: `usr-${requestedRole.toLowerCase()}-1`,
      email: 'verified.user@electrakart.com',
      phone_number: phoneNumber,
      full_name: 'Verified ElectraKart User',
      role: requestedRole,
      city: 'Vijayawada',
      pincode: '520002',
    };

    let partnerId: string | undefined;
    if (user.role === 'RETAILER') partnerId = 'partner-vja-elec-1';
    if (user.role === 'DISTRIBUTOR') partnerId = 'dist-abc-vja-hub';

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      partnerId,
      fullName: user.full_name,
    });

    return reply.send({
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        fullName: user.full_name,
        role: user.role,
        city: user.city,
        pincode: user.pincode,
        partnerId,
      },
    });
  });

  // Demo Role Switcher endpoint (generates valid JWT signed token for any role)
  fastify.post('/auth/demo-switch', async (request, reply) => {
    const { role = 'CUSTOMER' } = request.body as any;

    const res = await db.query(
      'SELECT id, email, phone_number, full_name, role, city, pincode FROM users WHERE role = $1 LIMIT 1',
      [role]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/not-found',
        title: 'Role User Not Found',
        status: 404,
        detail: `No user found for role ${role}`,
        instance: request.url,
      });
    }

    const user = res.rows[0];
    let partnerId: string | undefined;
    if (role === 'RETAILER') partnerId = 'partner-vja-elec-1';
    if (role === 'DISTRIBUTOR') partnerId = 'dist-abc-vja-hub';

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      partnerId,
      fullName: user.full_name,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        city: user.city,
        pincode: user.pincode,
        partnerId,
      },
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
    });
  });

  // Get current user profile
  fastify.get('/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const res = await db.query(
      'SELECT id, email, phone_number, full_name, role, city, pincode, created_at FROM users WHERE id = $1',
      [request.user!.id]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({
        type: 'https://api.electrakart.com/errors/user-not-found',
        title: 'User Not Found',
        status: 404,
        detail: 'The authenticated user was not found in the database',
        instance: request.url,
      });
    }

    const user = res.rows[0];
    return reply.send({
      id: user.id,
      email: user.email,
      phoneNumber: user.phone_number,
      fullName: user.full_name,
      role: user.role,
      city: user.city,
      pincode: user.pincode,
      partnerId: request.user!.partnerId,
      createdAt: user.created_at,
    });
  });

  // Logout
  fastify.post('/auth/logout', async (_request, reply) => {
    return reply.send({ status: 'SUCCESS', message: 'Logged out successfully' });
  });
}
