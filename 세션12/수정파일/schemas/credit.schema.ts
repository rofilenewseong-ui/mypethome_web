import { z } from 'zod';

export const redeemCodeSchema = z.object({
  body: z.object({
    code: z.string()
      .min(16, '16자리 코드를 입력해주세요.')
      .max(19, '올바른 코드 형식이 아닙니다.')
      .transform((val) => val.replace(/-/g, '')),
  }),
});

export const creditHistorySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const spendCreditSchema = z.object({
  body: z.object({
    amount: z.number().int().min(1, '크레딧 금액은 1 이상이어야 합니다.'),
    description: z.string().max(200).optional(),
  }),
});
