import { Response, NextFunction } from 'express';
import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AuthRequest } from '../types';
import { analyticsService } from '../services/analytics.service';

export class AdminController {
  async dashboard(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalUsersSnap,
        todaySignupsSnap,
        totalVideosSnap,
        totalMotionsSnap,
      ] = await Promise.all([
        db.collection('users').count().get(),
        db.collection('users')
          .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(todayStart))
          .count().get(),
        db.collection('baseVideos')
          .where('deletedAt', '==', null)
          .count().get(),
        db.collection('motions')
          .where('deletedAt', '==', null)
          .count().get(),
      ]);

      // Also fetch analytics dashboard data
      let analyticsData = null;
      try {
        analyticsData = await analyticsService.getDashboardData();
      } catch { /* analytics not yet populated */ }

      res.json({
        success: true,
        data: {
          totalUsers: totalUsersSnap.data().count,
          todaySignups: todaySignupsSnap.data().count,
          totalVideos: totalVideosSnap.data().count,
          totalMotions: totalMotionsSnap.data().count,
          analytics: analyticsData,
        },
      });
    } catch (error) { next(error); }
  }

  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      const query: FirebaseFirestore.Query = db.collection('users')
        .orderBy('createdAt', 'desc');

      const allUsersSnap = await query.get();

      // Apply search filter in memory (Firestore doesn't support case-insensitive contains)
      let filteredDocs = allUsersSnap.docs;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredDocs = filteredDocs.filter(doc => {
          const data = doc.data();
          return (
            (data.name && data.name.toLowerCase().includes(searchLower)) ||
            (data.email && data.email.toLowerCase().includes(searchLower))
          );
        });
      }

      const total = filteredDocs.length;
      const paginatedDocs = filteredDocs.slice(skip, skip + limit);

      const users = await Promise.all(
        paginatedDocs.map(async (doc) => {
          const data = doc.data();

          // Count pets and profiles
          const [petsSnap, profilesSnap] = await Promise.all([
            db.collection('pets').where('userId', '==', doc.id).count().get(),
            db.collection('profiles').where('userId', '==', doc.id).count().get(),
          ]);

          return {
            id: doc.id,
            email: data.email,
            name: data.name,
            role: data.role,
            credits: data.credits,
            isVerified: data.isVerified,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            _count: {
              pets: petsSnap.data().count,
              profiles: profilesSnap.data().count,
            },
          };
        })
      );

      res.json({
        success: true,
        data: users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) { next(error); }
  }

  async getUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        return;
      }

      const userData = userDoc.data()!;

      // Fetch related data
      const [petsSnap, profilesSnap, txSnap] = await Promise.all([
        db.collection('pets').where('userId', '==', userId).get(),
        db.collection('profiles').where('userId', '==', userId).get(),
        db.collection('creditTransactions')
          .where('userId', '==', userId)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .get(),
      ]);

      const pets = petsSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        emoji: d.data().emoji,
      }));

      const profiles = profilesSnap.docs.map(d => ({
        id: d.id,
        name: d.data().name,
        type: d.data().type,
      }));

      const creditTransactions = txSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt,
      }));

      res.json({
        success: true,
        data: {
          id: userDoc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          credits: userData.credits,
          isVerified: userData.isVerified,
          createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
          updatedAt: userData.updatedAt?.toDate?.() || userData.updatedAt,
          pets,
          profiles,
          creditTransactions,
        },
      });
    } catch (error) { next(error); }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { credits, role } = req.body;
      const userId = req.params.id as string;

      const updateData: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (credits !== undefined) updateData.credits = credits;
      if (role) updateData.role = role;

      await db.collection('users').doc(userId).update(updateData);

      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data()!;

      res.json({
        success: true,
        data: {
          id: userDoc.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          credits: userData.credits,
        },
      });
    } catch (error) { next(error); }
  }

  async getLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [totalSnap, logsSnap] = await Promise.all([
        db.collection('auditLogs').count().get(),
        db.collection('auditLogs')
          .orderBy('createdAt', 'desc')
          .offset(skip)
          .limit(limit)
          .get(),
      ]);

      const total = totalSnap.data().count;

      const logs = await Promise.all(
        logsSnap.docs.map(async (doc) => {
          const data = doc.data();
          let user = null;

          if (data.userId) {
            const userDoc = await db.collection('users').doc(data.userId).get();
            if (userDoc.exists) {
              const ud = userDoc.data()!;
              user = { id: userDoc.id, email: ud.email, name: ud.name };
            }
          }

          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            user,
          };
        })
      );

      res.json({
        success: true,
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) { next(error); }
  }
}

export const adminController = new AdminController();
