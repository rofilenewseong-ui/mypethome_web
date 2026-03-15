import { Router } from 'express';
import { creditController } from '../controllers/credit.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { redeemCodeSchema } from '../schemas/credit.schema';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(authenticate);

router.get('/balance', (req, res, next) => creditController.getBalance(req, res, next));
router.get('/history', (req, res, next) => creditController.getHistory(req, res, next));
router.post('/redeem', validate(redeemCodeSchema), auditLog('credit.redeem'), (req, res, next) => creditController.redeemCode(req, res, next));

export default router;
