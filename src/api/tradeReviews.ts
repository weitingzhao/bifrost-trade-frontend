/**
 * `/strategies/reviews` — the trader's review of each instance (design Rev
 * .110, core 0.26.0 `trade_review`). Queue, Trade review and the Review menu
 * badge read the same rows.
 */
import { z } from 'zod'
import { withValidation } from '@/lib/apiValidation'
import { strategyUrl } from '@/lib/devApiUrl'
import { requestJson } from '@/lib/http'

export const TradeReviewSchema = z
  .object({
    strategy_instance_id: z.number(),
    tags_added: z.array(z.string()),
    tags_dropped: z.array(z.string()),
    note: z.string().nullable().optional(),
    reviewed: z.boolean(),
    reviewed_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough()

export type TradeReview = z.infer<typeof TradeReviewSchema>

const TradeReviewsResponseSchema = z.object({ items: z.array(TradeReviewSchema), count: z.number() }).passthrough()

const validateList = withValidation<z.infer<typeof TradeReviewsResponseSchema>>(TradeReviewsResponseSchema, 'strategy/reviews')

export interface TradeReviewPatch {
  tags_added?: string[]
  tags_dropped?: string[]
  // No `note` (TD-73): a trade's notes live in the journal only; the review's
  // note column stops being written and is dropped later.
  /** true stamps the review done; false reopens it. */
  reviewed?: boolean
}

export async function fetchTradeReviews(): Promise<TradeReview[]> {
  return validateList(await requestJson(strategyUrl('/strategies/reviews'), { label: `Strategy /strategies/reviews` })).items
}

/**
 * PATCH the fields sent (api 0.3.0) — an upsert: the first write creates the
 * review row. Tag lists replace the stored lists whole; `reviewed: true`
 * stamps (the first stamp is kept), `false` reopens. Answers the review row.
 */
export function saveTradeReview(instanceId: number, patch: TradeReviewPatch): Promise<TradeReview> {
  return requestJson(strategyUrl(`/strategies/reviews/${instanceId}`), {
    method: 'PATCH',
    body: patch,
    schema: TradeReviewSchema,
  })
}
