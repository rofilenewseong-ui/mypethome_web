import { Response, NextFunction } from 'express';
import { creditService } from '../services/credit.service';
import { AuthRequest } from '../types';

export class CreditController {
  async getBalance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const balance = await creditService.getBalance(req.user!.id);
      res.json({ success: true, data: { credits: balance } });
    } catch (error) { next(error); }
  }

  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await creditService.getHistory(req.user!.id, page, limit);
      res.json({ success: true, data: result.transactions, pagination: result.pagination });
    } catch (error) { next(error); }
  }

  async redeemCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await creditService.redeemCode(req.user!.id, req.body.code);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const creditController = new CreditController();
