import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';
import { batchInQuery, groupBy } from '../utils/firestore-helpers';
import { sanitizeText } from '../utils/sanitize';

export class PetService {
  async list(userId: string) {
    // 1) 펫 전체 조회 (Firestore orderBy 사용 — 인덱스 활용)
    const petsSnap = await db.collection('pets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    if (petsSnap.empty) return [];

    const petIds = petsSnap.docs.map(d => d.id);

    // 2) profiles + chatRooms 한번에 batch 조회
    const [profileDocs, chatRoomDocs] = await Promise.all([
      batchInQuery('profiles', 'petId', petIds),
      batchInQuery('chatRooms', 'petId', petIds, [
        { field: 'userId', op: '==', value: userId },
      ]),
    ]);

    // 3) Map으로 조립
    const profilesByPetId = groupBy(profileDocs, d => d.data().petId);
    const chatRoomByPetId = new Map(
      chatRoomDocs.map(d => [d.data().petId, d])
    );

    return petsSnap.docs.map(doc => {
      const data = doc.data();

      const profiles = (profilesByPetId.get(doc.id) || []).map(p => ({
        id: p.id,
        name: p.data().name,
        type: p.data().type,
      }));

      const chatRoomDoc = chatRoomByPetId.get(doc.id);
      const chatRoom = chatRoomDoc ? {
        id: chatRoomDoc.id,
        lastMessageAt: chatRoomDoc.data().lastMessageAt?.toDate?.() || chatRoomDoc.data().lastMessageAt,
      } : null;

      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        species: data.species || null,
        breed: data.breed || null,
        gender: data.gender || null,
        frontPhoto: data.frontPhoto,
        sidePhoto: data.sidePhoto,
        favoriteSnack: data.favoriteSnack,
        walkingPlace: data.walkingPlace,
        memo: data.memo || null,
        personality: data.personality || null,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
        birthday: data.birthday?.toDate?.() || data.birthday,
        memorialDay: data.memorialDay?.toDate?.() || data.memorialDay,
        profiles,
        chatRoom,
      };
    });
  }

  async getById(userId: string, petId: string) {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()!.userId !== userId) {
      throw new AppError('펫을 찾을 수 없습니다.', 404);
    }

    const petData = petDoc.data()!;

    // 1) profiles 조회
    const profilesSnap = await db.collection('profiles')
      .where('petId', '==', petId)
      .get();

    const profileIds = profilesSnap.docs.map(d => d.id);

    // 2) baseVideos + motions 병렬 batch 조회
    const [baseVideoDocs, motionDocs] = await Promise.all([
      profileIds.length > 0
        ? batchInQuery('baseVideos', 'profileId', profileIds, [
            { field: 'deletedAt', op: '==', value: null },
          ])
        : Promise.resolve([]),
      profileIds.length > 0
        ? batchInQuery('motions', 'profileId', profileIds, [
            { field: 'deletedAt', op: '==', value: null },
          ])
        : Promise.resolve([]),
    ]);

    // 3) groupBy로 프로필별 조립
    const baseVideosByProfileId = groupBy(baseVideoDocs, d => d.data().profileId);
    const motionsByProfileId = groupBy(motionDocs, d => d.data().profileId);

