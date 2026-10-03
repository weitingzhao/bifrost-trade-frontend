import { z } from 'zod'

const PositionCategorySchema = z.object({
  category_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number().nullable(),
}).passthrough()

export const PositionCategoriesResponseSchema = z.object({
  /** Sent until the api release that drops legacy keys; nothing reads it. */
  ok: z.boolean().optional(),
  items: z.array(PositionCategorySchema),
}).passthrough()

/**
 * One short option leg and the price its cushion is measured against.
 *
 * `spot` is null where the underlying carries no live quote. The reader must
 * treat that as unpriced, never as safe -- `summarizeCushion` already does.
 */
export const ShortLegSchema = z
  .object({
    account_id: z.string().nullable().optional(),
    symbol: z.string(),
    expiry: z.string().nullable().optional(),
    strike: z.number().nullable(),
    right: z.string().nullable(),
    qty: z.number(),
    contract_key: z.string().nullable().optional(),
    spot: z.number().nullable(),
  })
  .passthrough()

export const ShortLegsResponseSchema = z
  .object({
    legs: z.array(ShortLegSchema),
    count: z.number(),
  })
  .passthrough()
