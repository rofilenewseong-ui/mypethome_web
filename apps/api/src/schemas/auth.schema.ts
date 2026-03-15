import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('올바른 이메일을 입력해주세요.'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.')
      .regex(/[A-Za-z]/, '영문자를 포함해야 합니다.')
      .regex(/[0-9]/, '숫자를 포함해야 합니다.'),
    name: z.string().min(1, '이름을 입력해주세요.').max(50),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('올바른 이메일을 입력해주세요.'),
    password: z.string().min(1, '비밀번호를 입력해주세요.'),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1),
  }),
});

export const cafe24AuthSchema = z.object({
  body: z.object({
    code: z.string().min(1, '인증 코드가 필요합니다.'),
  }),
});
