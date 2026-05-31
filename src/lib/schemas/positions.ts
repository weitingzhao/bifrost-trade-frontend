import { z } from 'zod'

// Side values from backend can vary ('Buy'/'Sell' in TypeScript types but
// the legacy API may send 'BOT'/'SLD' etc — keep as loose string).
export const ExecutionSchema = z.object({
  account_executions_id: z.number().nullable(),
  account_id: z.string(),
  contract_key: z.string(),
  symbol: z.string(),
  sec_type: z.string(),
  side: z.string(),
  qty: z.number(),
  price: z.number(),
  time: z.number().nullable(),
  trade_date: z.string().nullable().optional(),
  commission: z.number().nullable().optional(),
  realized_pnl: z.number().nullable().optional(),
  net_cash: z.number().nullable().optional(),
  option_right: z.string().nullable().optional(),
  strike: z.number().optional(),
  expiry: z.string().optional(),
  strategy_instance_id: z.number().nullable().optional(),
  strategy_opportunity_id: z.number().nullable().optional(),
}).passthrough()

export const ExecutionsResponseSchema = z.object({
  items: z.array(ExecutionSchema),
}).passthrough()
