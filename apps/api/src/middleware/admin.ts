import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, error: '관리자 권한이 필요합니다.' });
    return;
  }
  next();
}

