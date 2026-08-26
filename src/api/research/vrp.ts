/**
 * VRP (IV-RV Spread) API client — Wave RS-B-VRP2.
 *
 * Reaches `bifrost-research` Research API `:8795` via `researchEngineUrl()`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

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

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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

async function jsonOrThrow<T>(res: Response): Promise<Envelope<T>> {
  const j = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || j.ok === false) {
    const msg = j.error ?? j.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
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
