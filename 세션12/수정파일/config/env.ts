import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),

  // Firebase
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',

  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',

  STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET || 'petholo-uploads',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  NANOBANANA_API_URL: process.env.NANOBANANA_API_URL || '',
  NANOBANANA_API_KEY: process.env.NANOBANANA_API_KEY || '',
  KLING_API_URL: process.env.KLING_API_URL || '',
  KLING_API_KEY: process.env.KLING_API_KEY || '',

  CAFE24_WEBHOOK_SECRET: process.env.CAFE24_WEBHOOK_SECRET || '',
  CAFE24_CLIENT_ID: process.env.CAFE24_CLIENT_ID || '',
  CAFE24_CLIENT_SECRET: process.env.CAFE24_CLIENT_SECRET || '',
  CAFE24_MALL_ID: process.env.CAFE24_MALL_ID || '',
  CAFE24_REDIRECT_URI: process.env.CAFE24_REDIRECT_URI || '',

  // 상품 ID 기반 판별
  ACRYLIC_SET_PRODUCT_IDS: (process.env.ACRYLIC_SET_PRODUCT_IDS || '').split(',').filter(Boolean),
  CAFE24_PRODUCT_MAP: parseCafe24ProductMap(process.env.CAFE24_PRODUCT_MAP || ''),

  // AI Mock 모드 (true: API 키 없이 프로필 생성 플로우 테스트)
  USE_MOCK_AI: process.env.USE_MOCK_AI === 'true',

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

/** CAFE24_PRODUCT_MAP 파싱: "productId1:FULL_SET,productId2:CREDIT_120" → Map */
function parseCafe24ProductMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!raw) return map;
  for (const entry of raw.split(',')) {
    const [id, type] = entry.split(':');
    if (id && type) map[id.trim()] = type.trim();
  }
  return map;
}

// ── 프로덕션 환경변수 필수 검증 ──────────────────────────
if (env.isProd) {
  const required: Array<[string, string]> = [
    ['FIREBASE_PROJECT_ID', env.FIREBASE_PROJECT_ID],
    ['FIREBASE_PRIVATE_KEY', env.FIREBASE_PRIVATE_KEY],
    ['FIREBASE_CLIENT_EMAIL', env.FIREBASE_CLIENT_EMAIL],
    ['JWT_SECRET', env.JWT_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
    ['CAFE24_CLIENT_ID', env.CAFE24_CLIENT_ID],
    ['CAFE24_CLIENT_SECRET', env.CAFE24_CLIENT_SECRET],
    ['CAFE24_MALL_ID', env.CAFE24_MALL_ID],
    ['CAFE24_WEBHOOK_SECRET', env.CAFE24_WEBHOOK_SECRET],
  ];
  const missing = required.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(`[FATAL] 프로덕션 필수 환경변수 누락: ${missing.join(', ')}`);
  }

  // CORS 프로덕션 검증: localhost 금지
  if (env.CORS_ORIGIN.includes('localhost') || env.CORS_ORIGIN.includes('127.0.0.1')) {
    throw new Error('[FATAL] 프로덕션에서 CORS_ORIGIN에 localhost를 사용할 수 없습니다.');
  }
}
