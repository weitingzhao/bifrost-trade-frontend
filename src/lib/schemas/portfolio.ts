import { z } from 'zod'

const PositionCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number().nullable(),
}).passthrough()

export const PositionCategoriesResponseSchema = z.object({
  ok: z.boolean(),
  items: z.array(PositionCategorySchema),
}).passthrough()
