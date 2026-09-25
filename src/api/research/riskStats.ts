/**
 * Beta against a benchmark, and the correlation matrix — read from Research.
 *
 * Owner decision, 2026-09-17: β and correlation are Research's to compute and
 * this side only reads them. Two pages computing one β would disagree
 * eventually, and the inputs are five years of daily closes that live in the
 * Golden Source, not here.
 *
 * Research computes these on request rather than from a nightly table (its own
 * choice, recorded in `api/risk_stats.py`), so every answer carries `as_of` —
 * the last bar that took part — and every reading carries the `n` it rests on.
 * A window filled under `min_fill` comes back `null` with its `n` instead of a
 * number; the page must print that as no reading, never as zero.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { RiskBetaResponseSchema, RiskCorrelationResponseSchema } from '@/lib/schemas/researchData'

export interface RiskBetaItem {
  symbol: string
  window: number
  beta: number | null
  n: number
}

export interface RiskBetaResponse {
  as_of: string | null
  benchmark: string
  min_fill: number
  items: RiskBetaItem[]
}

export interface RiskCorrelationCell {
  rho: number | null
  n: number
}

export interface RiskCorrelationResponse {
  as_of: string | null
  window: number
  min_fill: number
  symbols: string[]
  matrix: Record<string, Record<string, RiskCorrelationCell>>
}

const validateBeta = withValidation<RiskBetaResponse>(RiskBetaResponseSchema, 'research/risk/beta')
const validateCorrelation = withValidation<RiskCorrelationResponse>(
  RiskCorrelationResponseSchema,
  'research/risk/correlation',
)

/** Research wraps every answer as `{ ok, data }`; an `ok: false` is an error, not an empty reading. */
async function readEnvelope(url: string, what: string): Promise<unknown> {
  const r = await fetch(url)
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; data?: unknown; error?: unknown }
  if (!r.ok || j.ok === false) {
    throw new Error(`research ${what}: ${r.status}${j.error ? ` — ${String(j.error)}` : ''}`)
  }
  return j.data
}

export async function fetchRiskBeta(
  symbols: readonly string[],
  benchmark = 'SPY',
  windows: readonly number[] = [60, 252],
): Promise<RiskBetaResponse | null> {
  const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  if (list.length === 0) return null
  const q = new URLSearchParams({
    symbols: list.join(','),
    benchmark,
    windows: windows.join(','),
  })
  const data = await readEnvelope(`${researchEngineUrl('/analytics/risk/beta')}?${q}`, '/risk/beta')
  return validateBeta(data) as RiskBetaResponse
}

/**
 * The pairwise correlation matrix. ``asOf`` (research 0.124.0) reads it as it
 * stood at that date's close; the answer's ``as_of`` names the session it
 * actually rests on, which on a holiday is the one before.
 */
export async function fetchRiskCorrelation(
  symbols: readonly string[],
  window = 60,
  asOf?: string,
): Promise<RiskCorrelationResponse | null> {
  const list = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  // A correlation matrix of one name is the number 1; not worth a request.
  if (list.length < 2) return null
  const q = new URLSearchParams({ symbols: list.join(','), window: String(window) })
  if (asOf) q.set('as_of', asOf)
  const data = await readEnvelope(
    `${researchEngineUrl('/analytics/risk/correlation')}?${q}`,
    '/risk/correlation',
  )
  return validateCorrelation(data) as RiskCorrelationResponse
}
