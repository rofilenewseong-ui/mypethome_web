import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// ── Mocks ──────────────────────────────────────────
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDocFn = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

mockLimit.mockReturnValue({ get: mockGet });
mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });

const mockDocRef = { id: 'code-doc-id', set: mockSet };
mockDocFn.mockReturnValue(mockDocRef);

vi.mock('../config/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      where: mockWhere,
      doc: mockDocFn,
    })),
  },
}));

vi.mock('firebase-admin', () => ({
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: vi.fn(() => new Date()),
      },
    },
  },
}));

vi.mock('../config/env', () => ({
  env: {
    CAFE24_WEBHOOK_SECRET: 'test-webhook-secret',
    CAFE24_PRODUCT_MAP: {
      '100': 'FULL_SET',
      '200': 'CREDIT_120',
      '300': 'CREDIT_40',
    },
  },
}));

vi.mock('../utils/codeGenerator', () => ({
  generateProductCode: vi.fn(() => 'TESTCODE1234'),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { WebhookService } from '../services/webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookService();
  });

  describe('verifySignature', () => {
    it('정상 HMAC 서명을 통과해야 한다', () => {
      const payload = '{"orderId":"123"}';
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('hex');

      expect(service.verifySignature(payload, signature)).toBe(true);
    });

    it('불일치 서명은 false를 반환해야 한다', () => {
      const payload = '{"orderId":"123"}';
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('hex');

      expect(service.verifySignature(payload, wrongSignature)).toBe(false);
    });

    it('길이가 다른 서명은 false를 반환해야 한다', () => {
      const payload = '{"orderId":"123"}';
      expect(service.verifySignature(payload, 'short')).toBe(false);
    });

    it('빈 서명은 false를 반환해야 한다', () => {
      const payload = '{"orderId":"123"}';
      expect(service.verifySignature(payload, '')).toBe(false);
    });
  });

  describe('handleCafe24Order', () => {
    it('중복 주문을 감지해야 한다', async () => {
      const existingCode = {
        id: 'existing-id',
        data: () => ({ code: 'EXISTING1234', productType: 'FULL_SET' }),
      };
      mockGet.mockResolvedValueOnce({ empty: false, docs: [existingCode] });

      const result = await service.handleCafe24Order({
        orderId: 'order-1',
        productId: '100',
        productName: '풀 세트',
      });

      expect(result.duplicate).toBe(true);
      expect(result.code).toBe('EXISTING1234');
    });

    it('상품 ID 매핑으로 FULL_SET을 판별해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await service.handleCafe24Order({
        orderId: 'order-2',
        productId: '100',
        productName: '테스트 상품',
      });

      expect(result.productType).toBe('FULL_SET');
      expect(result.code).toBe('TESTCODE1234');
    });

    it('상품 ID 매핑으로 CREDIT_120을 판별해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await service.handleCafe24Order({
        orderId: 'order-3',
        productId: '200',
        productName: '테스트',
      });

      expect(result.productType).toBe('CREDIT_120');
    });

    it('매핑에 없는 상품은 이름 fallback으로 판별해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const result = await service.handleCafe24Order({
        orderId: 'order-4',
        productId: '999',
        productName: '크레딧 40개 패키지',
      });

      expect(result.productType).toBe('CREDIT_40');
    });

    it('알 수 없는 상품은 에러를 throw해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      await expect(
        service.handleCafe24Order({
          orderId: 'order-5',
          productId: '999',
          productName: '알 수 없는 상품명',
        })
      ).rejects.toThrow('알 수 없는 상품입니다.');
    });
  });
});
