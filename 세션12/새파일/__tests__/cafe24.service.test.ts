import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/env', () => ({
  env: {
    CAFE24_MALL_ID: 'test-mall',
    CAFE24_CLIENT_ID: 'test-client-id',
    CAFE24_CLIENT_SECRET: 'test-client-secret',
    CAFE24_REDIRECT_URI: 'https://test.com/callback',
    ACRYLIC_SET_PRODUCT_IDS: ['101', '102'],
  },
}));

vi.mock('../middleware/errorHandler', () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('axios');

import { cafe24Service } from '../services/cafe24.service';

describe('Cafe24Service — hasAcrylicSetPurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('product_no가 ACRYLIC_SET_PRODUCT_IDS에 포함되면 true', () => {
    const items = [
      { product_no: 101, product_name: '전혀 관련없는 이름', quantity: 1, product_price: '50000', order_id: 'O1', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(true);
  });

  it('product_no가 목록에 없어도 이름에 "아크릴 세트"가 있으면 true', () => {
    const items = [
      { product_no: 999, product_name: '펫홀로 아크릴 세트 A', quantity: 1, product_price: '50000', order_id: 'O2', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(true);
  });

  it('product_no가 목록에 없고 이름도 매칭 안 되면 false', () => {
    const items = [
      { product_no: 999, product_name: '일반 상품', quantity: 1, product_price: '10000', order_id: 'O3', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(false);
  });

  it('"풀 세트" 이름 매칭 테스트', () => {
    const items = [
      { product_no: 888, product_name: '펫홀로 풀 세트', quantity: 1, product_price: '80000', order_id: 'O4', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(true);
  });

  it('"full set" 이름 매칭 테스트', () => {
    const items = [
      { product_no: 777, product_name: 'PetHolo Full Set', quantity: 1, product_price: '80000', order_id: 'O5', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(true);
  });

  it('빈 주문 목록은 false', () => {
    expect(cafe24Service.hasAcrylicSetPurchase([])).toBe(false);
  });

  it('여러 주문 중 하나만 매칭돼도 true', () => {
    const items = [
      { product_no: 500, product_name: '일반 상품', quantity: 1, product_price: '10000', order_id: 'O6', order_date: '2025-01-01' },
      { product_no: 102, product_name: '다른 이름', quantity: 1, product_price: '50000', order_id: 'O7', order_date: '2025-01-01' },
    ];
    expect(cafe24Service.hasAcrylicSetPurchase(items)).toBe(true);
  });
});
