import { z } from 'zod';

const speciesEnum = z.enum(['DOG', 'CAT', 'OTHER']);
const genderEnum = z.enum(['MALE', 'FEMALE', 'UNKNOWN']);

export const createPetSchema = z.object({
  body: z.object({
    name: z.string().min(1, '펫 이름을 입력해주세요.').max(50),
    species: speciesEnum.optional(),
    breed: z.string().max(50).optional(),
    gender: genderEnum.optional(),
    birthday: z.string().datetime().optional(),
    memorialDay: z.string().datetime().optional(),
    favoriteSnack: z.string().max(100).optional(),
    walkingPlace: z.string().max(100).optional(),
    memo: z.string().max(500).optional(),
    personality: z.string().max(200).optional(),
  }),
});

export const updatePetSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(50).optional(),
    species: speciesEnum.nullable().optional(),
    breed: z.string().max(50).nullable().optional(),
    gender: genderEnum.nullable().optional(),
    birthday: z.string().datetime().optional(),
    memorialDay: z.string().datetime().optional(),
    favoriteSnack: z.string().max(100).optional(),
    walkingPlace: z.string().max(100).optional(),
    memo: z.string().max(500).nullable().optional(),
    personality: z.string().max(200).nullable().optional(),
  }),
});
