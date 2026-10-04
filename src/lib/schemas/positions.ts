import { z } from 'zod'

export const FillSplitSchema = z.object({
  trade_id: z.number(),
  quantity: z.number(),
  strategy_opportunity_id: z.number().nullable().optional(),
  trade_label: z.string().nullable().optional(),
  strategy_opportunity_name: z.string().nullable().optional(),
})

/** Per-instance split of one execution (multi-instance allocation bridge). */
export type FillSplit = z.infer<typeof FillSplitSchema>

/**
 * One row of core `get_executions` — `/executions` and the positions exec lists
 * both carry this shape (the strategy-link candidate reader that shared its SELECT
 * went with `GET /executions/link-candidates`, api 0.7.6, TD-40).
 *
 * - `quantity` is signed (sells negative) in every scope except `tws_raw`,
 *   which passes the stored magnitude through and leaves direction in `side`.
 * - `side` is the broker's spelling: BUY / BOT / B or SELL / SLD / S. Read it
 *   through `isBuySide` / `isSellSide`, never by comparing one literal.
 * - Options carry `option_right`, `strike`, `expiry`; stock rows send them null.
 */
const ExecutionRowSchema = z.object({
  account_executions_id: z.number().nullable(),
  account_id: z.string(),
  contract_key: z.string(),
  symbol: z.string(),
  sec_type: z.string(),
  side: z.string(),
  quantity: z.number(),
  price: z.number(),
  time: z.number().nullable(),
  option_right: z.string().nullable().optional(),
  strike: z.number().nullable().optional(),
  expiry: z.string().nullable().optional(),
  trade_date: z.string().nullable().optional(),
  report_date: z.string().nullable().optional(),
  exec_id: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  /** Flex booking class. Empty on TWS and journal rows — they stay in Type = All. */
  transaction_type: z.string().nullable().optional(),
  commission: z.number().nullable().optional(),
  realized_pnl: z.number().nullable().optional(),
  net_cash: z.number().nullable().optional(),
  taxes: z.number().nullable().optional(),
  trade_id: z.number().nullable().optional(),
  strategy_opportunity_id: z.number().nullable().optional(),
  strategy_opportunity_name: z.string().nullable().optional(),
  trade_label: z.string().nullable().optional(),
  fill_splits: z.array(FillSplitSchema).optional(),
})

export const ExecutionSchema = ExecutionRowSchema.passthrough()

/**
 * Typed from the row shape, not from `ExecutionSchema`: passthrough adds an
 * `unknown` index signature, which would let a misspelt field (the old `qty`)
 * type-check again.
 */
export type ExecutionRow = z.infer<typeof ExecutionRowSchema>

/**
 * What `/executions` actually sends — validated before the FE unwraps it. The list
 * is `items` (api 0.4.0 dropped the old `executions` key); a body without it is
 * drift, not an empty book.
 */
export const ExecutionsWireSchema = z
  .object({
    items: z.array(ExecutionSchema),
  })
  .passthrough()

export type ExecutionsWire = { items: ExecutionRow[] }
