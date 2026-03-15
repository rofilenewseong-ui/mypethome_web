import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { creditService, CREDIT_COSTS } from './credit.service';

export class TrashService {
  async list(userId: string) {
    const itemsSnap = await db.collection('trashItems')
      .where('userId', '==', userId)
      .get();

    const enriched = await Promise.all(
      itemsSnap.docs.map(async (doc) => {
        const data = doc.data();
        let details: unknown = null;

        if (data.itemType === 'BASE_VIDEO') {
          const videoDoc = await db.collection('baseVideos').doc(data.itemId).get();
          if (videoDoc.exists) {
            const vd = videoDoc.data()!;
            details = { id: videoDoc.id, gifUrl: vd.gifUrl, videoUrl: vd.videoUrl, profileId: vd.profileId };
          }
        } else if (data.itemType === 'MOTION') {
          const motionDoc = await db.collection('motions').doc(data.itemId).get();
          if (motionDoc.exists) {
            const md = motionDoc.data()!;
            details = { id: motionDoc.id, name: md.name, gifUrl: md.gifUrl, profileId: md.profileId };
          }
        }

        const expiresAt = data.expiresAt?.toDate?.() || data.expiresAt;
        const deletedAt = data.deletedAt?.toDate?.() || data.deletedAt;
        const now = new Date();
        const msLeft = new Date(expiresAt).getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));

        let severity: 'safe' | 'warning' | 'danger';
        if (daysLeft >= 15) severity = 'safe';
        else if (daysLeft >= 7) severity = 'warning';
        else severity = 'danger';

        return {
          id: doc.id,
          userId: data.userId,
          itemType: data.itemType,
          itemId: data.itemId,
          refundedCredits: data.refundedCredits,
          deletedAt,
          expiresAt,
          details,
          daysLeft,
          severity,
        };
      })
    );

    // JS 정렬 (composite index 없이 동작)
    enriched.sort((a, b) => {
      const dateA = a.deletedAt instanceof Date ? a.deletedAt.getTime() : 0;
      const dateB = b.deletedAt instanceof Date ? b.deletedAt.getTime() : 0;
      return dateB - dateA;
    });

    return enriched;
  }

  async restore(userId: string, trashItemId: string) {
    const trashDoc = await db.collection('trashItems').doc(trashItemId).get();
    if (!trashDoc.exists || trashDoc.data()!.userId !== userId) {
      throw new AppError('휴지통 항목을 찾을 수 없습니다.', 404);
    }

    const trashItem = trashDoc.data()!;

    // Deduct restore cost
    await creditService.spend(
      userId,
      CREDIT_COSTS.RESTORE_COST,
      `복구: ${trashItem.itemType}`,
      trashItem.itemType,
      trashItem.itemId
    );

    if (trashItem.itemType === 'BASE_VIDEO') {
      const videoDoc = await db.collection('baseVideos').doc(trashItem.itemId).get();
      if (!videoDoc.exists) throw new AppError('원본 데이터를 찾을 수 없습니다.', 404);

      const videoData = videoDoc.data()!;
      const activeCountSnap = await db.collection('baseVideos')
        .where('profileId', '==', videoData.profileId)
        .where('deletedAt', '==', null)
        .get();
      if (activeCountSnap.size >= 3) {
        throw new AppError('베이스 영상은 최대 3개까지 가능합니다. 기존 영상을 삭제 후 복구해주세요.', 400);
      }

      const batch = db.batch();
      batch.update(videoDoc.ref, { deletedAt: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      batch.delete(trashDoc.ref);
      await batch.commit();

    } else if (trashItem.itemType === 'MOTION') {
      const motionDoc = await db.collection('motions').doc(trashItem.itemId).get();
      if (!motionDoc.exists) throw new AppError('원본 데이터를 찾을 수 없습니다.', 404);

      const motionData = motionDoc.data()!;
      const activeCountSnap = await db.collection('motions')
        .where('profileId', '==', motionData.profileId)
        .where('deletedAt', '==', null)
        .get();
      if (activeCountSnap.size >= 12) {
        throw new AppError('모션은 최대 12개까지 가능합니다.', 400);
      }

      const batch = db.batch();
      batch.update(motionDoc.ref, { deletedAt: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      batch.delete(trashDoc.ref);
      await batch.commit();
    }

    return { success: true, cost: CREDIT_COSTS.RESTORE_COST };
  }

  async permanentDelete(userId: string, trashItemId: string) {
    const trashDoc = await db.collection('trashItems').doc(trashItemId).get();
    if (!trashDoc.exists || trashDoc.data()!.userId !== userId) {
      throw new AppError('휴지통 항목을 찾을 수 없습니다.', 404);
    }

    const trashItem = trashDoc.data()!;
    const batch = db.batch();

    if (trashItem.itemType === 'BASE_VIDEO') {
      batch.delete(db.collection('baseVideos').doc(trashItem.itemId));
    } else if (trashItem.itemType === 'MOTION') {
      batch.delete(db.collection('motions').doc(trashItem.itemId));
    }
    batch.delete(trashDoc.ref);

    await batch.commit();

    return { success: true };
  }
}

export const trashService = new TrashService();
