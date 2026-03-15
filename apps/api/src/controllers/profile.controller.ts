import { Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { AuthRequest } from '../types';

export class ProfileController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profiles = await profileService.list(req.user!.id);
      res.json({ success: true, data: profiles });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await profileService.getById(req.user!.id, req.params.id as string);
      res.json({ success: true, data: profile });
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await profileService.create(req.user!.id, req.body);
      res.status(201).json({ success: true, data: profile });
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await profileService.update(req.user!.id, req.params.id as string, req.body);
      res.json({ success: true, data: profile });
    } catch (error) { next(error); }
  }
}

export const profileController = new ProfileController();
