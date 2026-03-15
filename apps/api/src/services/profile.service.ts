import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { creditService, CREDIT_COSTS } from './credit.service';
import { MotionType, MOTION_TYPE_LABELS } from '../types/schema.types';

export class ProfileService {
  async list(userId: string) {
    const profilesSnap = await db.collection('profiles')
      .where('userId', '==', userId)
      .get();

    const profiles = await Promise.all(
      profilesSnap.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch pet info
        const petDoc = await db.collection('pets').doc(data.petId).get();
        const pet = petDoc.exists ? { id: petDoc.id, name: petDoc.data()!.name, emoji: petDoc.data()!.emoji } : null;

        // Fetch base videos (not deleted)
        const baseVideosSnap = await db.collection('baseVideos')
          .where('profileId', '==', doc.id)
          .where('deletedAt', '==', null)
          .get();
        const baseVideos = baseVideosSnap.docs.map(v => ({
          id: v.id,
          gifUrl: v.data().gifUrl,
          isActive: v.data().isActive,
          status: v.data().status,
        }));

        // Fetch motions (not deleted)
        const motionsSnap = await db.collection('motions')
          .where('profileId', '==', doc.id)
          .where('deletedAt', '==', null)
          .get();
        const motions = motionsSnap.docs.map(m => ({
          id: m.id,
          name: m.data().name,
          motionType: m.data().motionType || null,
          gifUrl: m.data().gifUrl,
          thumbnailUrl: m.data().thumbnailUrl || null,
          position: m.data().position,
          status: m.data().status,
        }));

        // 활성 베이스 영상의 gifUrl → 프로필 레벨 gifUrl로 파생
        const activeBaseVideo = baseVideos.find(v => v.isActive && v.status === 'COMPLETED');
        const gifUrl = activeBaseVideo?.gifUrl || null;

        return {
          id: doc.id,
          petId: data.petId,
          userId: data.userId,
          name: data.name,
          type: data.type,
          gifUrl,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          pet,
          baseVideos,
          motions,
        };
      })
    );

    // JS 정렬 (composite index 없이 동작)
    profiles.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });

    return profiles;
  }

  async getById(userId: string, profileId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const data = profileDoc.data()!;

    // Fetch pet
    const petDoc = await db.collection('pets').doc(data.petId).get();
    const pet = petDoc.exists ? { id: petDoc.id, ...petDoc.data() } : null;

    // Fetch base videos (not deleted)
    const baseVideosSnap = await db.collection('baseVideos')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();
    const baseVideos = baseVideosSnap.docs.map(v => {
      const vd = v.data();
      return {
        id: v.id,
        profileId: vd.profileId,
        isActive: vd.isActive,
        status: vd.status,
        videoUrl: vd.videoUrl,
        gifUrl: vd.gifUrl,
        klingJobId: vd.klingJobId,
        deletedAt: vd.deletedAt,
        createdAt: vd.createdAt?.toDate?.() || vd.createdAt,
        updatedAt: vd.updatedAt?.toDate?.() || vd.updatedAt,
      };
    });
    baseVideos.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateA - dateB;
    });

    // Fetch motions (not deleted)
    const motionsSnap = await db.collection('motions')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();
    const motions = motionsSnap.docs.map(m => {
      const md = m.data();
      return {
        id: m.id,
        profileId: md.profileId,
        name: md.name,
        motionType: md.motionType || null,
        gifUrl: md.gifUrl,
        videoUrl: md.videoUrl,
        thumbnailUrl: md.thumbnailUrl || null,
        position: md.position,
        status: md.status,
        deletedAt: md.deletedAt,
        createdAt: md.createdAt?.toDate?.() || md.createdAt,
        updatedAt: md.updatedAt?.toDate?.() || md.updatedAt,
      };
    });
    motions.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateA - dateB;
    });

    // 활성 베이스 영상의 gifUrl → 프로필 레벨 gifUrl로 파생
    const activeBaseVideo = baseVideos.find(v => v.isActive && v.status === 'COMPLETED');
    const gifUrl = activeBaseVideo?.gifUrl || null;

    return {
      id: profileDoc.id,
      petId: data.petId,
      userId: data.userId,
      name: data.name,
      type: data.type,
      gifUrl,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      pet,
      baseVideos,
      motions,
    };
  }

  async create(userId: string, data: { petId: string; name: string; type: 'STANDING' | 'SITTING'; selectedMotionTypes: MotionType[] }) {
    // Verify pet belongs to user
    const petDoc = await db.collection('pets').doc(data.petId).get();
    if (!petDoc.exists || petDoc.data()!.userId !== userId) {
      throw new AppError('펫을 찾을 수 없습니다.', 404);
    }

    // 모션 선택 검증 (정확히 2개)
    if (!data.selectedMotionTypes || data.selectedMotionTypes.length !== 2) {
      throw new AppError('모션 타입을 정확히 2개 선택해야 합니다.', 400);
    }

    // 크레딧 차감: 120C 번들 (베이스영상 1 + 모션 2)
    const totalCost = CREDIT_COSTS.PROFILE_CREATE;
    await creditService.spend(userId, totalCost, '프로필 생성 (베이스영상 1 + 모션 2 번들)', 'PROFILE');

    try {
      const profileRef = db.collection('profiles').doc();
      const profileData = {
        petId: data.petId,
        userId,
        name: data.name,
        type: data.type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await profileRef.set(profileData);

      // Create base video slot (PENDING status)
      const baseVideoRef = db.collection('baseVideos').doc();
      await baseVideoRef.set({
        profileId: profileRef.id,
        isActive: true,
        status: 'PENDING',
        videoUrl: null,
        gifUrl: null,
        klingJobId: null,
        deletedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 번들 모션 2개 자동생성
      for (const motionType of data.selectedMotionTypes) {
        const motionRef = db.collection('motions').doc();
        await motionRef.set({
          profileId: profileRef.id,
          name: MOTION_TYPE_LABELS[motionType],
          motionType,
          gifUrl: null,
          videoUrl: null,
          thumbnailUrl: null,
          position: 'NONE',
          status: 'PENDING',
          deletedAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { id: profileRef.id, ...profileData };
    } catch (error) {
      // 프로필 생성 실패 시 120C 환불
      await creditService.refund(userId, totalCost, '프로필 생성 실패 환불', 'PROFILE');
      throw error;
    }
  }

  async update(userId: string, profileId: string, data: { name?: string }) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.name) updateData.name = data.name;

    await db.collection('profiles').doc(profileId).update(updateData);

    const updated = await db.collection('profiles').doc(profileId).get();
    const uData = updated.data()!;
    return {
      id: updated.id,
      petId: uData.petId,
      userId: uData.userId,
      name: uData.name,
      type: uData.type,
      createdAt: uData.createdAt?.toDate?.() || uData.createdAt,
      updatedAt: uData.updatedAt?.toDate?.() || uData.updatedAt,
    };
  }

  // ---- Base Video ----

  async addBaseVideo(userId: string, profileId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const countSnap = await db.collection('baseVideos')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();
    if (countSnap.size >= 3) throw new AppError('베이스 영상은 최대 3개까지 가능합니다.', 400);

    await creditService.spend(userId, CREDIT_COSTS.BASE_VIDEO_CREATE, '베이스 영상 추가', 'BASE_VIDEO');

    const videoRef = db.collection('baseVideos').doc();
    const videoData = {
      profileId,
      isActive: false,
      status: 'PENDING',
      videoUrl: null,
      gifUrl: null,
      klingJobId: null,
      deletedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await videoRef.set(videoData);

    return { id: videoRef.id, ...videoData };
  }

  async activateBaseVideo(userId: string, profileId: string, videoId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const videoDoc = await db.collection('baseVideos').doc(videoId).get();
    if (!videoDoc.exists || videoDoc.data()!.profileId !== profileId || videoDoc.data()!.deletedAt !== null) {
      throw new AppError('베이스 영상을 찾을 수 없습니다.', 404);
    }

    // Deactivate all videos for this profile, then activate the chosen one
    const batch = db.batch();
    const allVideosSnap = await db.collection('baseVideos')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();

    allVideosSnap.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });
    batch.update(db.collection('baseVideos').doc(videoId), { isActive: true });

    await batch.commit();

    return { success: true };
  }

  async deleteBaseVideo(userId: string, profileId: string, videoId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const activeVideosSnap = await db.collection('baseVideos')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();
    if (activeVideosSnap.size <= 1) throw new AppError('마지막 베이스 영상은 삭제할 수 없습니다.', 400);

    const videoDoc = await db.collection('baseVideos').doc(videoId).get();
    if (!videoDoc.exists || videoDoc.data()!.profileId !== profileId || videoDoc.data()!.deletedAt !== null) {
      throw new AppError('베이스 영상을 찾을 수 없습니다.', 404);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const wasActive = videoDoc.data()!.isActive;

    const batch = db.batch();

    // Soft delete the video
    batch.update(db.collection('baseVideos').doc(videoId), {
      deletedAt: admin.firestore.Timestamp.fromDate(now),
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create trash item
    const trashRef = db.collection('trashItems').doc();
    batch.set(trashRef, {
      userId,
      itemType: 'BASE_VIDEO',
      itemId: videoId,
      refundedCredits: CREDIT_COSTS.DELETE_REFUND,
      deletedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Activate next video if the deleted one was active
    if (wasActive) {
      const nextVideo = activeVideosSnap.docs.find(d => d.id !== videoId);
      if (nextVideo) {
        batch.update(nextVideo.ref, { isActive: true });
      }
    }

    await batch.commit();

    await creditService.refund(userId, CREDIT_COSTS.DELETE_REFUND, '베이스 영상 삭제 환불', 'BASE_VIDEO', videoId);

    return { refundedCredits: CREDIT_COSTS.DELETE_REFUND };
  }

  // ---- Motions ----

  async listMotions(userId: string, profileId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const motionsSnap = await db.collection('motions')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();

    const results = motionsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        profileId: data.profileId,
        name: data.name,
        motionType: data.motionType || null,
        gifUrl: data.gifUrl,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        position: data.position,
        status: data.status,
        deletedAt: data.deletedAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });
    results.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateA - dateB;
    });
    return results;
  }

  async createMotion(userId: string, profileId: string, motionType: MotionType) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const existingMotionsSnap = await db.collection('motions')
      .where('profileId', '==', profileId)
      .where('deletedAt', '==', null)
      .get();
    if (existingMotionsSnap.size >= 12) throw new AppError('모션은 최대 12개까지 가능합니다.', 400);

    // 동일 motionType 중복 검증
    const duplicate = existingMotionsSnap.docs.find(d => d.data().motionType === motionType);
    if (duplicate) {
      throw new AppError(`이미 같은 모션 타입(${MOTION_TYPE_LABELS[motionType]})이 존재합니다.`, 400);
    }

    const name = MOTION_TYPE_LABELS[motionType];
    await creditService.spend(userId, CREDIT_COSTS.MOTION_CREATE, `모션 생성: ${name}`, 'MOTION');

    const motionRef = db.collection('motions').doc();
    const motionData = {
      profileId,
      name,
      motionType,
      gifUrl: null,
      videoUrl: null,
      thumbnailUrl: null,
      position: 'NONE',
      status: 'PENDING',
      deletedAt: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await motionRef.set(motionData);

    return { id: motionRef.id, ...motionData };
  }

  async assignMotion(userId: string, profileId: string, motionId: string, position: 'LEFT' | 'RIGHT' | 'NONE') {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const motionDoc = await db.collection('motions').doc(motionId).get();
    if (!motionDoc.exists || motionDoc.data()!.profileId !== profileId || motionDoc.data()!.deletedAt !== null) {
      throw new AppError('모션을 찾을 수 없습니다.', 404);
    }

    const batch = db.batch();

    // Clear same position from other motions
    if (position !== 'NONE') {
      const samePositionSnap = await db.collection('motions')
        .where('profileId', '==', profileId)
        .where('position', '==', position)
        .where('deletedAt', '==', null)
        .get();

      samePositionSnap.docs.forEach(doc => {
        if (doc.id !== motionId) {
          batch.update(doc.ref, { position: 'NONE' });
        }
      });
    }

    batch.update(db.collection('motions').doc(motionId), {
      position,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const updated = await db.collection('motions').doc(motionId).get();
    const uData = updated.data()!;
    return {
      id: updated.id,
      profileId: uData.profileId,
      name: uData.name,
      motionType: uData.motionType || null,
      gifUrl: uData.gifUrl,
      videoUrl: uData.videoUrl,
      thumbnailUrl: uData.thumbnailUrl || null,
      position: uData.position,
      status: uData.status,
      deletedAt: uData.deletedAt,
      createdAt: uData.createdAt?.toDate?.() || uData.createdAt,
      updatedAt: uData.updatedAt?.toDate?.() || uData.updatedAt,
    };
  }

  async deleteMotion(userId: string, profileId: string, motionId: string) {
    const profileDoc = await db.collection('profiles').doc(profileId).get();
    if (!profileDoc.exists || profileDoc.data()!.userId !== userId) {
      throw new AppError('프로필을 찾을 수 없습니다.', 404);
    }

    const motionDoc = await db.collection('motions').doc(motionId).get();
    if (!motionDoc.exists || motionDoc.data()!.profileId !== profileId || motionDoc.data()!.deletedAt !== null) {
      throw new AppError('모션을 찾을 수 없습니다.', 404);
    }

    const motionData = motionDoc.data()!;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const batch = db.batch();

    batch.update(db.collection('motions').doc(motionId), {
      deletedAt: admin.firestore.Timestamp.fromDate(now),
      position: 'NONE',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const trashRef = db.collection('trashItems').doc();
    batch.set(trashRef, {
      userId,
      itemType: 'MOTION',
      itemId: motionId,
      refundedCredits: CREDIT_COSTS.DELETE_REFUND,
      deletedAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    await creditService.refund(userId, CREDIT_COSTS.DELETE_REFUND, `모션 삭제 환불: ${motionData.name}`, 'MOTION', motionId);

    return { refundedCredits: CREDIT_COSTS.DELETE_REFUND };
  }
}

export const profileService = new ProfileService();
