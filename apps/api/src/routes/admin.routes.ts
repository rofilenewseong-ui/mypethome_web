import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', (req, res, next) => adminController.dashboard(req, res, next));
router.get('/users', (req, res, next) => adminController.listUsers(req, res, next));
router.get('/users/:id', (req, res, next) => adminController.getUser(req, res, next));
router.put('/users/:id', auditLog('admin.updateUser'), (req, res, next) => adminController.updateUser(req, res, next));
router.get('/logs', (req, res, next) => adminController.getLogs(req, res, next));

export default router;
