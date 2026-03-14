import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { webhookLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { cafe24OrderSchema } from '../schemas/webhook.schema';

const router = Router();

router.post('/cafe24/order-complete', webhookLimiter, validate(cafe24OrderSchema), (req, res, next) => webhookController.cafe24OrderComplete(req, res, next));

export default router;
