import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// 스타트 프레임 (Gemini / NanoBanana 2)
router.post('/startframe/generate', (req, res, next) => aiController.generateStartFrame(req, res, next));
router.post('/startframe/regenerate', (req, res, next) => aiController.regenerateStartFrame(req, res, next));
router.post('/startframe/select', (req, res, next) => aiController.selectStartFrame(req, res, next));

// Kling 영상 생성
router.post('/kling/generate', (req, res, next) => aiController.generateKling(req, res, next));

// 작업 상태 조회 (공통)
router.get('/jobs/:id/status', (req, res, next) => aiController.getJobStatus(req, res, next));

export default router;
