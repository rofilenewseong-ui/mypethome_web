import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  async trackEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { event, properties, page, sessionId, deviceInfo } = req.body;
      await analyticsService.trackEvent(
        req.user!.id,
        event,
        properties || {},
        { sessionId, page, deviceInfo }
      );
      res.json({ success: true });
    } catch (error) { next(error); }
  }

  async trackBatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { events } = req.body;
      await analyticsService.trackBatch(req.user!.id, events);
      res.json({ success: true, data: { count: events.length } });
    } catch (error) { next(error); }
  }

  async startPlayback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { profileId, petId, deviceInfo } = req.body;
      const sessionId = await analyticsService.startPlayback(
        req.user!.id, profileId, petId || '', deviceInfo
      );
      res.json({ success: true, data: { sessionId } });
    } catch (error) { next(error); }
  }

  async endPlayback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { duration, motionTaps, motionLocks, motionDetails } = req.body;
      await analyticsService.endPlayback(sessionId as string, {
        duration, motionTaps, motionLocks, motionDetails: motionDetails || [],
      });
      res.json({ success: true });
    } catch (error) { next(error); }
  }

  // ─── Admin endpoints ─────────────────────────────
  async getDashboard(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDashboardData();
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getAnalyticsEvents({
        event: req.query.event as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getPlaybackStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPlaybackStats({
        userId: req.query.userId as string,
        profileId: req.query.profileId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getUserAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getUserAnalytics(req.params.id as string);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getMessengerAnalytics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getMessengerAnalytics();
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getPetAnalytics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getPetAnalytics();
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const analyticsController = new AnalyticsController();
