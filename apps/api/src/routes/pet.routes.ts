import { Router } from 'express';
import multer from 'multer';
import { petController } from '../controllers/pet.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPetSchema, updatePetSchema } from '../schemas/pet.schema';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

router.use(authenticate);

router.get('/', (req, res, next) => petController.list(req, res, next));
router.get('/:id', (req, res, next) => petController.getById(req, res, next));
router.post('/', uploadLimiter, upload.fields([
  { name: 'frontPhoto', maxCount: 1 },
  { name: 'sidePhoto', maxCount: 1 },
]), (req, res, next) => petController.create(req, res, next));
router.put('/:id', validate(updatePetSchema), (req, res, next) => petController.update(req, res, next));
router.delete('/:id', (req, res, next) => petController.remove(req, res, next));

export default router;
