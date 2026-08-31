/**
 * Vol Surface (SVI) API client — Wave RS-B-Surface2.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'
import { numOrNull } from '@/lib/researchParseHelpers'

export interface VolSurfaceFitRow {
  symbol: string
  trade_date: string | null
  expiry: string | null
  dte: number | null
  svi_a: number | null
  svi_b: number | null
  svi_rho: number | null
  svi_m: number | null
  svi_sigma: number | null
  atm_vol: number | null
  atm_slope: number | null
  fit_rmse: number | null
  n_points: number | null
  computed_at: string | null
}

export interface TermStructurePoint {
  expiry: string | null
  dte: number | null
  atm_vol: number | null
  atm_slope: number | null
  fit_rmse: number | null
  n_points: number | null
}

export interface VolSurfaceResidualRow {
  symbol: string
  trade_date: string | null
  expiry: string | null
  strike: number | null
  log_moneyness: number | null
  iv_market: number | null
  iv_fitted: number | null
  residual: number | null
  residual_z: number | null
  computed_at: string | null
}

export type SkewExtremeRow = VolSurfaceFitRow

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function parseFit(raw: unknown): VolSurfaceFitRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
  if (!symbol) return null
  return {
    symbol,
    trade_date: strOrNull(r.trade_date),
    expiry: strOrNull(r.expiry),
    dte: numOrNull(r.dte),
    svi_a: numOrNull(r.svi_a),
    svi_b: numOrNull(r.svi_b),
    svi_rho: numOrNull(r.svi_rho),
    svi_m: numOrNull(r.svi_m),
    svi_sigma: numOrNull(r.svi_sigma),
    atm_vol: numOrNull(r.atm_vol),
    atm_slope: numOrNull(r.atm_slope),
    fit_rmse: numOrNull(r.fit_rmse),
    n_points: numOrNull(r.n_points),
    computed_at: strOrNull(r.computed_at),
  }
}

function parseTermPoint(raw: unknown): TermStructurePoint | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    expiry: strOrNull(r.expiry),
    dte: numOrNull(r.dte),
    atm_vol: numOrNull(r.atm_vol),
    atm_slope: numOrNull(r.atm_slope),
    fit_rmse: numOrNull(r.fit_rmse),
    n_points: numOrNull(r.n_points),
  }
}

function parseResidual(raw: unknown): VolSurfaceResidualRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
  if (!symbol) return null
  return {
    symbol,
    trade_date: strOrNull(r.trade_date),
    expiry: strOrNull(r.expiry),
    strike: numOrNull(r.strike),
    log_moneyness: numOrNull(r.log_moneyness),
    iv_market: numOrNull(r.iv_market),
    iv_fitted: numOrNull(r.iv_fitted),
    residual: numOrNull(r.residual),
    residual_z: numOrNull(r.residual_z),
    computed_at: strOrNull(r.computed_at),
  }
}

const validateEnvelope = withValidation<{ ok: boolean; data?: unknown; error?: string | null }>(
  ResearchEnvelopeSchema,
  'research/vol-surface',
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

export async function fetchVolSurfaceFit(
  symbol: string,
  tradeDate?: string,
): Promise<VolSurfaceFitRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({ symbol: sym })
  if (tradeDate) q.set('trade_date', tradeDate)
  const res = await fetch(`${researchEngineUrl('/research/vol-surface/fit')}?${q.toString()}`)
  const env = await jsonOrThrow<{ rows: unknown[]; count: number }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  return raw.map(parseFit).filter((r): r is VolSurfaceFitRow => r !== null)
}

export async function fetchTermStructure(
  symbol: string,
  tradeDate?: string,
): Promise<TermStructurePoint[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({ symbol: sym })
  if (tradeDate) q.set('trade_date', tradeDate)
  const res = await fetch(
    `${researchEngineUrl('/research/vol-surface/term-structure')}?${q.toString()}`,
  )
  const env = await jsonOrThrow<{ rows: unknown[]; count: number }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  return raw.map(parseTermPoint).filter((r): r is TermStructurePoint => r !== null)
}

export async function fetchResiduals(
  symbol: string,
  expiry: string,
  tradeDate?: string,
): Promise<VolSurfaceResidualRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  const exp = (expiry || '').trim()
  if (!sym || !exp) return []
  const q = new URLSearchParams({ symbol: sym, expiry: exp })
  if (tradeDate) q.set('trade_date', tradeDate)
  const res = await fetch(
    `${researchEngineUrl('/research/vol-surface/residuals')}?${q.toString()}`,
  )
  const env = await jsonOrThrow<{ rows: unknown[]; count: number }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  return raw.map(parseResidual).filter((r): r is VolSurfaceResidualRow => r !== null)
}

export interface SkewExtremesResponse {
  rows: SkewExtremeRow[]
  count: number
  limit: number
  as_of: string | null
}

export async function fetchSkewExtremes(limit = 20): Promise<SkewExtremesResponse> {
  const q = new URLSearchParams({ limit: String(Math.max(1, Math.min(limit, 200))) })
  const res = await fetch(
    `${researchEngineUrl('/research/vol-surface/skew-extremes')}?${q.toString()}`,
  )
  const env = await jsonOrThrow<{
    rows: unknown[]
    count: number
    limit: number
    as_of: string | null
  }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  const rows = raw.map(parseFit).filter((r): r is SkewExtremeRow => r !== null)
  return {
    rows,
    count: rows.length,
    limit: env.data?.limit ?? limit,
    as_of: env.data?.as_of ?? null,
  }
}
