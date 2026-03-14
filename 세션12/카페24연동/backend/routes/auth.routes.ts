import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, googleAuthSchema, cafe24AuthSchema } from '../schemas/auth.schema';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), auditLog('user.register'), (req, res, next) => authController.register(req, res, next));
router.post('/login', authLimiter, validate(loginSchema), auditLog('user.login'), (req, res, next) => authController.login(req, res, next));
router.post('/google', authLimiter, validate(googleAuthSchema), auditLog('user.google_auth'), (req, res, next) => authController.googleAuth(req, res, next));
router.get('/cafe24/url', authLimiter, auditLog('user.cafe24_auth_url'), (req, res, next) => authController.cafe24AuthUrl(req, res, next));
router.post('/cafe24', authLimiter, validate(cafe24AuthSchema), auditLog('user.cafe24_auth'), (req, res, next) => authController.cafe24Auth(req, res, next));
router.post('/dev-login', (req, res, next) => authController.devLogin(req, res, next));
router.post('/refresh', authLimiter, (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

export default router;
