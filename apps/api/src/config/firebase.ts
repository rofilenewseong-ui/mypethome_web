import admin from 'firebase-admin';
import { logger } from '../utils/logger';

let firebaseInitialized = false;

// 방법 1: 서비스 계정 JSON 파일
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    firebaseInitialized = true;
    logger.info('Firebase initialized via service account file');
  } catch (error) {
    logger.warn('Service account file not found, trying env variables...', (error as Error).message);
  }
}

// 방법 2: 환경 변수 (파일 방식 실패 시 폴백)
if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    firebaseInitialized = true;
    logger.info('Firebase initialized via env variables');
  } catch (error) {
    logger.error('Firebase initialization via env variables failed:', error);
  }
}

if (!firebaseInitialized) {
  logger.warn('Firebase credentials not configured. Running in limited mode.');
  logger.warn('Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY in .env');
}

export const db = firebaseInitialized ? admin.firestore() : (null as unknown as FirebaseFirestore.Firestore);
export const auth = firebaseInitialized ? admin.auth() : (null as unknown as admin.auth.Auth);
export const fbStorage = firebaseInitialized ? admin.storage() : null;
export { firebaseInitialized };
export default admin;
