import { withValidation } from '@/lib/apiValidation'
import { SepaCriteriaStatsSchema } from '@/lib/schemas/stockScreener'
import { researchUrl } from '@/lib/devApiUrl'
import type {
  FundDistSymbolsResponse,
  MomentumFilterResponse,
  SepaCriteriaStats,
  TechDistSymbolsResponse,
  TierFilterResponse,
  TierStatsResponse,
  MomentumGradesResponse,
} from '@/types/stockScreener'
import { normalizeCriteriaStats } from '@/utils/stockScreener'
import { tradeFetch } from '@/lib/tradeFetch'


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
    const r = await tradeFetch(url, { method: 'GET', signal: controller.signal })
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

export async function fetchSepaCriteriaStats(): Promise<SepaCriteriaStats> {
  const data = await fetchJson(researchUrl('/research/data/readiness/criteria-stats'), 60_000, EMPTY_CRITERIA)
  if (!data.ok) throw new Error(data.error ?? 'Failed to load criteria stats')
  const normalized = normalizeCriteriaStats(data)

  // Enrich pass-count histograms when dbt mart omits them (api-research:stg shape).
  if (!normalized.fundamental.pass_count_distribution?.length) {
    const fundBuckets = await Promise.all(
      Array.from({ length: 9 }, (_, i) => 8 - i).map(async (n) => {
        const res = await fetchFundamentalDistributionSymbols(n)
        return { conditions_passed: n, symbol_count: res.ok ? res.count : 0 }
      }),
    )
    normalized.fundamental.pass_count_distribution = fundBuckets
  }
  if (!normalized.technical.pass_count_distribution?.length) {
    const techBuckets = await Promise.all(
      Array.from({ length: 12 }, (_, i) => 11 - i).map(async (n) => {
        const res = await fetchTechnicalDistributionSymbols(n)
        return { conditions_passed: n, symbol_count: res.ok ? res.count : 0 }
      }),
    )
    normalized.technical.pass_count_distribution = techBuckets
  }

  return validateCriteriaStats(normalized)
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
    researchUrl(`/research/data/readiness/fundamental-distribution/symbols?conditions_passed=${conditionsPassed}`),
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
    researchUrl(`/research/data/readiness/technical-distribution/symbols?conditions_passed=${conditionsPassed}`),
    20_000,
    fallback,
  )
}

export async function fetchMomentumFilter(params: {
  include?: string[]
  min_score?: number
  match?: 'all' | 'any'
  limit?: number
}): Promise<MomentumFilterResponse> {
  const qs = new URLSearchParams()
  if (params.include?.length) qs.set('include', params.include.join(','))
  if (params.min_score != null) qs.set('min_score', String(params.min_score))
  if (params.match) qs.set('match', params.match)
  if (params.limit != null) qs.set('limit', String(params.limit))
  return fetchJson(
    researchUrl(`/research/data/readiness/momentum-filter?${qs.toString()}`),
    15_000,
    { ok: false },
  )
}

export async function fetchTierFilter(params: {
  tier: 'structure' | 'sentiment'
  include?: string[]
  min_score?: number
  match?: 'all' | 'any'
  limit?: number
}): Promise<TierFilterResponse> {
  const qs = new URLSearchParams({ tier: params.tier })
  if (params.include?.length) qs.set('include', params.include.join(','))
  if (params.min_score != null && params.min_score > 0) qs.set('min_score', String(params.min_score))
  if (params.match) qs.set('match', params.match)
  if (params.limit != null) qs.set('limit', String(params.limit))
  return fetchJson(
    researchUrl(`/research/data/readiness/tier-filter?${qs.toString()}`),
    15_000,
    { ok: false },
  )
}

/** Per-signal pass counts and the signals-passed histogram for one tier, latest eval_date. */
export async function fetchTierStats(tier: 'momentum' | 'structure' | 'sentiment'): Promise<TierStatsResponse> {
  return fetchJson(researchUrl(`/research/data/readiness/tier-stats?tier=${tier}`), 15_000, { ok: false })
}

/**
 * The radar's grades on its latest session. `/research/momentum/radar` only
 * resolves "latest" for one symbol — across the universe it returns every
 * session it holds, so counting a grade there counts months of names.
 */
export async function fetchMomentumGrades(grades: readonly string[] = []): Promise<MomentumGradesResponse> {
  const qs = new URLSearchParams()
  if (grades.length) qs.set('grades', grades.join(','))
  return fetchJson(researchUrl(`/research/data/readiness/momentum-grades?${qs.toString()}`), 15_000, { ok: false })
}
