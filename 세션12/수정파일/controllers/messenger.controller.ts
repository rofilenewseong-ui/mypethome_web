import { Response, NextFunction } from 'express';
import { messengerService } from '../services/messenger.service';
import { AuthRequest } from '../types';

export class MessengerController {
  async getRooms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rooms = await messengerService.getRooms(req.user!.id);
      res.json({ success: true, data: rooms });
    } catch (error) { next(error); }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Math.min(1000, parseInt(req.query.page as string) || 1));
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
      const result = await messengerService.getMessages(req.user!.id, req.params.petId as string, page, limit);
      res.json({ success: true, data: result.messages, pagination: result.pagination });
    } catch (error) { next(error); }
  }

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await messengerService.sendMessage(req.user!.id, req.params.petId as string, req.body.content);
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const messengerController = new MessengerController();
