import { Response, NextFunction } from 'express';
import { petService } from '../services/pet.service';
import { storageService } from '../services/storage.service';
import { AuthRequest } from '../types';

export class PetController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pets = await petService.list(req.user!.id);
      res.json({ success: true, data: pets });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pet = await petService.getById(req.user!.id, req.params.id as string);
      res.json({ success: true, data: pet });
    } catch (error) { next(error); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const frontFile = files?.frontPhoto?.[0];
      const sideFile = files?.sidePhoto?.[0];

      let frontPhotoUrl = 'placeholder';
      let sidePhotoUrl = 'placeholder';

      // 이미지 업로드 (실패해도 펫 등록은 진행)
      if (frontFile) {
        try {
          const result = await storageService.upload(
            frontFile.buffer, frontFile.originalname,
            `pets/${req.user!.id}`, frontFile.mimetype
          );
          frontPhotoUrl = result.url || result.key;
        } catch (uploadErr) {
          const { logger } = await import('../utils/logger');
          logger.warn('Front photo upload failed, using placeholder:', (uploadErr as Error).message);
        }
      }
      if (sideFile) {
        try {
          const result = await storageService.upload(
            sideFile.buffer, sideFile.originalname,
            `pets/${req.user!.id}`, sideFile.mimetype
          );
          sidePhotoUrl = result.url || result.key;
        } catch (uploadErr) {
          const { logger } = await import('../utils/logger');
          logger.warn('Side photo upload failed, using placeholder:', (uploadErr as Error).message);
        }
      }

      const pet = await petService.create(req.user!.id, {
        ...req.body,
        frontPhoto: frontPhotoUrl,
        sidePhoto: sidePhotoUrl,
      });
      res.status(201).json({ success: true, data: pet });
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pet = await petService.update(req.user!.id, req.params.id as string, req.body);
      res.json({ success: true, data: pet });
    } catch (error) { next(error); }
  }

  async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await petService.remove(req.user!.id, req.params.id as string);
      res.json({ success: true, message: '펫이 삭제되었습니다.' });
    } catch (error) { next(error); }
  }
}

export const petController = new PetController();
