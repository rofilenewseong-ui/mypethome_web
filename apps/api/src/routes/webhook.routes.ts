import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { webhookLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/cafe24/order-complete', webhookLimiter, (req, res, next) => webhookController.cafe24OrderComplete(req, res, next));

export default router;
