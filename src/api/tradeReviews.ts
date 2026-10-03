/**
 * `/trade-reviews` — the trader's review of each trade (design Rev .110, core
 * 0.26.0 `trade_review`; api 0.7.0 moved it out of `/strategies/reviews`, naming
 * R1). Queue, Trade review and the Review menu badge read the same rows. The tag
 * lists are read and written as `tags_added_json` / `tags_dropped_json`.
 */
import { z } from 'zod'
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'

export const TradeReviewSchema = z
  .object({
    trade_id: z.number(),
    tags_added_json: z.array(z.string()),
    tags_dropped_json: z.array(z.string()),
    reviewed: z.boolean(),
    reviewed_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough()

export type TradeReview = z.infer<typeof TradeReviewSchema>

const TradeReviewsResponseSchema = z.object({ items: z.array(TradeReviewSchema), count: z.number() }).passthrough()

const validateList = withValidation<z.infer<typeof TradeReviewsResponseSchema>>(TradeReviewsResponseSchema, 'strategy/trade-reviews')

export interface TradeReviewPatch {
  tags_added_json?: string[]
  tags_dropped_json?: string[]
  // No `note` (TD-73): a trade's notes live in the journal only; api 0.7.1
  // refuses the field (422).
  /** true stamps the review done; false reopens it. */
  reviewed?: boolean
}

export async function fetchTradeReviews(): Promise<TradeReview[]> {
  return validateList(await requestJson(strategyUrl('/trade-reviews'), { label: `Strategy /trade-reviews` })).items
}

/**
 * PATCH the fields sent (api 0.3.0) — an upsert: the first write creates the
 * review row. Tag lists replace the stored lists whole; `reviewed: true`
 * stamps (the first stamp is kept), `false` reopens. Answers the review row.
 */
export function saveTradeReview(tradeId: number, patch: TradeReviewPatch): Promise<TradeReview> {
  return requestJson(strategyUrl(`/trade-reviews/${tradeId}`), {
    method: 'PATCH',
    body: patch,
    schema: TradeReviewSchema,
  })
}
