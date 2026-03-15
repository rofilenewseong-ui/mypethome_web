import { Router } from 'express';
import { messengerController } from '../controllers/messenger.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/rooms', (req, res, next) => messengerController.getRooms(req, res, next));
router.get('/rooms/:petId/messages', (req, res, next) => messengerController.getMessages(req, res, next));
router.post('/rooms/:petId/messages', (req, res, next) => messengerController.sendMessage(req, res, next));

export default router;
