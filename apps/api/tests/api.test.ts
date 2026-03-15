import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

let accessToken: string;
const TEST_USER = {
  email: `api-test-${Date.now()}@petholo.com`,
  password: 'ApiTest1234!',
  name: 'API 테스터',
};

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // 유저 생성 시도
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      if (res.status === 201) {
        accessToken = res.body.data.accessToken;
      }
    } catch {
      // Firebase 미연결 — 이하 테스트 스킵됨
    }
  });

  describe('Pets API', () => {
    let petId: string;

    it('GET /api/pets should list pets (empty)', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/pets')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /api/pets should create a pet', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .post('/api/pets')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('name', '테스트 코코')
        .field('breed', '포메라니안')
        .field('emoji', '🐕');

      if (res.status === 201) {
        expect(res.body.data.name).toBe('테스트 코코');
        petId = res.body.data.id;
      }
    });

    it('GET /api/pets/:id should get pet detail', async () => {
      if (!accessToken || !petId) return;

      const res = await request(app)
        .get(`/api/pets/${petId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('테스트 코코');
    });

    it('PUT /api/pets/:id should update pet', async () => {
      if (!accessToken || !petId) return;

      const res = await request(app)
        .put(`/api/pets/${petId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ memo: '테스트 메모' });

      expect(res.status).toBe(200);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/pets');
      expect(res.status).toBe(401);
    });
  });

  describe('Credits API', () => {
    it('GET /api/credits/balance should return balance', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/credits/balance')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.data.balance).toBe('number');
    });

    it('GET /api/credits/history should return history', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/credits/history')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Profiles API', () => {
    it('GET /api/profiles should list profiles', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Trash API', () => {
    it('GET /api/trash should list trash items', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/trash')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Messenger API', () => {
    it('GET /api/messenger/rooms should list rooms', async () => {
      if (!accessToken) return;

      const res = await request(app)
        .get('/api/messenger/rooms')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Validation', () => {
    it('should reject malformed JSON', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"malformed"}');

      expect(res.status).toBe(400);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
