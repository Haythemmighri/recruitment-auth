import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../config/database.config';
import { hashPassword } from '../../utils/password.util';
import { UserStatus, Role } from '@prisma/client';

describe('Auth Integration: Login', () => {
  const credentials = {
    email: 'login.test@example.com',
    password: 'ValidPassword123!',
  };

  beforeAll(async () => {
    const passwordHash = await hashPassword(credentials.password);
    await prisma.user.create({
      data: {
        firstName: 'Login',
        lastName: 'Test',
        email: credentials.email,
        phone: '+15550000001',
        passwordHash,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        role: Role.CANDIDATE,
      },
    });
  });

  it('should login successfully and return tokens', async () => {
    const res = await request(app).post('/auth/login').send(credentials).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    
    // Check if refresh token cookie is set
    const cookies = (res.headers['set-cookie'] || []) as unknown as string[];
    expect(cookies).toBeDefined();
    const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='));
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toMatch(/HttpOnly/);
  });

  it('should reject invalid password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword1!' })
      .expect(401);

    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('should prevent login if email is not verified', async () => {
    // Create an unverified user
    const unverifiedCreds = {
      email: 'unverified@example.com',
      password: 'ValidPassword123!',
    };
    await prisma.user.create({
      data: {
        firstName: 'Un',
        lastName: 'Verified',
        email: unverifiedCreds.email,
        phone: '+15550000002',
        passwordHash: await hashPassword(unverifiedCreds.password),
        status: UserStatus.PENDING_VERIFICATION,
        isEmailVerified: false,
      },
    });

    const res = await request(app)
      .post('/auth/login')
      .send(unverifiedCreds)
      .expect(403);

    expect(res.body.message).toMatch(/verify your email address/i);
  });
});
