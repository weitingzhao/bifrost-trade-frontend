import { withValidation } from '@/lib/apiValidation'
import {
  SepaCriteriaStatsSchema,
  SymbolsReadinessSnapshotSchema,
} from '@/lib/schemas/stockScreener'
import type {
  FundamentalFilterResponse,
  FundDistSymbolsResponse,
  MomentumFilterResponse,
  SepaCriteriaStats,
  SymbolsReadinessSnapshotResponse,
  TechnicalFilterResponse,
  TechDistSymbolsResponse,
  TierFilterResponse,
} from '@/types/stockScreener'

const BASE = import.meta.env.VITE_API_RESEARCH as string

const EMPTY_CRITERIA: SepaCriteriaStats = {
  ok: false,
  universe_count: 0,
  computed_at: '',
  fundamental: { cached_count: 0, fund_pass_count: 0, no_data_count: 0, conditions: [] },
  technical: {
    total_in_snapshot: 0,
    price_ready_count: 0,
    fund_cached_count: 0,
    both_ready: 0,
    bars_ge_252: 0,
    bars_ge_240: 0,
    bars_ge_200: 0,
    bars_lt_200: 0,
    no_bars: 0,
    failure_reasons: [],
    tech_cached_count: 0,
    tech_pass_count: 0,
    tech_insufficient_count: 0,
    conditions: [],
  },
}

async function fetchJson<T>(url: string, timeoutMs: number, fallback: T): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, { method: 'GET', signal: controller.signal })
    const j = await r.json().catch(() => ({})) as Record<string, unknown>
    if (!r.ok) {
      const msg = typeof j.detail === 'string' ? j.detail : (typeof j.error === 'string' ? j.error : `HTTP ${r.status}`)
      return { ...fallback, ok: false, error: msg } as T
    }
    return j as T
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return { ...fallback, ok: false, error: msg } as T
  } finally {
    clearTimeout(timer)
  }
}

const validateCriteriaStats = withValidation<SepaCriteriaStats>(
  SepaCriteriaStatsSchema,
  'research/data/readiness/criteria-stats',
)

const validateSnapshot = withValidation<SymbolsReadinessSnapshotResponse>(
  SymbolsReadinessSnapshotSchema,
  'research/data/readiness/symbols-snapshot',
)

export async function fetchSepaCriteriaStats(): Promise<SepaCriteriaStats> {
  const data = await fetchJson(`${BASE}/research/data/readiness/criteria-stats`, 60_000, EMPTY_CRITERIA)
  if (!data.ok) throw new Error(data.error ?? 'Failed to load criteria stats')
  return validateCriteriaStats(data)
}

export async function fetchFundamentalDistributionSymbols(
  conditionsPassed: number,
): Promise<FundDistSymbolsResponse> {
  const fallback: FundDistSymbolsResponse = {
    ok: false,
    conditions_passed: conditionsPassed,
    count: 0,
    symbols: [],
  }
  return fetchJson(
    `${BASE}/research/data/readiness/fundamental-distribution/symbols?conditions_passed=${conditionsPassed}`,
    20_000,
    fallback,
  )
}

export async function fetchTechnicalDistributionSymbols(
  conditionsPassed: number,
): Promise<TechDistSymbolsResponse> {
  const fallback: TechDistSymbolsResponse = {
    ok: false,
    conditions_passed: conditionsPassed,
    count: 0,
    symbols: [],
  }
  return fetchJson(
    `${BASE}/research/data/readiness/technical-distribution/symbols?conditions_passed=${conditionsPassed}`,
    20_000,
    fallback,
  )
}

export async function fetchFundamentalFilter(opts: {
  include: string[]
  limit?: number
}): Promise<FundamentalFilterResponse> {
  const include = (opts.include ?? []).map((s) => s.trim()).filter(Boolean)
  if (include.length === 0) {
    return { ok: true, include: [], count: 0, symbols: [], limit: opts.limit ?? 500 }
  }
  const limit = Math.max(1, Math.min(opts.limit ?? 500, 5000))
  const qs = new URLSearchParams({ include: include.join(','), limit: String(limit) })
  return fetchJson(
    `${BASE}/research/data/readiness/fundamental-filter?${qs}`,
    20_000,
    { ok: false },
  )
}

export async function fetchTechnicalFilter(opts: {
  include: string[]
  limit?: number
}): Promise<TechnicalFilterResponse> {
  const include = (opts.include ?? []).map((s) => s.trim()).filter(Boolean)
  if (include.length === 0) {
    return { ok: true, include: [], count: 0, symbols: [], limit: opts.limit ?? 500 }
  }
  const limit = Math.max(1, Math.min(opts.limit ?? 500, 5000))
  const qs = new URLSearchParams({ include: include.join(','), limit: String(limit) })
  return fetchJson(
    `${BASE}/research/data/readiness/technical-filter?${qs}`,
    20_000,
    { ok: false },
  )
}

export async function fetchMomentumFilter(params: {
  include?: string[]
  min_score?: number
  limit?: number
}): Promise<MomentumFilterResponse> {
  const qs = new URLSearchParams()
  if (params.include?.length) qs.set('include', params.include.join(','))
  if (params.min_score != null) qs.set('min_score', String(params.min_score))
  if (params.limit != null) qs.set('limit', String(params.limit))
  return fetchJson(
    `${BASE}/research/data/readiness/momentum-filter?${qs.toString()}`,
    15_000,
    { ok: false },
  )
}

export async function fetchTierFilter(params: {
  tier: 'structure' | 'sentiment'
  include?: string[]
  min_score?: number
  limit?: number
}): Promise<TierFilterResponse> {
  const qs = new URLSearchParams({ tier: params.tier })
  if (params.include?.length) qs.set('include', params.include.join(','))
  if (params.min_score != null && params.min_score > 0) qs.set('min_score', String(params.min_score))
  if (params.limit != null) qs.set('limit', String(params.limit))
  return fetchJson(
    `${BASE}/research/data/readiness/tier-filter?${qs.toString()}`,
    15_000,
    { ok: false },
  )
}

export async function fetchSymbolsReadinessSnapshot(
  symbols: string[],
): Promise<SymbolsReadinessSnapshotResponse> {
  const clean = symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)
  if (clean.length === 0) {
    return { ok: true, as_of_date: null, count: 0, symbols: [] }
  }
  const sliced = clean.slice(0, 500)
  const qs = new URLSearchParams({ symbols: sliced.join(',') })
  const data = await fetchJson<SymbolsReadinessSnapshotResponse>(
    `${BASE}/research/data/readiness/symbols-snapshot?${qs}`,
    20_000,
    { ok: false },
  )
  if (!data.ok) return data
  return validateSnapshot(data)
}
