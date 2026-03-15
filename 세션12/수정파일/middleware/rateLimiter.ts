import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV === 'development';

// 개발 모드: rate limit 비활성화 (passthrough middleware)
const noLimit = (_req: Request, _res: Response, next: NextFunction) => next();

export const generalLimiter = isDev ? noLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '요청이 너무 많습니다. 15분 후에 다시 시도해주세요.' },
});

export const authLimiter = isDev ? noLimit : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '로그인 시도가 너무 많습니다. 15분 후에 다시 시도해주세요.' },
});

export const uploadLimiter = isDev ? noLimit : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '업로드 요청이 너무 많습니다. 1시간 후에 다시 시도해주세요.' },
});

export const webhookLimiter = isDev ? noLimit : rateLimit({
  windowMs: 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});
