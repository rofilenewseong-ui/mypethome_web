"use strict";
/**
 * PetHolo Firestore Schema Type Definitions
 *
 * 모든 Firestore 컬렉션의 문서 타입을 정의합니다.
 * 서비스 레이어에서 이 타입들을 import하여 타입 안전성을 보장합니다.
 *
 * @generated 2026-03-05
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSTRAINTS = exports.PRODUCT_CREDITS = exports.CREDIT_COSTS = exports.COLLECTIONS = void 0;
// ============================================
// Collection Name Constants
// ============================================
exports.COLLECTIONS = {
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
};
// ============================================
// Credit Constants
// ============================================
exports.CREDIT_COSTS = {
    PROFILE_CREATE: 120,
    BASE_VIDEO_CREATE: 40,
    MOTION_CREATE: 40,
    NANOBANANA_RETRY: 10,
    DELETE_REFUND: 20,
    RESTORE_COST: 20,
};
exports.PRODUCT_CREDITS = {
    FULL_SET: 120,
    CREDIT_120: 120,
    CREDIT_40: 40,
};
// ============================================
// Business Constraints
// ============================================
exports.CONSTRAINTS = {
    MAX_BASE_VIDEOS_PER_PROFILE: 3,
    MAX_MOTIONS_PER_PROFILE: 12,
    TRASH_RETENTION_DAYS: 30,
    START_FRAME_EXPIRY_MINUTES: 30,
    AI_RESPONSE_MIN_DELAY_MINUTES: 5,
    AI_RESPONSE_MAX_DELAY_MINUTES: 30,
};
//# sourceMappingURL=schema.types.js.map