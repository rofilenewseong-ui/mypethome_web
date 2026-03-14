import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';

export class WebhookController {
  async cafe24OrderComplete(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-cafe24-signature'] as string || '';
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      const payload = rawBody ? rawBody.toString('utf8') : JSON.stringify(req.body);

      if (!webhookService.verifySignature(payload, signature)) {
        logger.warn('Webhook: Invalid Cafe24 signature');
        res.status(403).json({ success: false, error: 'Invalid signature' });
        return;
      }

      const result = await webhookService.handleCafe24Order(req.body);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const webhookController = new WebhookController();
