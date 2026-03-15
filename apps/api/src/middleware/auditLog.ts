import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';

export function auditLog(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Skip audit logging for analytics endpoints to prevent infinite loops
    if (req.originalUrl.startsWith('/api/analytics')) {
      next();
      return;
    }

    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300) {
        db.collection('auditLogs').add({
          userId: req.user?.id || null,
          action,
          details: JSON.stringify({
            method: req.method,
            path: req.originalUrl,
            statusCode,
          }),
          ipAddress: req.ip || req.socket.remoteAddress || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch((error) => {
          logger.error('Failed to create audit log', error);
        });
      }
      return originalJson(body);
    };

    next();
  };
}
