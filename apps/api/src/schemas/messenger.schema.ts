import { z } from 'zod';

export const sendMessageSchema = z.object({
  params: z.object({
    petId: z.string().min(1, '펫 ID가 필요합니다.'),
  }),
  body: z.object({
    content: z.string()
      .min(1, '메시지를 입력해주세요.')
      .max(500, '메시지는 500자 이내로 입력해주세요.'),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    petId: z.string().min(1, '펫 ID가 필요합니다.'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
});
