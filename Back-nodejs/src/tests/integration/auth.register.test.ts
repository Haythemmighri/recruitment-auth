import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database.config';
import { UserStatus } from '@prisma/client';

describe('Auth Integration: Register & Verify', () => {
  const validRegisterPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.register@example.com',
    phone: '+12345678901',
    password: 'StrongPassword123!',
  };

  beforeEach(async () => {
    // Clean up specific data
    await prisma.user.deleteMany({
      where: { email: validRegisterPayload.email },
    });
  });

  it('should register a new user and set status to PENDING_VERIFICATION', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/check your email/i);

    const user = await prisma.user.findUnique({
      where: { email: validRegisterPayload.email },
      include: { emailVerificationTokens: true },
    });

    expect(user).toBeDefined();
    expect(user!.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(user!.isEmailVerified).toBe(false);
    expect(user!.emailVerificationTokens.length).toBe(1);
    expect(user!.emailVerificationTokens[0].used).toBe(false);
  });

  it('should reject weak passwords', async () => {
    const payload = { ...validRegisterPayload, password: 'weak' };
    const res = await request(app).post('/auth/register').send(payload).expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.errors.password).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/auth/register').send(validRegisterPayload).expect(201);

    const payload = { ...validRegisterPayload, phone: '+19999999999' };
    const res = await request(app).post('/auth/register').send(payload).expect(409);

    expect(res.body.message).toMatch(/email address is already registered/i);
  });
});
