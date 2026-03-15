import { Response, NextFunction } from 'express';
import { trashService } from '../services/trash.service';
import { AuthRequest } from '../types';

export class TrashController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const items = await trashService.list(req.user!.id);
      res.json({ success: true, data: items });
    } catch (error) { next(error); }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await trashService.restore(req.user!.id, req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async permanentDelete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await trashService.permanentDelete(req.user!.id, req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const trashController = new TrashController();
