import { massiveUrl } from '@/lib/devApiUrl'
import type { TickerReferenceSearchRow } from '@/types/tickerReference'

export async function fetchTickerReferenceSearch(opts: {
  q: string
  limit?: number
}): Promise<{
  ok: boolean
  results?: TickerReferenceSearchRow[]
  cached?: boolean
  error?: string
}> {
  const q = new URLSearchParams()
  q.set('q', opts.q)
  if (opts.limit != null) q.set('limit', String(opts.limit))
  try {
    const r = await fetch(massiveUrl(`/research/massive/reference/tickers/search?${q.toString()}`))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) {
      return { ok: false, error: String(j.error ?? r.statusText) }
    }
    return {
      ok: true,
      cached: Boolean(j.cached),
      results: (j.results as TickerReferenceSearchRow[]) ?? [],
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceOverviewCoverage(): Promise<{
  ok: boolean
  total_tickers?: number
  missing?: number
  filled?: number
  error?: string
}> {
  try {
    const r = await fetch(massiveUrl('/research/massive/reference/tickers/overview-coverage'))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    return {
      ok: true,
      total_tickers: typeof j.total_tickers === 'number' ? j.total_tickers : Number(j.total_tickers),
      missing: typeof j.missing === 'number' ? j.missing : Number(j.missing),
      filled: typeof j.filled === 'number' ? j.filled : Number(j.filled),
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceUniverseCount(): Promise<{
  ok: boolean
  total_tickers?: number
  error?: string
}> {
  try {
    const r = await fetch(massiveUrl('/research/massive/reference/tickers/universe-count'))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    const n = j.total_tickers
    return { ok: true, total_tickers: typeof n === 'number' ? n : Number(n) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceTickerTypesRowCount(): Promise<{
  ok: boolean
  total_ticker_types?: number
  error?: string
}> {
  try {
    const r = await fetch(massiveUrl('/research/massive/reference/ticker-types/count'))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    const n = j.total_ticker_types
    return { ok: true, total_ticker_types: typeof n === 'number' ? n : Number(n) }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceMissingOverview(opts: {
  limit?: number
  offset?: number
}): Promise<{
  ok: boolean
  tickers?: string[]
  limit?: number
  offset?: number
  total_missing?: number
  has_more?: boolean
  error?: string
}> {
  const q = new URLSearchParams()
  if (opts.limit != null) q.set('limit', String(opts.limit))
  if (opts.offset != null) q.set('offset', String(opts.offset))
  try {
    const r = await fetch(massiveUrl(`/research/massive/reference/tickers/missing-overview?${q.toString()}`))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    const tickers = j.tickers
    return {
      ok: true,
      tickers: Array.isArray(tickers) ? (tickers as string[]) : [],
      limit: typeof j.limit === 'number' ? j.limit : Number(j.limit),
      offset: typeof j.offset === 'number' ? j.offset : Number(j.offset),
      total_missing: typeof j.total_missing === 'number' ? j.total_missing : Number(j.total_missing),
      has_more: Boolean(j.has_more),
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceRelatedCoverage(): Promise<{
  ok: boolean
  total_tickers?: number
  missing?: number
  filled?: number
  error?: string
}> {
  try {
    const r = await fetch(massiveUrl('/research/massive/reference/tickers/related-coverage'))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    return {
      ok: true,
      total_tickers: typeof j.total_tickers === 'number' ? j.total_tickers : Number(j.total_tickers),
      missing: typeof j.missing === 'number' ? j.missing : Number(j.missing),
      filled: typeof j.filled === 'number' ? j.filled : Number(j.filled),
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceMissingRelated(opts: {
  limit?: number
  offset?: number
}): Promise<{
  ok: boolean
  tickers?: string[]
  total_missing?: number
  has_more?: boolean
  error?: string
}> {
  const q = new URLSearchParams()
  if (opts.limit != null) q.set('limit', String(opts.limit))
  if (opts.offset != null) q.set('offset', String(opts.offset))
  try {
    const r = await fetch(massiveUrl(`/research/massive/reference/tickers/missing-related?${q.toString()}`))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    return {
      ok: true,
      tickers: Array.isArray(j.tickers) ? (j.tickers as string[]) : [],
      total_missing: typeof j.total_missing === 'number' ? j.total_missing : Number(j.total_missing),
      has_more: Boolean(j.has_more),
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceFilledRelated(opts: {
  limit?: number
  offset?: number
}): Promise<{
  ok: boolean
  tickers?: string[]
  total_filled?: number
  has_more?: boolean
  error?: string
}> {
  const q = new URLSearchParams()
  if (opts.limit != null) q.set('limit', String(opts.limit))
  if (opts.offset != null) q.set('offset', String(opts.offset))
  try {
    const r = await fetch(massiveUrl(`/research/massive/reference/tickers/filled-related?${q.toString()}`))
    const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
    if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
    return {
      ok: true,
      tickers: Array.isArray(j.tickers) ? (j.tickers as string[]) : [],
      total_filled: typeof j.total_filled === 'number' ? j.total_filled : Number(j.total_filled),
      has_more: Boolean(j.has_more),
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchTickerReferenceDetail(symbol: string): Promise<{
  ok: boolean
  ticker?: Record<string, unknown>
  cached?: boolean
  error?: string
}> {
  const r = await fetch(
    massiveUrl(`/research/massive/reference/tickers/${encodeURIComponent(symbol.trim())}`),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
  return {
    ok: true,
    cached: Boolean(j.cached),
    ticker: typeof j.ticker === 'object' && j.ticker != null ? (j.ticker as Record<string, unknown>) : undefined,
  }
}

export async function fetchTickerReferenceRelated(symbol: string): Promise<{
  ok: boolean
  data?: Record<string, unknown>
  cached?: boolean
  error?: string
}> {
  const r = await fetch(
    massiveUrl(`/research/massive/reference/tickers/${encodeURIComponent(symbol.trim())}/related`),
  )
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
  return {
    ok: true,
    cached: Boolean(j.cached),
    data: typeof j.data === 'object' && j.data != null ? (j.data as Record<string, unknown>) : undefined,
  }
}

export async function fetchTickerTypesFromDb(opts?: {
  asset_class?: string
  locale?: string
}): Promise<{
  ok: boolean
  results?: Record<string, unknown>[]
  cached?: boolean
  error?: string
}> {
  const q = new URLSearchParams()
  q.set('asset_class', opts?.asset_class ?? '*')
  q.set('locale', opts?.locale ?? '*')
  const r = await fetch(massiveUrl(`/research/massive/reference/ticker-types?${q.toString()}`))
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>
  if (!j.ok) return { ok: false, error: String(j.error ?? r.statusText) }
  const rows = j.results
  return {
    ok: true,
    cached: Boolean(j.cached),
    results: Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [],
  }
}
