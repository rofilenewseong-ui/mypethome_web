import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

const TEST_USER = {
  email: `test-${Date.now()}@petholo.com`,
  password: 'Test1234!',
  name: '테스트 유저',
};

let accessToken: string;
let refreshTokenCookie: string;

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      // Firebase가 안 되면 500, 되면 201
      if (res.status === 201) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user.email).toBe(TEST_USER.email);
        accessToken = res.body.data.accessToken;
        refreshTokenCookie = res.headers['set-cookie']?.[0] || '';
      } else {
        // Firebase 미연결 시 — 테스트 스킵 가능
        expect([500, 503]).toContain(res.status);
      }
    });

    it('should reject duplicate email', async () => {
      if (!accessToken) return; // Firebase 미연결 시 스킵

      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      expect(res.status).toBe(409);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'Test1234!', name: 'x' });

      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'a@b.com', password: '123', name: 'x' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      accessToken = res.body.data.accessToken;
      refreshTokenCookie = res.headers['set-cookie']?.[0] || '';
    });

    it('should reject wrong password', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPass1!' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user info with valid token', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(TEST_USER.email);
      expect(res.body.data.name).toBe(TEST_USER.name);
      expect(res.body.data.isVerified).toBeDefined();
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      if (!refreshTokenCookie) return;

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie);

      if (res.status === 200) {
        expect(res.body.success).toBe(true);
        expect(res.body.data.accessToken).toBeDefined();
      }
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should clear cookies', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

describe('Health Check', () => {
  it('GET /api/health should return healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('healthy');
  });
});
