import { z } from 'zod';

export const cafe24OrderSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
    productId: z.string().min(1),
    productName: z.string().min(1),
    buyerEmail: z.string().email().optional(),
  }),
});
