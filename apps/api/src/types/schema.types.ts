/**
 * PetHolo Firestore Schema Type Definitions
 *
 * 모든 Firestore 컬렉션의 문서 타입을 정의합니다.
 * 서비스 레이어에서 이 타입들을 import하여 타입 안전성을 보장합니다.
 *
 * @generated 2026-03-05
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// Enum Types
// ============================================

export type UserRole = 'USER' | 'ADMIN';
export type ProfileType = 'STANDING' | 'SITTING';
export type MediaStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MotionPosition = 'LEFT' | 'RIGHT' | 'NONE';
export type MotionType =
  | 'FRONT_PAWS_UP'
  | 'TONGUE_OUT'
  | 'HEAD_TILT'
  | 'TAIL_WAG'
  | 'SIT_DOWN'
  | 'LIE_DOWN'
  | 'TURN_AROUND'
  | 'SHAKE_BODY'
  | 'SNIFF_GROUND'
  | 'LOOK_UP'
  | 'STRETCH'
  | 'YAWN';

export const MOTION_TYPE_LABELS: Record<MotionType, string> = {
  FRONT_PAWS_UP: '앞발들기',
  TONGUE_OUT: '혀내밀기',
  HEAD_TILT: '고개갸우뚱',
  TAIL_WAG: '꼬리흔들기',
  SIT_DOWN: '앉기',
  LIE_DOWN: '엎드리기',
  TURN_AROUND: '돌아보기',
  SHAKE_BODY: '몸털기',
  SNIFF_GROUND: '바닥냄새맡기',
  LOOK_UP: '위쳐다보기',
  STRETCH: '기지개',
  YAWN: '하품',
};

export const ALL_MOTION_TYPES: MotionType[] = [
  'FRONT_PAWS_UP', 'TONGUE_OUT', 'HEAD_TILT',
  'TAIL_WAG', 'SIT_DOWN', 'LIE_DOWN',
  'TURN_AROUND', 'SHAKE_BODY', 'SNIFF_GROUND',
  'LOOK_UP', 'STRETCH', 'YAWN',
];
export type SenderType = 'USER' | 'PET_AI';
export type CreditType = 'SPEND' | 'EARN' | 'REFUND' | 'CAFE24_ACRYLIC_SET';
export type TrashItemType = 'BASE_VIDEO' | 'MOTION';
export type ProductType = 'FULL_SET' | 'CREDIT_120' | 'CREDIT_40';
export type PetSpecies = 'DOG' | 'CAT' | 'OTHER';
export type PetGender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type PromptType = 'BARE' | 'OUTFIT';
export type RelatedEntityType = 'PROFILE' | 'BASE_VIDEO' | 'MOTION' | 'PRODUCT_CODE';

// ============================================
// Collection Document Types
// ============================================

/** Collection: users */
export interface UserDoc {
  email: string;
  passwordHash?: string;
  name: string;
  googleId?: string;
  cafe24MemberId?: string;
  phone?: string;
  role: UserRole;
  credits: number;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: pets */
export interface PetDoc {
  userId: string;
  name: string;
  species: PetSpecies | null;
  breed: string | null;
  gender: PetGender | null;
  emoji: string;
  frontPhoto: string;
  sidePhoto: string;
  birthday: Timestamp | null;
  memorialDay: Timestamp | null;
  favoriteSnack: string | null;
  walkingPlace: string | null;
  memo: string | null;
  personality?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: profiles */
export interface ProfileDoc {
  petId: string;
  userId: string;
  name: string;
  type: ProfileType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: baseVideos */
export interface BaseVideoDoc {
  profileId: string;
  isActive: boolean;
  status: MediaStatus;
  videoUrl: string | null;
  gifUrl: string | null;
  klingJobId: string | null;
  klingTaskStatus?: string;
  duration?: string;
  error?: string;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: motions */
export interface MotionDoc {
  profileId: string;
  name: string;
  motionType: MotionType;
  gifUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  position: MotionPosition;
  status: MediaStatus;
  deletedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: chatRooms */
export interface ChatRoomDoc {
  userId: string;
  petId: string;
  lastMessageAt: Timestamp;
  createdAt: Timestamp;
}

/** Collection: chatMessages */
export interface ChatMessageDoc {
  chatRoomId: string;
  senderType: SenderType;
  content: string;
  isRead: boolean;
  scheduledAt: Timestamp | null;
  createdAt: Timestamp;
}

/** Collection: creditTransactions */
export interface CreditTransactionDoc {
  userId: string;
  type: CreditType;
  amount: number;
  description: string;
  relatedEntityType: RelatedEntityType | null;
  relatedEntityId: string | null;
  createdAt: Timestamp;
}

/** Collection: trashItems */
export interface TrashItemDoc {
  userId: string;
  itemType: TrashItemType;
  itemId: string;
  refundedCredits: number;
  deletedAt: Timestamp;
  expiresAt: Timestamp;
  createdAt: Timestamp;
}

/** Collection: productCodes */
export interface ProductCodeDoc {
  code: string;
  productType: ProductType;
  isUsed: boolean;
  usedByUserId: string | null;
  usedAt: Timestamp | null;
  cafe24OrderId?: string;
  cafe24ProductId?: string;
  cafe24BuyerEmail?: string | null;
  createdAt: Timestamp;
}

/** Collection: auditLogs */
export interface AuditLogDoc {
  userId: string | null;
  action: string;
  details: string;
  ipAddress: string | null;
  createdAt: Timestamp;
}

// ============================================
// Analytics Collection Document Types
// ============================================

export type AnalyticsEvent =
  | 'page_view' | 'login' | 'signup' | 'logout'
  | 'pet_register' | 'pet_update' | 'pet_view'
  | 'profile_create' | 'profile_view'
  | 'base_video_create' | 'motion_create'
  | 'player_open' | 'player_close' | 'motion_tap' | 'motion_lock' | 'video_error'
  | 'message_send' | 'message_read' | 'emoji_panel_open' | 'emoji_select' | 'chat_room_open'
  | 'credit_redeem' | 'credit_spend'
  | 'trash_delete' | 'trash_restore'
  | 'start_frame_generate' | 'start_frame_select'
  | 'store_view' | 'store_purchase_start'
  | 'app_open' | 'error_occur';

/** Collection: analyticsEvents */
export interface AnalyticsEventDoc {
  userId: string;
  sessionId: string;
  event: AnalyticsEvent;
  properties: Record<string, unknown>;
  page: string;
  deviceInfo: {
    platform: string;
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
    isStandalone: boolean;
  };
  createdAt: Timestamp;
}

/** Collection: playbackSessions */
export interface PlaybackSessionDoc {
  userId: string;
  profileId: string;
  petId: string;
  startedAt: Timestamp;
  endedAt: Timestamp | null;
  duration: number;
  motionTaps: number;
  motionLocks: number;
  motionDetails: Array<{
    position: 'LEFT' | 'RIGHT';
    motionId: string;
    timestamp: Timestamp;
  }>;
  deviceInfo: {
    platform: string;
    screenWidth: number;
    screenHeight: number;
  };
}

/** Collection: dailyStats */
export interface DailyStatsDoc {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalPageViews: number;
  totalPlaybackMinutes: number;
  avgPlaybackMinutes: number;
  totalMotionTaps: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalCreditsSpent: number;
  totalCreditsEarned: number;
  newPets: number;
  newProfiles: number;
  newBaseVideos: number;
  newMotions: number;
  topPages: Array<{ path: string; views: number }>;
  updatedAt: Timestamp;
}

/** Collection: startFrameJobs */
export interface StartFrameJobDoc {
  profileId: string;
  userId: string;
  status: MediaStatus;
  promptType: PromptType;
  refCount: number;
  images: string | null;
  selectedImageUrl: string | null;
  error?: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Collection: nanoBananaJobs (Legacy) */
export interface NanoBananaJobDoc {
  status: string;
  images: string | null;
  error: string | null;
  expiresAt: Timestamp | null;
}

// ============================================
// Collection Name Constants
// ============================================

export const COLLECTIONS = {
  USERS: 'users',
  PETS: 'pets',
  PROFILES: 'profiles',
  BASE_VIDEOS: 'baseVideos',
  MOTIONS: 'motions',
  CHAT_ROOMS: 'chatRooms',
  CHAT_MESSAGES: 'chatMessages',
  CREDIT_TRANSACTIONS: 'creditTransactions',
  TRASH_ITEMS: 'trashItems',
  PRODUCT_CODES: 'productCodes',
  AUDIT_LOGS: 'auditLogs',
  START_FRAME_JOBS: 'startFrameJobs',
  NANO_BANANA_JOBS: 'nanoBananaJobs',
  ANALYTICS_EVENTS: 'analyticsEvents',
  PLAYBACK_SESSIONS: 'playbackSessions',
  DAILY_STATS: 'dailyStats',
} as const;

// ============================================
// Collection → Document Type Mapping
// ============================================

export interface CollectionDocMap {
  users: UserDoc;
  pets: PetDoc;
  profiles: ProfileDoc;
  baseVideos: BaseVideoDoc;
  motions: MotionDoc;
  chatRooms: ChatRoomDoc;
  chatMessages: ChatMessageDoc;
  creditTransactions: CreditTransactionDoc;
  trashItems: TrashItemDoc;
  productCodes: ProductCodeDoc;
  auditLogs: AuditLogDoc;
  startFrameJobs: StartFrameJobDoc;
  nanoBananaJobs: NanoBananaJobDoc;
  analyticsEvents: AnalyticsEventDoc;
  playbackSessions: PlaybackSessionDoc;
  dailyStats: DailyStatsDoc;
}

// ============================================
// Credit Constants
// ============================================

export const CREDIT_COSTS = {
  PROFILE_CREATE: 120,
  BASE_VIDEO_CREATE: 40,
  MOTION_CREATE: 40,
  NANOBANANA_RETRY: 10,
  DELETE_REFUND: 20,
  RESTORE_COST: 20,
} as const;

export const PRODUCT_CREDITS: Record<ProductType, number> = {
  FULL_SET: 120,
  CREDIT_120: 120,
  CREDIT_40: 40,
};

// ============================================
// Business Constraints
// ============================================

export const CONSTRAINTS = {
  MAX_BASE_VIDEOS_PER_PROFILE: 3,
  MAX_MOTIONS_PER_PROFILE: 12,
  TRASH_RETENTION_DAYS: 30,
  START_FRAME_EXPIRY_MINUTES: 30,
  AI_RESPONSE_MIN_DELAY_MINUTES: 5,
  AI_RESPONSE_MAX_DELAY_MINUTES: 30,
} as const;
