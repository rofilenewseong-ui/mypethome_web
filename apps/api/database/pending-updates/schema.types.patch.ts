/**
 * schema.types.ts 변경사항
 *
 * 아래 내용을 원본 schema.types.ts에 머지해주세요.
 */

// ============================================
// 변경 1: UserDoc에 lastLoginAt 추가
// ============================================

// 기존:
// export interface UserDoc {
//   ...
//   isVerified: boolean;
//   createdAt: Timestamp;
//   updatedAt: Timestamp;
// }

// 변경 후:
// export interface UserDoc {
//   ...
//   isVerified: boolean;
//   lastLoginAt?: Timestamp;    // ← 추가
//   createdAt: Timestamp;
//   updatedAt: Timestamp;
// }

// ============================================
// 변경 2: ProductCodeDoc에 Cafe24 추적 필드 추가
// ============================================

// 기존:
// export interface ProductCodeDoc {
//   code: string;
//   productType: ProductType;
//   isUsed: boolean;
//   usedByUserId: string | null;
//   usedAt: Timestamp | null;
//   createdAt: Timestamp;
// }

// 변경 후:
// export interface ProductCodeDoc {
//   code: string;
//   productType: ProductType;
//   isUsed: boolean;
//   usedByUserId: string | null;
//   usedAt: Timestamp | null;
//   cafe24OrderId?: string;      // ← 추가 (웹훅 중복 방지)
//   cafe24ProductId?: string;    // ← 추가
//   cafe24BuyerEmail?: string;   // ← 추가
//   createdAt: Timestamp;
// }
