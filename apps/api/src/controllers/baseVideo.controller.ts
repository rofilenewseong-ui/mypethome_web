import { Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';
import { AuthRequest } from '../types';

export class BaseVideoController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const profile = await profileService.getById(req.user!.id, req.params.profileId as string);
      res.json({ success: true, data: profile.baseVideos });
    } catch (error) { next(error); }
  }

  async add(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const video = await profileService.addBaseVideo(req.user!.id, req.params.profileId as string);
      res.status(201).json({ success: true, data: video });
    } catch (error) { next(error); }
  }

  async activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await profileService.activateBaseVideo(
        req.user!.id, req.params.profileId as string, req.params.id as string
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await profileService.deleteBaseVideo(
        req.user!.id, req.params.profileId as string, req.params.id as string
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const baseVideoController = new BaseVideoController();
