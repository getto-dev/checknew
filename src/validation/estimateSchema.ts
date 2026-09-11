import { z } from 'zod';

export const EstimateItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(300),
  category: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().finite().nonnegative(),
  quantity: z.number().finite().positive(),
  type: z.enum(['work', 'material']),
});

export const EstimateSchema = z.object({
  id: z.string().min(1),
  items: z.array(EstimateItemSchema).max(5000),
});

export type ValidatedEstimate = z.infer<typeof EstimateSchema>;
