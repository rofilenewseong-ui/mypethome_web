import { z } from 'zod';

export const restoreTrashSchema = z.object({
  params: z.object({
    id: z.string().min(1, '휴지통 항목 ID가 필요합니다.'),
  }),
});

export const permanentDeleteSchema = z.object({
  params: z.object({
    id: z.string().min(1, '휴지통 항목 ID가 필요합니다.'),
  }),
});
