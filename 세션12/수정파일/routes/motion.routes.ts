import { Router } from 'express';
import { motionController } from '../controllers/motion.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { assignMotionSchema, createMotionSchema } from '../schemas/profile.schema';
import { auditLog } from '../middleware/auditLog';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res, next) => motionController.list(req, res, next));
router.post('/', validate(createMotionSchema), auditLog('motion.create'), (req, res, next) => motionController.create(req, res, next));
router.put('/:id/assign', validate(assignMotionSchema), (req, res, next) => motionController.assign(req, res, next));
router.delete('/:id', auditLog('motion.delete'), (req, res, next) => motionController.remove(req, res, next));

export default router;
