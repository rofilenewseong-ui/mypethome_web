import { Router } from 'express';
import { messengerController } from '../controllers/messenger.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { getMessagesSchema, sendMessageSchema } from '../schemas/messenger.schema';

const router = Router();

router.use(authenticate);

router.get('/rooms', (req, res, next) => messengerController.getRooms(req, res, next));
router.get('/rooms/:petId/messages', validate(getMessagesSchema), (req, res, next) => messengerController.getMessages(req, res, next));
router.post('/rooms/:petId/messages', validate(sendMessageSchema), (req, res, next) => messengerController.sendMessage(req, res, next));

export default router;
