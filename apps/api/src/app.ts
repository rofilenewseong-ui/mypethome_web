import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import path from 'path';
import { env } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/auth.routes';
import petRoutes from './routes/pet.routes';
import profileRoutes from './routes/profile.routes';
import baseVideoRoutes from './routes/baseVideo.routes';
import motionRoutes from './routes/motion.routes';
import creditRoutes from './routes/credit.routes';
import trashRoutes from './routes/trash.routes';
import messengerRoutes from './routes/messenger.routes';
import aiRoutes from './routes/ai.routes';
import webhookRoutes from './routes/webhook.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import devRoutes from './routes/dev.routes';

const app = express();

// ─── Security Middleware ─────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', '*.amazonaws.com'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(hpp());

// ─── Body Parsing ────────────────────────────────────────
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(compression());

// ─── Dev Inspector API (rate limit 제외) ─────────────────
if (env.isDev) {
  // 정적 파일에도 CORS 헤더 추가 (프론트엔드에서 이미지/영상 로드)
  app.use('/uploads', cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
  }), express.static(path.resolve(process.cwd(), 'uploads')));
  app.use('/api/dev', devRoutes);
}

// ─── Request Logging (라우트 전에 위치해야 요청 기록됨) ───
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── Rate Limiter (dev API 이후) ─────────────────────────
app.use(generalLimiter);

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '1.0.0',
    },
  });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/profiles/:profileId/base-videos', baseVideoRoutes);
app.use('/api/profiles/:profileId/motions', motionRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/trash', trashRoutes);
app.use('/api/messenger', messengerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// ─── Error Handling ──────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
