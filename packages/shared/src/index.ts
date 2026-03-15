// ============================================
// PetHolo Shared Types
// 프론트엔드 + 백엔드 공용 타입 정의
// ============================================

// ---- User ----
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  credits: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Pet ----
export interface Pet {
  id: string;
  userId: string;
  name: string;
  emoji?: string;
  breed?: string;
  birthday?: string;
  memorialDay?: string;
  favoriteSnack?: string;
  walkingPlace?: string;
  memo?: string;
  frontPhotoUrl?: string;
  sidePhotoUrl?: string;
  profileCount: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Profile ----
export type ProfileType = 'STANDING' | 'SITTING';
export type ProfileStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface Profile {
  id: string;
  petId: string;
  petName?: string;
  name: string;
  type: ProfileType;
  status: ProfileStatus;
  gifUrl?: string;
  baseVideoCount: number;
  motionLeft?: string | null;
  motionRight?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Base Video ----
export interface BaseVideo {
  id: string;
  profileId: string;
  name: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
  deletedAt?: string;
}

// ---- Motion ----
export type MotionPosition = 'LEFT' | 'RIGHT' | 'NONE';
export type MotionStatus = 'ACTIVE' | 'LOCKED' | 'GENERATING';

export interface Motion {
  id: string;
  profileId: string;
  name: string;
  emoji?: string;
  videoUrl?: string;
  position: MotionPosition;
  status: MotionStatus;
  createdAt: string;
  deletedAt?: string;
}

// ---- Credit ----
export type CreditTransactionType =
  | 'CODE_REDEEM'
  | 'BASE_VIDEO_CREATE'
  | 'BASE_VIDEO_DELETE_REFUND'
  | 'BASE_VIDEO_RESTORE'
  | 'MOTION_CREATE'
  | 'MOTION_DELETE_REFUND'
  | 'MOTION_RESTORE'
  | 'IMAGE_REGEN';

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number; // + 적립, - 차감
  description?: string;
  createdAt: string;
}

// ---- Trash ----
export type TrashItemType = 'BASE_VIDEO' | 'MOTION' | 'PET' | 'PROFILE';

export interface TrashItem {
  id: string;
  userId: string;
  itemType: TrashItemType;
  itemId: string;
  itemName: string;
  petName?: string;
  deletedAt: string;
  expiresAt: string; // 30일 후 영구 삭제
  refundCredits: number;
}

// ---- API Responses ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// ---- Credit Constants ----
export const CREDIT_COSTS = {
  BASE_VIDEO_CREATE: 40,
  MOTION_CREATE: 40,
  IMAGE_REGEN: 10,
  DELETE_REFUND_RATE: 0.5, // 50% 환불
} as const;

// ---- Video Upload ----
export interface VideoUploadMeta {
  title: string;
  filePath: string;
  thumbnailUrl?: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  createdAt: string;
}
