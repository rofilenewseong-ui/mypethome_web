import cron from 'node-cron';
import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { logger } from './logger';

export function initCronJobs(): void {
  // Daily at midnight: permanently delete expired trash items
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = admin.firestore.Timestamp.now();

      const expiredSnap = await db.collection('trashItems')
        .where('expiresAt', '<=', now)
        .get();

      let deletedCount = 0;
      for (const doc of expiredSnap.docs) {
        const item = doc.data();
        try {
          const batch = db.batch();
          if (item.itemType === 'BASE_VIDEO') {
            batch.delete(db.collection('baseVideos').doc(item.itemId));
          } else if (item.itemType === 'MOTION') {
            batch.delete(db.collection('motions').doc(item.itemId));
          }
          batch.delete(doc.ref);
          await batch.commit();
          deletedCount++;
        } catch (error) {
          logger.error(`Cron: Error deleting trash item ${doc.id}`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cron: Permanently deleted ${deletedCount} expired trash items`);
      }
    } catch (error) {
      logger.error('Cron: Error cleaning expired trash items', error);
    }
  });

  // Hourly: clean expired sessions
  cron.schedule('0 * * * *', async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      const expiredSnap = await db.collection('sessions')
        .where('expiresAt', '<=', now)
        .get();

      let deletedCount = 0;
      const batch = db.batch();
      expiredSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        logger.info(`Cron: Cleaned ${deletedCount} expired sessions`);
      }
    } catch (error) {
      logger.error('Cron: Error cleaning expired sessions', error);
    }
  });

  // Every 30 minutes past the hour: expire NanoBanana jobs
  cron.schedule('30 * * * *', async () => {
    try {
      const now = admin.firestore.Timestamp.now();

      // Get expired PENDING jobs
      const pendingSnap = await db.collection('nanoBananaJobs')
        .where('expiresAt', '<=', now)
        .where('status', '==', 'PENDING')
        .get();

      // Get expired PROCESSING jobs
      const processingSnap = await db.collection('nanoBananaJobs')
        .where('expiresAt', '<=', now)
        .where('status', '==', 'PROCESSING')
        .get();

      const allDocs = [...pendingSnap.docs, ...processingSnap.docs];
      let updatedCount = 0;

      if (allDocs.length > 0) {
        const batch = db.batch();
        allDocs.forEach(doc => {
          batch.update(doc.ref, {
            status: 'FAILED',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          updatedCount++;
        });
        await batch.commit();
      }

      if (updatedCount > 0) {
        logger.info(`Cron: Expired ${updatedCount} NanoBanana jobs`);
      }
    } catch (error) {
      logger.error('Cron: Error expiring NanoBanana jobs', error);
    }
  });

  logger.info('Cron jobs initialized');
}
