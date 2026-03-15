import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted: vi.mock보다 먼저 실행 ──────────────
const {
  mockGet, mockSet, mockUpdate, mockWhere, mockLimit,
  mockDoc, mockAdd, mockCollection, mockDocRef,
  mockFieldValue, setupMockChains,
} = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSet = vi.fn();
  const mockUpdate = vi.fn();
  const mockWhere = vi.fn();
  const mockLimit = vi.fn();
  const mockDoc = vi.fn();
  const mockAdd = vi.fn();
  const mockCollection = vi.fn();

  const mockDocRef = {
    id: 'new-user-id',
    set: mockSet,
    update: mockUpdate,
    get: vi.fn(),
  };

  const mockFieldValue = {
    serverTimestamp: vi.fn(() => new Date()),
    increment: vi.fn((n: number) => n),
  };

  function setupMockChains() {
    mockLimit.mockReturnValue({ get: mockGet });
    mockWhere.mockReturnValue({ where: mockWhere, limit: mockLimit });
    mockDoc.mockReturnValue(mockDocRef);
    mockCollection.mockReturnValue({
      where: mockWhere,
      doc: mockDoc,
      add: mockAdd,
    });
  }

  setupMockChains();

  return {
    mockGet, mockSet, mockUpdate, mockWhere, mockLimit,
    mockDoc, mockAdd, mockCollection, mockDocRef,
    mockFieldValue, setupMockChains,
  };
});

vi.mock('../config/firebase', () => ({
  db: { collection: mockCollection },
}));

vi.mock('firebase-admin', () => ({
  default: {
    firestore: { FieldValue: mockFieldValue },
  },
}));

vi.mock('../utils/jwt', () => ({
  generateAccessToken: vi.fn(() => 'mock-access-token'),
  generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(() => ({ userId: 'user-1' })),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async () => 'hashed-password'),
    compare: vi.fn(async () => true),
  },
}));

import { AuthService } from '../services/auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockChains();
    service = new AuthService();
  });

  describe('cafe24Auth — 빈 이메일 처리', () => {
    it('빈 이메일이면 이메일 lookup을 스킵해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const profile = {
        cafe24MemberId: 'member-1',
        email: '',
        name: '테스트',
        hasAcrylicSet: false,
      };

      const result = await service.cafe24Auth(profile);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      const emailCalls = mockWhere.mock.calls.filter(
        (call: unknown[]) => call[0] === 'email' && call[2] === ''
      );
      expect(emailCalls.length).toBe(0);
    });

    it('빈 공백 이메일(" ")도 스킵해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const profile = {
        cafe24MemberId: 'member-2',
        email: '   ',
        name: '테스트',
        hasAcrylicSet: false,
      };

      const result = await service.cafe24Auth(profile);
      expect(result.accessToken).toBe('mock-access-token');
    });
  });

  describe('cafe24Auth — 크레딧 중복 지급 방지', () => {
    it('이미 isVerified인 유저는 크레딧을 중복 지급하지 않아야 한다', async () => {
      const existingDoc = {
        id: 'existing-user',
        data: () => ({
          email: 'test@test.com',
          role: 'USER',
          isVerified: true,
          credits: 120,
        }),
        ref: { update: mockUpdate },
      };
      mockGet.mockResolvedValueOnce({ empty: false, docs: [existingDoc] });

      const profile = {
        cafe24MemberId: 'member-3',
        email: 'test@test.com',
        name: '테스트',
        hasAcrylicSet: true,
      };

      await service.cafe24Auth(profile);

      const incrementCalls = mockFieldValue.increment.mock.calls;
      expect(incrementCalls.length).toBe(0);
    });
  });

  describe('cafe24Auth — 새 유저 + 아크릴 세트', () => {
    it('새 유저 + hasAcrylicSet=true → 120C 지급', async () => {
      // cafe24MemberId 검색 → 없음
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
      // 이메일 검색 → 없음
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const profile = {
        cafe24MemberId: 'new-member',
        email: 'new@test.com',
        name: '신규',
        hasAcrylicSet: true,
      };

      const result = await service.cafe24Auth(profile);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(mockDoc).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalled();
      const setArg = mockSet.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(setArg?.credits).toBe(120);
      expect(setArg?.isVerified).toBe(true);
    });
  });

  describe('googleAuth — 빈 이메일 처리', () => {
    it('빈 이메일이면 이메일 lookup을 스킵해야 한다', async () => {
      mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

      const profile = { id: 'google-123', email: '', name: 'Test' };
      const result = await service.googleAuth(profile);

      expect(result.accessToken).toBe('mock-access-token');
    });
  });
});
