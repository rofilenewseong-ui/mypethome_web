import { z } from 'zod';

export const redeemCodeSchema = z.object({
  body: z.object({
    code: z.string()
      .min(16, '16자리 코드를 입력해주세요.')
      .max(19, '올바른 코드 형식이 아닙니다.')
      .transform((val) => val.replace(/-/g, '')),
  }),
});
