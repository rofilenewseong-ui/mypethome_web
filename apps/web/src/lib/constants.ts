// ============================================
// 모션 타입 (백엔드 schema.types.ts와 동기화)
// ============================================

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

export const ALL_MOTION_TYPES: MotionType[] = [
  'FRONT_PAWS_UP', 'TONGUE_OUT', 'HEAD_TILT',
  'TAIL_WAG', 'SIT_DOWN', 'LIE_DOWN',
  'TURN_AROUND', 'SHAKE_BODY', 'SNIFF_GROUND',
  'LOOK_UP', 'STRETCH', 'YAWN',
];

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

export const MOTION_TYPE_EMOJIS: Record<MotionType, string> = {
  FRONT_PAWS_UP: '🐾',
  TONGUE_OUT: '👅',
  HEAD_TILT: '🐶',
  TAIL_WAG: '🐕',
  SIT_DOWN: '🦮',
  LIE_DOWN: '🐕‍🦺',
  TURN_AROUND: '🔄',
  SHAKE_BODY: '💫',
  SNIFF_GROUND: '👃',
  LOOK_UP: '👀',
  STRETCH: '🐈',
  YAWN: '🥱',
};

// ============================================
// 크레딧 비용 (백엔드 CREDIT_COSTS와 동기화)
// ============================================

export const CREDIT_COSTS = {
  PROFILE_CREATE: 120,
  BASE_VIDEO_CREATE: 40,
  MOTION_CREATE: 40,
  NANOBANANA_RETRY: 10,
} as const;
