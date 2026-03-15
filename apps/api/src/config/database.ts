/**
 * 타입 안전한 Firestore 헬퍼
 *
 * 사용법:
 *   import { getCollection } from '../config/database';
 *   const userDoc = await getCollection('users').doc(userId).get();
 *   const data = userDoc.data(); // 타입: UserDoc | undefined
 */

import { db } from './firebase';
import type { CollectionDocMap } from '../types/schema.types';

export { COLLECTIONS, CONSTRAINTS, CREDIT_COSTS, PRODUCT_CREDITS } from '../types/schema.types';

/** 컬렉션 이름으로 자동 타입 매핑된 참조 반환 */
export function getCollection<K extends keyof CollectionDocMap>(
  name: K
): FirebaseFirestore.CollectionReference<CollectionDocMap[K]> {
  return db.collection(name) as FirebaseFirestore.CollectionReference<CollectionDocMap[K]>;
}

export { db };
export default db;