    const profiles = profilesSnap.docs.map(profileDoc => {
      const pData = profileDoc.data();

      const baseVideos = (baseVideosByProfileId.get(profileDoc.id) || []).map(v => {
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

      const motions = (motionsByProfileId.get(profileDoc.id) || []).map(m => {
        const md = m.data();
        return {
          id: m.id,
          profileId: md.profileId,
          name: md.name,
          gifUrl: md.gifUrl,
          videoUrl: md.videoUrl,
          position: md.position,
          status: md.status,
          deletedAt: md.deletedAt,
          createdAt: md.createdAt?.toDate?.() || md.createdAt,
          updatedAt: md.updatedAt?.toDate?.() || md.updatedAt,
        };
      });

      return {
        id: profileDoc.id,
        petId: pData.petId,
        userId: pData.userId,
        name: pData.name,
        type: pData.type,
        createdAt: pData.createdAt?.toDate?.() || pData.createdAt,
        updatedAt: pData.updatedAt?.toDate?.() || pData.updatedAt,
        baseVideos,
        motions,
      };
    });

    return {
      id: petDoc.id,
      userId: petData.userId,
      name: petData.name,
      species: petData.species || null,
      breed: petData.breed || null,
      gender: petData.gender || null,
      frontPhoto: petData.frontPhoto,
      sidePhoto: petData.sidePhoto,
      favoriteSnack: petData.favoriteSnack,
      walkingPlace: petData.walkingPlace,
      memo: petData.memo || null,
      personality: petData.personality || null,
      createdAt: petData.createdAt?.toDate?.() || petData.createdAt,
      updatedAt: petData.updatedAt?.toDate?.() || petData.updatedAt,
      birthday: petData.birthday?.toDate?.() || petData.birthday,
      memorialDay: petData.memorialDay?.toDate?.() || petData.memorialDay,
      profiles,
    };
  }

  async create(userId: string, data: {
    name: string;
    species?: string;
    breed?: string;
    gender?: string;
    frontPhoto: string;
    sidePhoto: string;
    birthday?: string;
    memorialDay?: string;
    favoriteSnack?: string;
    walkingPlace?: string;
    memo?: string;
    personality?: string;
  }) {
    const name = sanitizeText(data.name);
    const petRef = db.collection('pets').doc();
    const petData = {
      userId,
      name,
      species: data.species || null,
      breed: data.breed || null,
      gender: data.gender || null,
      frontPhoto: data.frontPhoto,
      sidePhoto: data.sidePhoto,
      birthday: data.birthday ? admin.firestore.Timestamp.fromDate(new Date(data.birthday)) : null,
      memorialDay: data.memorialDay ? admin.firestore.Timestamp.fromDate(new Date(data.memorialDay)) : null,
      favoriteSnack: data.favoriteSnack || null,
      walkingPlace: data.walkingPlace || null,
      memo: data.memo || null,
      personality: data.personality || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await petRef.set(petData);

    // Auto-create chat room with denormalized pet fields
    const chatRoomRef = db.collection('chatRooms').doc();
    await chatRoomRef.set({
      userId,
      petId: petRef.id,
      petName: name,
      petEmoji: '',
      petFrontPhoto: data.frontPhoto,
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessageContent: null,
      lastMessageSenderType: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id: petRef.id, ...petData };
  }

  async update(userId: string, petId: string, data: {
    name?: string;
    species?: string | null;
    breed?: string | null;
    gender?: string | null;
    birthday?: string;
    memorialDay?: string;
    favoriteSnack?: string;
    walkingPlace?: string;
    memo?: string | null;
    personality?: string | null;
  }) {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()!.userId !== userId) {
      throw new AppError('펫을 찾을 수 없습니다.', 404);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.name) updateData.name = sanitizeText(data.name);
    if (data.species !== undefined) updateData.species = data.species;
    if (data.breed !== undefined) updateData.breed = data.breed;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birthday) updateData.birthday = admin.firestore.Timestamp.fromDate(new Date(data.birthday));
    if (data.memorialDay) updateData.memorialDay = admin.firestore.Timestamp.fromDate(new Date(data.memorialDay));
    if (data.favoriteSnack !== undefined) updateData.favoriteSnack = data.favoriteSnack;
    if (data.walkingPlace !== undefined) updateData.walkingPlace = data.walkingPlace;
    if (data.memo !== undefined) updateData.memo = data.memo;
    if (data.personality !== undefined) updateData.personality = data.personality;

    await db.collection('pets').doc(petId).update(updateData);

    // Write-through: 이름 변경 시 chatRooms + profiles 비정규화 필드 동기화
    if (data.name) {
      const sanitizedName = sanitizeText(data.name);
      const [chatRoomsSnap, profilesSnap] = await Promise.all([
        db.collection('chatRooms').where('petId', '==', petId).get(),
        db.collection('profiles').where('petId', '==', petId).get(),
      ]);

      const batch = db.batch();
      chatRoomsSnap.docs.forEach(doc => {
        batch.update(doc.ref, { petName: sanitizedName });
      });
      profilesSnap.docs.forEach(doc => {
        batch.update(doc.ref, { petName: sanitizedName });
      });
      if (chatRoomsSnap.size + profilesSnap.size > 0) {
        await batch.commit();
      }
    }

    const updated = await db.collection('pets').doc(petId).get();
    const uData = updated.data()!;
    return {
      id: updated.id,
      userId: uData.userId,
      name: uData.name,
      species: uData.species || null,
      breed: uData.breed || null,
      gender: uData.gender || null,
      frontPhoto: uData.frontPhoto,
      sidePhoto: uData.sidePhoto,
      birthday: uData.birthday?.toDate?.() || uData.birthday,
      memorialDay: uData.memorialDay?.toDate?.() || uData.memorialDay,
      favoriteSnack: uData.favoriteSnack,
      walkingPlace: uData.walkingPlace,
      memo: uData.memo || null,
      personality: uData.personality || null,
      createdAt: uData.createdAt?.toDate?.() || uData.createdAt,
      updatedAt: uData.updatedAt?.toDate?.() || uData.updatedAt,
    };
  }

  async remove(userId: string, petId: string) {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()!.userId !== userId) {
      throw new AppError('펫을 찾을 수 없습니다.', 404);
    }
    await db.collection('pets').doc(petId).delete();
  }
}

export const petService = new PetService();
