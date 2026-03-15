import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register(email, password, name);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.status(201).json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      // Google ID Token 검증 (firebase-admin 사용)
      let profile: { id: string; email: string; name: string };
      try {
        const { auth } = await import('../config/firebase');
        const decoded = await auth.verifyIdToken(idToken);
        profile = {
          id: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
        };
      } catch {
        // Firebase Auth를 사용할 수 없는 경우 — 개발+Mock 모드에서만 fallback
        if (env.isDev && env.USE_MOCK_AI) {
          profile = {
            id: idToken.substring(0, 28),
            email: `${idToken.substring(0, 8)}@gmail.com`,
            name: 'Google User',
          };
        } else {
          throw new AppError('Google 인증에 실패했습니다.', 401);
        }
      }
      const result = await authService.googleAuth(profile);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async cafe24AuthUrl(_req: Request, res: Response, next: NextFunction) {
    try {
      const { cafe24Service } = await import('../services/cafe24.service');
      if (!cafe24Service.isConfigured()) {
        res.status(503).json({ success: false, error: 'Cafe24 OAuth가 설정되지 않았습니다.' });
        return;
      }
      const state = Math.random().toString(36).substring(2, 15);
      const url = cafe24Service.getAuthorizationUrl(state);
      res.json({ success: true, data: { url, state } });
    } catch (error) { next(error); }
  }

  async cafe24Auth(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const { cafe24Service } = await import('../services/cafe24.service');
      if (!cafe24Service.isConfigured()) {
        res.status(503).json({ success: false, error: 'Cafe24 OAuth가 설정되지 않았습니다.' });
        return;
      }
      const profile = await cafe24Service.authenticateCustomer(code);
      const result = await authService.cafe24Auth(profile);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async devLogin(_req: Request, res: Response, next: NextFunction) {
    try {
      if (env.isProd) {
        res.status(404).json({ success: false, error: '경로를 찾을 수 없습니다.' });
        return;
      }
      const result = await authService.devLogin();
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ success: false, error: '리프레시 토큰이 없습니다.' });
        return;
      }
      const result = await authService.refreshTokens(refreshToken);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async logout(_req: Request, res: Response) {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    res.json({ success: true, message: '로그아웃 되었습니다.' });
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();
