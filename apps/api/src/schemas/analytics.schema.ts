import { z } from 'zod';

const deviceInfoSchema = z.object({
  platform: z.string().default(''),
  userAgent: z.string().default(''),
  screenWidth: z.number().default(0),
  screenHeight: z.number().default(0),
  isStandalone: z.boolean().default(false),
});

export const trackEventSchema = z.object({
  body: z.object({
    event: z.string().min(1, '이벤트명이 필요합니다.'),
    properties: z.record(z.string(), z.unknown()).default({}),
    page: z.string().default(''),
    sessionId: z.string().min(1, '세션 ID가 필요합니다.'),
    deviceInfo: deviceInfoSchema.optional(),
  }),
});

export const trackBatchSchema = z.object({
  body: z.object({
    events: z.array(z.object({
      event: z.string().min(1),
      properties: z.record(z.string(), z.unknown()).default({}),
      page: z.string().default(''),
      sessionId: z.string().min(1),
      deviceInfo: deviceInfoSchema.optional(),
      timestamp: z.string().optional(),
    })).min(1).max(50),
  }),
});

export const startPlaybackSchema = z.object({
  body: z.object({
    profileId: z.string().min(1, '프로필 ID가 필요합니다.'),
    petId: z.string().default(''),
    deviceInfo: z.object({
      platform: z.string().default(''),
      screenWidth: z.number().default(0),
      screenHeight: z.number().default(0),
    }).optional(),
  }),
});

export const endPlaybackSchema = z.object({
  params: z.object({
    sessionId: z.string().min(1),
  }),
  body: z.object({
    duration: z.number().min(0).default(0),
    motionTaps: z.number().min(0).default(0),
    motionLocks: z.number().min(0).default(0),
    motionDetails: z.array(z.object({
      position: z.enum(['LEFT', 'RIGHT']),
      motionId: z.string(),
      timestamp: z.string(),
    })).default([]),
  }),
});
