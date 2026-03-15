import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthRequest } from '../types';
import { logger } from '../utils/logger';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromCookie = req.cookies?.accessToken;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : tokenFromCookie;

    if (!token) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role as 'USER' | 'ADMIN',
    };
    next();
  } catch (error) {
    logger.warn('Auth middleware: Invalid token');
    res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromCookie = req.cookies?.accessToken;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : tokenFromCookie;

    if (token) {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role as 'USER' | 'ADMIN',
      };
    }
  } catch {
    // Token invalid — continue as unauthenticated
  }
  next();
}
