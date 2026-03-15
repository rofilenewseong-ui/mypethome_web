import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = 'isOperational' in err && err.isOperational
    ? err.message
    : '서버 내부 오류가 발생했습니다.';

  logger.error(`${statusCode} - ${err.message}`, { stack: err.stack });

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(env.isDev && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
  });
}
