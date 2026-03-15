import { Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { AuthRequest } from '../types';

export class MotionController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const motions = await profileService.listMotions(req.user!.id, req.params.profileId as string);
      res.json({ success: true, data: motions });
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const motion = await profileService.createMotion(
        req.user!.id, req.params.profileId as string, req.body.motionType
      );
      res.status(201).json({ success: true, data: motion });
    } catch (error) { next(error); }
  }

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const motion = await profileService.assignMotion(
        req.user!.id, req.params.profileId as string, req.params.id as string, req.body.position
      );
      res.json({ success: true, data: motion });
    } catch (error) { next(error); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await profileService.deleteMotion(
        req.user!.id, req.params.profileId as string, req.params.id as string
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const motionController = new MotionController();
