import { Router } from 'express';
import { trashController } from '../controllers/trash.controller';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(authenticate);

router.get('/', (req, res, next) => trashController.list(req, res, next));
router.post('/:id/restore', auditLog('trash.restore'), (req, res, next) => trashController.restore(req, res, next));
router.delete('/:id', auditLog('trash.permanentDelete'), (req, res, next) => trashController.permanentDelete(req, res, next));

export default router;
