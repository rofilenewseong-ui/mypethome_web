/**
 * PetHolo 시드 데이터 스크립트
 *
 * 개발/테스트용 초기 데이터를 Firestore에 삽입합니다.
 *
 * 실행: npx tsx apps/api/database/seed.ts
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';

// Firebase 초기화
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (serviceAccountPath) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sa = require(path.resolve(process.cwd(), serviceAccountPath));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
} else {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

async function seed() {
  console.log('🌱 시드 데이터 삽입 시작...\n');

  // 1. 테스트 사용자
  const passwordHash = await bcrypt.hash('test1234', 12);

  const silverUserRef = db.collection('users').doc('seed-silver-user');
  await silverUserRef.set({
    email: 'silver@test.com',
    passwordHash,
    name: '실버 보호자님',
    role: 'USER',
    tier: 'SILVER',
    credits: 120,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 사용자: silver@test.com (Silver, 120C)');

  const bronzeUserRef = db.collection('users').doc('seed-bronze-user');
  await bronzeUserRef.set({
    email: 'bronze@test.com',
    passwordHash,
    name: '브론즈 보호자님',
    role: 'USER',
    tier: 'BRONZE',
    credits: 0,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 사용자: bronze@test.com (Bronze, 0C)');

  const adminUserRef = db.collection('users').doc('seed-admin-user');
  await adminUserRef.set({
    email: 'admin@test.com',
    passwordHash,
    name: '관리자',
    role: 'ADMIN',
    tier: 'SILVER',
    credits: 9999,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 사용자: admin@test.com (Admin)');

  // 2. 테스트 반려동물
  const petRef = db.collection('pets').doc('seed-pet-1');
  await petRef.set({
    userId: silverUserRef.id,
    name: '초코',
    emoji: '🐕',
    frontPhoto: '/uploads/sample/choco-front.jpg',
    sidePhoto: '/uploads/sample/choco-side.jpg',
    birthday: admin.firestore.Timestamp.fromDate(new Date('2015-03-15')),
    memorialDay: admin.firestore.Timestamp.fromDate(new Date('2025-01-10')),
    favoriteSnack: '닭가슴살',
    walkingPlace: '한강공원',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 반려동물: 초코 🐕');

  // 3. 테스트 채팅방 (pet 등록 시 자동 생성)
  const chatRoomRef = db.collection('chatRooms').doc('seed-chatroom-1');
  await chatRoomRef.set({
    userId: silverUserRef.id,
    petId: petRef.id,
    lastMessageAt: now,
    createdAt: now,
  });
  console.log('✅ 채팅방: 초코');

  // 4. 테스트 프로필
  const profileRef = db.collection('profiles').doc('seed-profile-1');
  await profileRef.set({
    petId: petRef.id,
    userId: silverUserRef.id,
    name: '초코 서있기',
    type: 'STANDING',
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 프로필: 초코 서있기 (STANDING)');

  // 5. 테스트 베이스 영상
  const baseVideoRef = db.collection('baseVideos').doc('seed-basevideo-1');
  await baseVideoRef.set({
    profileId: profileRef.id,
    isActive: true,
    status: 'COMPLETED',
    videoUrl: '/uploads/sample/choco-base.mp4',
    gifUrl: '/uploads/sample/choco-base.gif',
    klingJobId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  console.log('✅ 베이스 영상: 1개 (COMPLETED)');

  // 6. 테스트 상품 코드
  const codeRef = db.collection('productCodes').doc('seed-code-1');
  await codeRef.set({
    code: 'TEST-1234-5678-ABCD',
    productType: 'CREDIT_40',
    isUsed: false,
    usedByUserId: null,
    usedAt: null,
    createdAt: now,
  });
  console.log('✅ 상품코드: TEST-1234-5678-ABCD (40C)');

  // 7. 크레딧 초기 거래 기록
  await db.collection('creditTransactions').add({
    userId: silverUserRef.id,
    type: 'EARN',
    amount: 120,
    description: 'Silver 등급 초기 크레딧',
    relatedEntityType: null,
    relatedEntityId: null,
    createdAt: now,
  });
  console.log('✅ 크레딧 거래: +120C (Silver 초기)');

  console.log('\n🎉 시드 데이터 삽입 완료!');
  console.log('\n📋 테스트 계정:');
  console.log('   silver@test.com / test1234 (Silver, 120C)');
  console.log('   bronze@test.com / test1234 (Bronze, 0C)');
  console.log('   admin@test.com  / test1234 (Admin)');
  console.log('   상품코드: TEST-1234-5678-ABCD');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ 시드 데이터 삽입 실패:', err);
  process.exit(1);
});
