import { db } from '../config/firebase';
import admin from 'firebase-admin';
import { AppError } from '../middleware/errorHandler';

export class PetService {
  async list(userId: string) {
    const petsSnap = await db.collection('pets')
      .where('userId', '==', userId)
      .get();

    const pets = await Promise.all(
      petsSnap.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch related profiles
        const profilesSnap = await db.collection('profiles')
          .where('petId', '==', doc.id)
          .get();
        const profiles = profilesSnap.docs.map(p => ({
          id: p.id,
          name: p.data().name,
          type: p.data().type,
        }));

        // Fetch chat room
        const chatRoomSnap = await db.collection('chatRooms')
          .where('petId', '==', doc.id)
          .where('userId', '==', userId)
          .limit(1)
          .get();
        const chatRoom = chatRoomSnap.empty ? null : {
          id: chatRoomSnap.docs[0].id,
          lastMessageAt: chatRoomSnap.docs[0].data().lastMessageAt?.toDate?.() || chatRoomSnap.docs[0].data().lastMessageAt,
        };

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
      })
    );

    // JS 정렬 (Firestore composite index 없이도 동작)
    pets.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return dateB - dateA;
    });

    return pets;
  }

  async getById(userId: string, petId: string) {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists || petDoc.data()!.userId !== userId) {
      throw new AppError('펫을 찾을 수 없습니다.', 404);
    }

    const petData = petDoc.data()!;

    // Fetch profiles with baseVideos and motions
    const profilesSnap = await db.collection('profiles')
      .where('petId', '==', petId)
      .get();

    const profiles = await Promise.all(
      profilesSnap.docs.map(async (profileDoc) => {
        const pData = profileDoc.data();

        const baseVideosSnap = await db.collection('baseVideos')
          .where('profileId', '==', profileDoc.id)
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

        const motionsSnap = await db.collection('motions')
          .where('profileId', '==', profileDoc.id)
          .where('deletedAt', '==', null)
          .get();
        const motions = motionsSnap.docs.map(m => {
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
      })
    );

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
    const petRef = db.collection('pets').doc();
    const petData = {
      userId,
      name: data.name,
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

    // Auto-create chat room
    const chatRoomRef = db.collection('chatRooms').doc();
    await chatRoomRef.set({
      userId,
      petId: petRef.id,
      lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
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
    if (data.name) updateData.name = data.name;
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
