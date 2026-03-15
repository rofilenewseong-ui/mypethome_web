import { Router } from 'express';
import { baseVideoController } from '../controllers/baseVideo.controller';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get('/', (req, res, next) => baseVideoController.list(req, res, next));
router.post('/', auditLog('baseVideo.add'), (req, res, next) => baseVideoController.add(req, res, next));
router.put('/:id/activate', (req, res, next) => baseVideoController.activate(req, res, next));
router.delete('/:id', auditLog('baseVideo.delete'), (req, res, next) => baseVideoController.remove(req, res, next));

export default router;
