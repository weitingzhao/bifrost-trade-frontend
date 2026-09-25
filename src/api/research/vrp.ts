/**
 * VRP (IV-RV Spread) API client — Wave RS-B-VRP2.
 *
 * Reaches `bifrost-research` Research API `:8795` via `researchEngineUrl()`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import {
  EarningsMovesSchema,
  ResearchEnvelopeSchema,
  RvConeSchema,
} from '@/lib/schemas/research'
import { numOrNull } from '@/lib/researchParseHelpers'

export interface VrpRow {
  symbol: string
  trade_date: string | null
  rv_20d: number | null
  rv_60d: number | null
  rv_252d: number | null
  atm_iv_30d: number | null
  vrp_20d: number | null
  vrp_60d: number | null
  vrp_pct_252d: number | null
  fwd_ret_20d: number | null
  computed_at: string | null
}

export interface VrpExtremesResponse {
  rows: VrpRow[]
  count: number
  bucket: 'high' | 'low'
  limit: number
  as_of: string | null
}

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function parseRow(raw: unknown): VrpRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
  if (!symbol) return null
  return {
    symbol,
    trade_date: strOrNull(r.trade_date),
    rv_20d: numOrNull(r.rv_20d),
    rv_60d: numOrNull(r.rv_60d),
    rv_252d: numOrNull(r.rv_252d),
    atm_iv_30d: numOrNull(r.atm_iv_30d),
    vrp_20d: numOrNull(r.vrp_20d),
    vrp_60d: numOrNull(r.vrp_60d),
    vrp_pct_252d: numOrNull(r.vrp_pct_252d),
    fwd_ret_20d: numOrNull(r.fwd_ret_20d),
    computed_at: strOrNull(r.computed_at),
  }
}

const validateEnvelope = withValidation<{ ok: boolean; data?: unknown; error?: string | null }>(
  ResearchEnvelopeSchema,
  'research/vrp',
)

async function jsonOrThrow<T>(res: Response): Promise<Envelope<T>> {
  const j = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || j.ok === false) {
    const msg = j.error ?? j.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  // Envelope-level check only — payload shapes vary per endpoint and are
  // deliberately validated at their own call sites where useful.
  validateEnvelope(j)
  return j
}

export async function fetchVrpLatest(symbol: string): Promise<VrpRow | null> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return null
  const q = new URLSearchParams({ symbol: sym })
  const res = await fetch(`${researchEngineUrl('/research/vrp/latest')}?${q.toString()}`)
  const env = await jsonOrThrow<{ row: unknown; symbol: string }>(res)
  return parseRow(env.data?.row)
}

export async function fetchVrpHistory(symbol: string, days = 252): Promise<VrpRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({ symbol: sym, days: String(Math.max(1, Math.min(days, 5000))) })
  const res = await fetch(`${researchEngineUrl('/research/vrp/history')}?${q.toString()}`)
  const env = await jsonOrThrow<{ rows: unknown[]; count: number }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  return raw.map(parseRow).filter((r): r is VrpRow => r !== null)
}

export async function fetchVrpExtremes(
  bucket: 'high' | 'low',
  limit = 20,
): Promise<VrpExtremesResponse> {
  const q = new URLSearchParams({
    bucket,
    limit: String(Math.max(1, Math.min(limit, 200))),
  })
  const res = await fetch(`${researchEngineUrl('/research/vrp/extremes')}?${q.toString()}`)
  const env = await jsonOrThrow<{
    rows: unknown[]
    count: number
    bucket: 'high' | 'low'
    limit: number
    as_of: string | null
  }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  const rows = raw.map(parseRow).filter((r): r is VrpRow => r !== null)
  return {
    rows,
    count: rows.length,
    bucket: env.data?.bucket ?? bucket,
    limit: env.data?.limit ?? limit,
    as_of: env.data?.as_of ?? null,
  }
}

/** One horizon of the realised-vol cone. Vol as a fraction, like the rest of this module. */
export interface RvConeTenor {
  days: number
  /** Overlapping windows the percentiles were taken over. */
  n: number
  p05: number | null
  p20: number | null
  p50: number | null
  p80: number | null
  p95: number | null
  /** Today's realised vol over this horizon. */
  current: number | null
}

export interface RvCone {
  as_of: string | null
  symbol: string
  years: number
  /** Daily closes behind the cone. */
  sessions: number
  tenors: RvConeTenor[]
}

const validateRvCone = withValidation<RvCone>(RvConeSchema, 'research/analytics/vol/rv-cone')

/**
 * Realised vol by horizon, as percentiles over overlapping windows (R9 F4).
 *
 * The schema was written with the route and nothing read it until History
 * (2026-09-23), which draws the design's vol cone from it.
 */
export async function fetchRvCone(symbol: string, years = 2): Promise<RvCone | null> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return null
  const q = new URLSearchParams({ symbol: sym, years: String(years) })
  const res = await fetch(`${researchEngineUrl('/analytics/vol/rv-cone')}?${q.toString()}`)
  const env = await jsonOrThrow<unknown>(res)
  return validateRvCone(env.data) as RvCone
}

/** One print. Moves are fractions of the close; ``crush_pts`` is in vol points. */
export interface EarningsPrint {
  /** The 8-K's filing date — a date, not a time: before the open or after the close. */
  filed: string
  /** Last session before the filing and first session after it: the window read. */
  before: string | null
  after: string | null
  /** The larger single-session move in the window, unsigned; the sign is ``direction``. */
  actual: number | null
  direction: 'up' | 'down' | 'flat' | null
  /** The ATM straddle for ``expiry`` as of ``before``, over that close. */
  priced: number | null
  ratio: number | null
  crush_pts: number | null
  expiry: string | null
  /** The first expiry both sessions price — often not the front weekly. */
  crush_expiry: string | null
  /** Why a row could not be priced or measured. */
  missing: string | null
}

/** An Item 2.02 filing that says nothing about results, set aside (research 0.123.0). */
export interface EarningsSetAside {
  filed: string
  /** The results release that followed; null when none has yet and the name has the habit. */
  release: string | null
  reason: string
}

export interface EarningsMoves {
  symbol: string
  /** Days with any 8-K on file — zero means the name is outside what the plugin collects. */
  filing_days: number
  /** Newest first. */
  prints: EarningsPrint[]
  /** Prints holding both sides. */
  n: number
  median_ratio: number | null
  /** Prints where the move came in under what the straddle charged. */
  rich: number
  /** Absent before research 0.123.0. */
  set_aside?: EarningsSetAside[]
}

const validateEarningsMoves = withValidation<EarningsMoves>(EarningsMovesSchema, 'research/analytics/vol/earnings-moves')

/** What the straddle priced before each of the name's last ``limit`` prints, and what came. */
export async function fetchEarningsMoves(symbol: string, limit = 8): Promise<EarningsMoves | null> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return null
  const q = new URLSearchParams({ symbol: sym, limit: String(limit) })
  const res = await fetch(`${researchEngineUrl('/analytics/vol/earnings-moves')}?${q.toString()}`)
  const env = await jsonOrThrow<unknown>(res)
  return validateEarningsMoves(env.data) as EarningsMoves
}
