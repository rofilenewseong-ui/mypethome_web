import { Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { AuthRequest } from '../types';

export class AiController {
  /**
   * 스타트 프레임 이미지 생성 (Gemini)
   * ref1(얼굴) + ref2(전신) + ref3(옷, 선택)
   */
  async generateStartFrame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.generateStartFrameImages(
        req.user!.id,
        req.body.profileId,
        req.body.imageData
      );
      res.status(202).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /**
   * 스타트 프레임 재생성 (NanoBanana 2)
   * 최초 1회 무료, 이후 10C/회
   */
  async regenerateStartFrame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.regenerateStartFrame(
        req.user!.id, req.body.jobId, req.body.imageData
      );
      res.status(202).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /**
   * 생성된 스타트 프레임 중 하나 선택
   */
  async selectStartFrame(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.selectStartFrameImage(
        req.user!.id, req.body.jobId, req.body.selectedIndex
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /**
   * Kling 베이스 영상 생성 (Image to Video)
   */
  async generateKling(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.generateKlingVideo(
        req.user!.id, req.body.profileId, req.body.baseVideoId, req.body.imageUrl
      );
      res.status(202).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /**
   * 작업 상태 조회 (스타트 프레임 / Kling 영상)
   */
  async getJobStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiService.getJobStatus(req.params.id as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}

export const aiController = new AiController();
