import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProfileSchema, updateProfileSchema } from '../schemas/profile.schema';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => profileController.list(req, res, next));
router.get('/:id', (req, res, next) => profileController.getById(req, res, next));
router.post('/', validate(createProfileSchema), (req, res, next) => profileController.create(req, res, next));
router.put('/:id', validate(updateProfileSchema), (req, res, next) => profileController.update(req, res, next));

export default router;
