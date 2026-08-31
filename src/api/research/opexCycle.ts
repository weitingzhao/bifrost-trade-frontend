/**
 * OpEx Cycle API client — Wave RS-B-OpEx2.
 *
 * Talks to `bifrost-research` Research API `:8795`
 * via `researchEngineUrl()`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'
import { numOrNull } from '@/lib/researchParseHelpers'

export interface OpexDailyRow {
  symbol: string
  trade_date: string | null
  spot: number | null
  total_vanna: number | null
  total_charm: number | null
  vanna_zero_strike: number | null
  charm_zero_strike: number | null
  dte_to_opex: number | null
  is_opex_week: boolean | null
  computed_at: string | null
  next_opex_date?: string | null
  dte_to_opex_today?: number | null
  is_opex_week_today?: boolean | null
}

export interface OpexStrikeRow {
  strike: number | null
  call_oi: number | null
  put_oi: number | null
  call_gex: number | null
  put_gex: number | null
  net_gex: number | null
}

export interface OpexCurrentResponse {
  row: OpexDailyRow | null
  strike_map: OpexStrikeRow[]
  symbol: string
  trade_date: string | null
  next_opex_date: string | null
  dte_to_opex_today: number
  is_opex_week_today: boolean
}

export interface OpexHistoryRow extends OpexDailyRow {
  opex_date: string | null
}

export interface OpexPinRow {
  opex_date: string | null
  expiry: string | null
  max_pain_strike: number | null
  settle_close: number | null
  distance: number | null
  pct_distance: number | null
  total_oi: number | null
}

export interface OpexPinAnalysisResponse {
  rows: OpexPinRow[]
  count: number
  symbol: string
  cycles_requested: number
  pin_rate: number | null
}

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

function strOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function boolOrNull(v: unknown): boolean | null {
  if (v == null) return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1'
  return Boolean(v)
}

function parseDaily(raw: unknown): OpexDailyRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const symbol = typeof r.symbol === 'string' ? r.symbol.trim().toUpperCase() : ''
  if (!symbol) return null
  return {
    symbol,
    trade_date: strOrNull(r.trade_date),
    spot: numOrNull(r.spot),
    total_vanna: numOrNull(r.total_vanna),
    total_charm: numOrNull(r.total_charm),
    vanna_zero_strike: numOrNull(r.vanna_zero_strike),
    charm_zero_strike: numOrNull(r.charm_zero_strike),
    dte_to_opex: numOrNull(r.dte_to_opex),
    is_opex_week: boolOrNull(r.is_opex_week),
    computed_at: strOrNull(r.computed_at),
    next_opex_date: strOrNull(r.next_opex_date),
    dte_to_opex_today: numOrNull(r.dte_to_opex_today),
    is_opex_week_today: boolOrNull(r.is_opex_week_today),
  }
}

function parseHistory(raw: unknown): OpexHistoryRow | null {
  const base = parseDaily(raw)
  if (!base) return null
  const r = raw as Record<string, unknown>
  return { ...base, opex_date: strOrNull(r.opex_date) }
}

function parseStrike(raw: unknown): OpexStrikeRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    strike: numOrNull(r.strike),
    call_oi: numOrNull(r.call_oi),
    put_oi: numOrNull(r.put_oi),
    call_gex: numOrNull(r.call_gex),
    put_gex: numOrNull(r.put_gex),
    net_gex: numOrNull(r.net_gex),
  }
}

function parsePin(raw: unknown): OpexPinRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  return {
    opex_date: strOrNull(r.opex_date),
    expiry: strOrNull(r.expiry),
    max_pain_strike: numOrNull(r.max_pain_strike),
    settle_close: numOrNull(r.settle_close),
    distance: numOrNull(r.distance),
    pct_distance: numOrNull(r.pct_distance),
    total_oi: numOrNull(r.total_oi),
  }
}

const validateEnvelope = withValidation<{ ok: boolean; data?: unknown; error?: string | null }>(
  ResearchEnvelopeSchema,
  'research/opex-cycle',
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

export async function fetchOpexCurrent(
  symbol: string,
  tradeDate?: string,
  includeMap = true,
): Promise<OpexCurrentResponse> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) {
    return {
      row: null,
      strike_map: [],
      symbol: '',
      trade_date: null,
      next_opex_date: null,
      dte_to_opex_today: 0,
      is_opex_week_today: false,
    }
  }
  const q = new URLSearchParams({ symbol: sym, include_map: includeMap ? 'true' : 'false' })
  if (tradeDate) q.set('trade_date', tradeDate)
  const res = await fetch(`${researchEngineUrl('/research/opex-cycle/current')}?${q.toString()}`)
  const env = await jsonOrThrow<{
    row: unknown
    strike_map: unknown[]
    symbol: string
    trade_date: string | null
    next_opex_date: string | null
    dte_to_opex_today: number
    is_opex_week_today: boolean
  }>(res)
  const rawStrikes = Array.isArray(env.data?.strike_map) ? env.data.strike_map : []
  return {
    row: parseDaily(env.data?.row),
    strike_map: rawStrikes.map(parseStrike).filter((r): r is OpexStrikeRow => r !== null),
    symbol: env.data?.symbol ?? sym,
    trade_date: env.data?.trade_date ?? null,
    next_opex_date: env.data?.next_opex_date ?? null,
    dte_to_opex_today: Number(env.data?.dte_to_opex_today ?? 0),
    is_opex_week_today: Boolean(env.data?.is_opex_week_today ?? false),
  }
}

export async function fetchOpexHistory(
  symbol: string,
  cycles = 12,
): Promise<OpexHistoryRow[]> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) return []
  const q = new URLSearchParams({
    symbol: sym,
    cycles: String(Math.max(1, Math.min(cycles, 60))),
  })
  const res = await fetch(`${researchEngineUrl('/research/opex-cycle/history')}?${q.toString()}`)
  const env = await jsonOrThrow<{ rows: unknown[]; count: number }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  return raw.map(parseHistory).filter((r): r is OpexHistoryRow => r !== null)
}

export async function fetchOpexPinAnalysis(
  symbol: string,
  cycles = 24,
): Promise<OpexPinAnalysisResponse> {
  const sym = (symbol || '').trim().toUpperCase()
  if (!sym) {
    return { rows: [], count: 0, symbol: '', cycles_requested: cycles, pin_rate: null }
  }
  const q = new URLSearchParams({
    symbol: sym,
    cycles: String(Math.max(1, Math.min(cycles, 60))),
  })
  const res = await fetch(
    `${researchEngineUrl('/research/opex-cycle/pin-analysis')}?${q.toString()}`,
  )
  const env = await jsonOrThrow<{
    rows: unknown[]
    count: number
    symbol: string
    cycles_requested: number
    pin_rate: number | null
  }>(res)
  const raw = Array.isArray(env.data?.rows) ? env.data.rows : []
  const rows = raw.map(parsePin).filter((r): r is OpexPinRow => r !== null)
  return {
    rows,
    count: rows.length,
    symbol: env.data?.symbol ?? sym,
    cycles_requested: env.data?.cycles_requested ?? cycles,
    pin_rate: numOrNull(env.data?.pin_rate),
  }
}
