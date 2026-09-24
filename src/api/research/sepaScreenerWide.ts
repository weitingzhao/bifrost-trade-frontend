/**
 * The SEPA screener wide read — `dw_stock.mart_sepa_screener_wide` whole, one
 * row per evaluated symbol with every condition boolean by name. This is the
 * table the authoring face's filter vocabulary is defined against; the
 * `/sepa/model/daily` read serves committed grade/path/iv for its top 1000
 * only, so the universe-wide face reads here and re-applies the dbt case
 * rules (verified against the model store — see labScreenerModel).
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { SepaScreenerWideSchema } from '@/lib/schemas/research'
import { numOrNull } from '@/lib/researchParseHelpers'

export interface SepaWideRow {
  symbol: string
  eval_date: string | null
  overall_rank: number
  /** 0–1, the mart's own scale. */
  composite_score: number
  tech_pass_count: number
  fund_pass_count: number
  company_name: string | null
  primary_exchange: string | null
  latest_close: number | null
  sma_50: number | null
  crs_percentile: number | null
  return_252d: number | null
  /** All 19 condition booleans by mart column name; null = not evaluated. */
  conditions: Record<string, boolean | null>
}

export interface SepaScreenerWideResponse {
  rows: SepaWideRow[]
  count: number
  evalDate: string | null
}

const CONDITION_KEYS = [
  'price_gt_sma200',
  'sma150_gt_sma200',
  'price_gt_sma150',
  'sma50_gt_sma200',
  'avg_volume_50_gt_threshold',
  'close_ge_low52_x_1_3',
  'sma50_gt_sma150',
  'price_gt_sma50',
  'sma200_rising_1m',
  'close_ge_high52_x_0_75',
  'crs_ge_70',
  'eps_3y_ge_15pct',
  'rev_3y_ge_15pct',
  'eps_q2q_ge_25pct',
  'rev_q2q_ge_25pct',
  'eps_acc_fy',
  'rev_acc_fy',
  'eps_acc_2q',
  'rev_acc_2q',
] as const

const validate = withValidation<{ ok: boolean; count: number; rows: unknown[] }>(
  SepaScreenerWideSchema,
  'research/sepa-screener-wide',
)

function boolOrNull(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}

export async function fetchSepaScreenerWide(
  limit = 5000,
  symbols?: readonly string[],
): Promise<SepaScreenerWideResponse> {
  const q = new URLSearchParams({ limit: String(limit) })
  if (symbols && symbols.length > 0) q.set('symbols', symbols.join(','))
  const res = await fetch(researchEngineUrl(`/analytics/sepa/screener-wide?${q}`))
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`sepa screener-wide ${res.status}: ${text.slice(0, 200)}`)
  }
  const env = validate(await res.json())
  const rows: SepaWideRow[] = []
  for (const raw of env.rows) {
    const r = raw as Record<string, unknown>
    const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
    const rank = numOrNull(r.overall_rank)
    const comp = numOrNull(r.composite_score)
    if (!symbol || rank == null || comp == null) continue
    const conditions: Record<string, boolean | null> = {}
    for (const k of CONDITION_KEYS) conditions[k] = boolOrNull(r[k])
    rows.push({
      symbol,
      eval_date: typeof r.eval_date === 'string' ? r.eval_date : null,
      overall_rank: rank,
      composite_score: comp,
      tech_pass_count: numOrNull(r.tech_pass_count) ?? 0,
      fund_pass_count: numOrNull(r.fund_pass_count) ?? 0,
      company_name: typeof r.company_name === 'string' ? r.company_name : null,
      primary_exchange: typeof r.primary_exchange === 'string' ? r.primary_exchange : null,
      latest_close: numOrNull(r.latest_close),
      sma_50: numOrNull(r.sma_50),
      crs_percentile: numOrNull(r.crs_percentile),
      return_252d: numOrNull(r.return_252d),
      conditions,
    })
  }
  return { rows, count: env.count, evalDate: rows[0]?.eval_date ?? null }
}
