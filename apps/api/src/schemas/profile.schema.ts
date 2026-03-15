import { z } from 'zod';
import { ALL_MOTION_TYPES } from '../types/schema.types';

export const createProfileSchema = z.object({
  body: z.object({
    petId: z.string().min(1, '펫 ID가 필요합니다.'),
    name: z.string().min(1, '프로필 이름을 입력해주세요.').max(50),
    type: z.enum(['STANDING', 'SITTING']),
    selectedMotionTypes: z.array(
      z.enum(ALL_MOTION_TYPES as unknown as [string, ...string[]])
    ).length(2),
  }),
});

export const createMotionSchema = z.object({
  body: z.object({
    motionType: z.enum(ALL_MOTION_TYPES as unknown as [string, ...string[]]),
  }),
});

export const assignMotionSchema = z.object({
  params: z.object({
    profileId: z.string().min(1),
    id: z.string().min(1),
  }),
  body: z.object({
    position: z.enum(['LEFT', 'RIGHT', 'NONE']),
  }),
});
