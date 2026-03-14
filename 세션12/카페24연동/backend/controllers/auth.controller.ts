import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { authService } from '../services/auth.service';
import { AuthRequest } from '../types';
import { env } from '../config/env';

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
      res.status(201).json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
    } catch (error) { next(error); }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken } = req.body;
      let profile: { id: string; email: string; name: string };

      try {
        // 시도 1: Firebase ID Token 검증
        const { auth } = await import('../config/firebase');
        const decoded = await auth.verifyIdToken(idToken);
        profile = {
          id: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.email?.split('@')[0] || 'User',
        };
      } catch {
        try {
          // 시도 2: Google Access Token → UserInfo API
          const { default: axios } = await import('axios');
          const { data: gUser } = await axios.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          if (!gUser.sub || !gUser.email) {
            throw new Error('Invalid Google token');
          }
          profile = {
            id: gUser.sub,
            email: gUser.email,
            name: gUser.name || gUser.email.split('@')[0] || 'User',
          };
        } catch {
          // 시도 3: 개발 환경 fallback
          if (env.isDev) {
            profile = {
              id: idToken.substring(0, 28),
              email: `${idToken.substring(0, 8)}@gmail.com`,
              name: 'Google User',
            };
          } else {
            res.status(401).json({ success: false, error: '유효하지 않은 Google 인증입니다.' });
            return;
          }
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
      const state = crypto.randomBytes(24).toString('hex');
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
      res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
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
