import { z } from 'zod'

export const QuoteItemSchema = z.object({
  symbol: z.string().optional(),
  contract_key: z.string().optional(),
  last: z.number().nullable(),
  bid: z.number().nullable(),
  ask: z.number().nullable(),
  mid: z.number().nullable().optional(),
  timestamp: z.number().nullable().optional(),
  ts: z.number().optional(),
  change: z.number().nullable().optional(),
  sec_type: z.string().nullable().optional(),
  expiry: z.string().nullable().optional(),
  strike: z.number().nullable().optional(),
  option_right: z.string().nullable().optional(),
}).passthrough()

export const QuotesResponseSchema = z.object({
  quotes: z.array(QuoteItemSchema),
}).passthrough()

export const WatchlistItemSchema = z.object({
  contract_key: z.string(),
  symbol: z.string(),
  sec_type: z.string(),
  optionable: z.boolean(),
  category: z.string().nullable(),
  category_id: z.number().nullable(),
  source: z.string(),
  created_at: z.number(),
}).passthrough()

export const WatchlistResponseSchema = z.object({
  items: z.array(WatchlistItemSchema),
}).passthrough()
