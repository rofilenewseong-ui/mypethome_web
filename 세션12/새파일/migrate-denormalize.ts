/**
 * 비정규화 마이그레이션 스크립트
 *
 * chatRooms에 petName, petEmoji, petFrontPhoto, lastMessageContent, lastMessageSenderType 추가
 * profiles에 petName 추가
 *
 * 실행: npx tsx database/migrate-denormalize.ts
 */

import admin from 'firebase-admin';

// Firebase Admin 초기화 (환경변수 또는 서비스 계정 키 파일 필요)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateChatRooms() {
  console.log('=== chatRooms 비정규화 시작 ===');
  const roomsSnap = await db.collection('chatRooms').get();
  console.log(`총 ${roomsSnap.size}개 chatRoom 발견`);

  let updated = 0;
  let skipped = 0;

  // 500개 단위 배치 처리 (Firestore batch 제한)
  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < roomsSnap.docs.length; i += 500) {
    chunks.push(roomsSnap.docs.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();

    for (const roomDoc of chunk) {
      const roomData = roomDoc.data();

      // 이미 비정규화 필드가 있으면 스킵
      if (roomData.petName !== undefined) {
        skipped++;
        continue;
      }

      // pet 정보 가져오기
      const petDoc = await db.collection('pets').doc(roomData.petId).get();
      if (!petDoc.exists) {
        console.warn(`  pet ${roomData.petId} not found for room ${roomDoc.id}`);
        skipped++;
        continue;
      }

      const petData = petDoc.data()!;

      // 마지막 메시지 가져오기
      const lastMsgSnap = await db.collection('chatMessages')
        .where('chatRoomId', '==', roomDoc.id)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      const lastMsg = lastMsgSnap.empty ? null : lastMsgSnap.docs[0].data();

      batch.update(roomDoc.ref, {
        petName: petData.name || '',
        petEmoji: petData.emoji || '',
        petFrontPhoto: petData.frontPhoto || '',
        lastMessageContent: lastMsg?.content || null,
        lastMessageSenderType: lastMsg?.senderType || null,
      });

      updated++;
    }

    if (updated > 0) {
      await batch.commit();
    }
  }

  console.log(`  완료: ${updated}개 업데이트, ${skipped}개 스킵`);
}

async function migrateProfiles() {
  console.log('\n=== profiles 비정규화 시작 ===');
  const profilesSnap = await db.collection('profiles').get();
  console.log(`총 ${profilesSnap.size}개 profile 발견`);

  let updated = 0;
  let skipped = 0;

  // petId → name 매핑 캐시
  const petNameCache = new Map<string, string>();

  const chunks: FirebaseFirestore.QueryDocumentSnapshot[][] = [];
  for (let i = 0; i < profilesSnap.docs.length; i += 500) {
    chunks.push(profilesSnap.docs.slice(i, i + 500));
  }

  for (const chunk of chunks) {
    const batch = db.batch();

    for (const profileDoc of chunk) {
      const profileData = profileDoc.data();

      // 이미 비정규화 필드가 있으면 스킵
      if (profileData.petName !== undefined) {
        skipped++;
        continue;
      }

      let petName = petNameCache.get(profileData.petId);
      if (petName === undefined) {
        const petDoc = await db.collection('pets').doc(profileData.petId).get();
        petName = petDoc.exists ? petDoc.data()!.name : '';
        petNameCache.set(profileData.petId, petName);
      }

      batch.update(profileDoc.ref, { petName });
      updated++;
    }

    if (updated > 0) {
      await batch.commit();
    }
  }

  console.log(`  완료: ${updated}개 업데이트, ${skipped}개 스킵`);
}

async function main() {
  console.log('PetHolo 비정규화 마이그레이션 시작\n');

  try {
    await migrateChatRooms();
    await migrateProfiles();
    console.log('\n마이그레이션 완료!');
  } catch (error) {
    console.error('마이그레이션 실패:', error);
    process.exit(1);
  }
}

main();
