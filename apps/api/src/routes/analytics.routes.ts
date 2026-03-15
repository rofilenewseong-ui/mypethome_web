import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { validate } from '../middleware/validate';
import {
  trackEventSchema,
  trackBatchSchema,
  startPlaybackSchema,
  endPlaybackSchema,
} from '../schemas/analytics.schema';

const router = Router();

// ─── Public (authenticated user) endpoints ──────
router.post(
  '/events',
  authenticate,
  validate(trackEventSchema),
  (req, res, next) => analyticsController.trackEvent(req, res, next)
);

router.post(
  '/events/batch',
  authenticate,
  validate(trackBatchSchema),
  (req, res, next) => analyticsController.trackBatch(req, res, next)
);

router.post(
  '/playback/start',
  authenticate,
  validate(startPlaybackSchema),
  (req, res, next) => analyticsController.startPlayback(req, res, next)
);

router.put(
  '/playback/:sessionId/end',
  authenticate,
  validate(endPlaybackSchema),
  (req, res, next) => analyticsController.endPlayback(req, res, next)
);

// ─── Admin-only endpoints ───────────────────────
router.get(
  '/dashboard',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getDashboard(req, res, next)
);

router.get(
  '/events',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getEvents(req, res, next)
);

router.get(
  '/playback',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getPlaybackStats(req, res, next)
);

router.get(
  '/users/:id',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getUserAnalytics(req, res, next)
);

router.get(
  '/messenger',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getMessengerAnalytics(req, res, next)
);

router.get(
  '/pets',
  authenticate, requireAdmin,
  (req, res, next) => analyticsController.getPetAnalytics(req, res, next)
);

export default router;
