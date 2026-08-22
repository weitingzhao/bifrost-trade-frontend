import { SEPA_COND_CATALOG, TECH_COND_CATALOG } from '@/constants/stockScreenerCatalog'
import type {
  FundPassCountBucket,
  ReadinessSnapshotRow,
  SepaCriteriaStats,
  SortColumn,
  SortDirection,
  TechPassCountBucket,
} from '@/types/stockScreener'

const FUND_CONDITION_IDS = SEPA_COND_CATALOG.map(c => c.id)
const TECH_CONDITION_IDS = TECH_COND_CATALOG.map(c => c.id)

/**
 * Detect whether a snapshot row uses the new analytics flat-column format.
 * Presence of any flat boolean condition field at the top level is the signal.
 */
function isAnalyticsFormat(row: ReadinessSnapshotRow): boolean {
  return row.eps_q2q_ge_25pct !== undefined || row.avg_volume_50_gt_threshold !== undefined
}

/**
 * Normalize a snapshot row so that both legacy (jsonb `passed_conditions` arrays)
 * and new (flat boolean columns) formats produce a consistent shape:
 * - `passed_conditions` / `passed_tech_conditions` arrays are always populated
 * - `fundamental_pass_count` / `technical_pass_count` are always set
 * - Flat boolean fields are always set
 *
 * This allows downstream components to read whichever representation they prefer.
 */
export function normalizeSnapshotRow(raw: ReadinessSnapshotRow): ReadinessSnapshotRow {
  if (isAnalyticsFormat(raw)) {
    const rec = raw as unknown as Record<string, unknown>
    const passedFund = FUND_CONDITION_IDS.filter(id => rec[id] === true)
    const passedTech = TECH_CONDITION_IDS.filter(id => rec[id] === true)
    return {
      ...raw,
      passed_conditions: raw.passed_conditions ?? passedFund,
      passed_tech_conditions: raw.passed_tech_conditions ?? passedTech,
      fundamental_pass_count: raw.fundamental_pass_count ?? raw.fund_pass_count ?? passedFund.length,
      technical_pass_count: raw.technical_pass_count ?? raw.tech_pass_count ?? passedTech.length,
      fundamental_insufficient: raw.fundamental_insufficient ?? raw.fund_insufficient ?? false,
      fundamental_pass: raw.fundamental_pass ?? (passedFund.length === 8),
      technical_pass: raw.technical_pass ?? (passedTech.length === 11),
    }
  }

  // Legacy format: derive flat booleans from the passed_conditions arrays
  const passedSet = new Set(raw.passed_conditions ?? [])
  const passedTechSet = new Set(raw.passed_tech_conditions ?? [])
  const flatFund: Partial<ReadinessSnapshotRow> = {}
  for (const id of FUND_CONDITION_IDS) {
    ;(flatFund as Record<string, boolean>)[id] = passedSet.has(id)
  }
  const flatTech: Partial<ReadinessSnapshotRow> = {}
  for (const id of TECH_CONDITION_IDS) {
    ;(flatTech as Record<string, boolean>)[id] = passedTechSet.has(id)
  }

  return {
    ...raw,
    ...flatFund,
    ...flatTech,
    fund_pass_count: raw.fundamental_pass_count,
    tech_pass_count: raw.technical_pass_count,
    fund_insufficient: raw.fundamental_insufficient,
  }
}

export function parseSymbols(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[\n,\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

export function formatCriteriaAsOf(iso: string | undefined): string | null {
  if (!iso) return null
  const d = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}

/** dbt mart_sepa_criteria_stats counter key → condition id */
const FUND_DBT_KEY_TO_ID: Record<string, string> = {
  eps_q2q: 'eps_q2q_ge_25pct',
  rev_q2q: 'rev_q2q_ge_25pct',
  eps_acc: 'eps_acc_2q',
  rev_acc: 'rev_acc_2q',
  eps_3y: 'eps_3y_ge_15pct',
  rev_3y: 'rev_3y_ge_15pct',
  eps_acc_fy: 'eps_acc_fy',
  rev_acc_fy: 'rev_acc_fy',
}

const TECH_DBT_KEY_TO_ID: Record<string, string> = {
  volume: 'avg_volume_50_gt_threshold',
  low52: 'close_ge_low52_x_1_3',
  high52: 'close_ge_high52_x_0_75',
  sma50_150: 'sma50_gt_sma150',
  sma50_200: 'sma50_gt_sma200',
  sma150_200: 'sma150_gt_sma200',
  sma200_rising: 'sma200_rising_1m',
  price_sma50: 'price_gt_sma50',
  price_sma150: 'price_gt_sma150',
  price_sma200: 'price_gt_sma200',
  crs: 'crs_ge_70',
}

function isLegacyFeCriteriaShape(raw: Record<string, unknown>): boolean {
  const fund = raw.fundamental
  return (
    typeof fund === 'object' &&
    fund !== null &&
    Array.isArray((fund as { conditions?: unknown }).conditions)
  )
}

function conditionsFromDbtCounters(
  stats: Record<string, unknown>,
  keyMap: Record<string, string>,
  catalog: readonly { id: string; label: string }[],
): { id: string; label: string; pass: number; fail: number; no_data: number; total: number }[] {
  const labelById = new Map(catalog.map((c) => [c.id, c.label]))
  const total = Number(stats.evaluated ?? stats.total ?? 0) || 0
  const out: {
    id: string
    label: string
    pass: number
    fail: number
    no_data: number
    total: number
  }[] = []
  for (const [key, id] of Object.entries(keyMap)) {
    const pass = Number(stats[`${key}_pass`] ?? 0) || 0
    const fail = Number(stats[`${key}_fail`] ?? 0) || 0
    out.push({
      id,
      label: labelById.get(id) ?? id,
      pass,
      fail,
      no_data: Math.max(0, total - pass - fail),
      total,
    })
  }
  return out
}

/**
 * Normalize criteria-stats payload.
 * Legacy FE shape has ``fundamental.conditions[]``; dbt mart returns flat pass/fail counters.
 */
export function normalizeCriteriaStats(raw: unknown): SepaCriteriaStats {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (isLegacyFeCriteriaShape(data)) {
    return data as unknown as SepaCriteriaStats
  }

  const fundRaw = (data.fundamental && typeof data.fundamental === 'object'
    ? data.fundamental
    : {}) as Record<string, unknown>
  const techRaw = (data.technical && typeof data.technical === 'object'
    ? data.technical
    : {}) as Record<string, unknown>

  const fundEvaluated = Number(fundRaw.evaluated ?? fundRaw.total ?? 0) || 0
  const techEvaluated = Number(techRaw.evaluated ?? techRaw.total ?? 0) || 0

  return {
    ok: data.ok !== false,
    error: typeof data.error === 'string' ? data.error : undefined,
    universe_count: Number(data.universe_count ?? fundRaw.total ?? techRaw.total ?? 0) || 0,
    computed_at: typeof data.computed_at === 'string' ? data.computed_at : new Date().toISOString(),
    fundamental: {
      cached_count: fundEvaluated || Number(fundRaw.cached_count ?? 0) || 0,
      fund_pass_count: Number(fundRaw.all_pass ?? fundRaw.fund_pass_count ?? 0) || 0,
      no_data_count: Number(fundRaw.no_data ?? fundRaw.no_data_count ?? 0) || 0,
      pass_6_plus: Number(fundRaw.pass_6_plus ?? 0) || 0,
      pass_4_plus: Number(fundRaw.pass_4_plus ?? 0) || 0,
      eval_date: typeof fundRaw.eval_date === 'string' ? fundRaw.eval_date : undefined,
      conditions: Array.isArray(fundRaw.conditions)
        ? (fundRaw.conditions as SepaCriteriaStats['fundamental']['conditions'])
        : conditionsFromDbtCounters(fundRaw, FUND_DBT_KEY_TO_ID, SEPA_COND_CATALOG),
      pass_count_distribution: Array.isArray(fundRaw.pass_count_distribution)
        ? (fundRaw.pass_count_distribution as FundPassCountBucket[])
        : undefined,
    },
    technical: {
      total_in_snapshot: techEvaluated || Number(techRaw.total_in_snapshot ?? 0) || 0,
      price_ready_count: techEvaluated || Number(techRaw.price_ready_count ?? 0) || 0,
      fund_cached_count: fundEvaluated || Number(techRaw.fund_cached_count ?? 0) || 0,
      both_ready: Math.min(
        fundEvaluated || Number(fundRaw.cached_count ?? 0) || 0,
        techEvaluated || Number(techRaw.tech_cached_count ?? 0) || 0,
      ),
      bars_ge_252: Number(techRaw.bars_ge_252 ?? 0) || 0,
      bars_ge_240: Number(techRaw.bars_ge_240 ?? 0) || 0,
      bars_ge_200: Number(techRaw.bars_ge_200 ?? 0) || 0,
      bars_lt_200: Number(techRaw.bars_lt_200 ?? 0) || 0,
      no_bars: Number(techRaw.no_bars ?? 0) || 0,
      failure_reasons: Array.isArray(techRaw.failure_reasons)
        ? (techRaw.failure_reasons as SepaCriteriaStats['technical']['failure_reasons'])
        : [],
      tech_cached_count: techEvaluated || Number(techRaw.tech_cached_count ?? 0) || 0,
      tech_pass_count: Number(techRaw.all_pass ?? techRaw.tech_pass_count ?? 0) || 0,
      tech_insufficient_count: Number(techRaw.tech_insufficient_count ?? 0) || 0,
      pass_8_plus: Number(techRaw.pass_8_plus ?? 0) || 0,
      pass_4_plus: Number(techRaw.pass_4_plus ?? 0) || 0,
      eval_date: typeof techRaw.eval_date === 'string' ? techRaw.eval_date : undefined,
      conditions: Array.isArray(techRaw.conditions)
        ? (techRaw.conditions as SepaCriteriaStats['technical']['conditions']).map(
            ({ id, label, pass, fail }) => ({ id, label, pass, fail }),
          )
        : conditionsFromDbtCounters(techRaw, TECH_DBT_KEY_TO_ID, TECH_COND_CATALOG).map(
            ({ id, label, pass, fail }) => ({ id, label, pass, fail }),
          ),
      pass_count_distribution: Array.isArray(techRaw.pass_count_distribution)
        ? (techRaw.pass_count_distribution as TechPassCountBucket[])
        : undefined,
    },
  }
}

export function prepareDistBuckets(
  raw: FundPassCountBucket[] | TechPassCountBucket[] | undefined,
  maxRows?: number,
): { buckets: FundPassCountBucket[]; base: number; maxCount: number } | null {
  if (!raw?.length) return null
  const filtered = raw.filter((d) => d.symbol_count > 0)
  const sorted = [...filtered].sort((a, b) => b.conditions_passed - a.conditions_passed)
  const buckets = maxRows != null ? sorted.slice(0, maxRows) : sorted
  if (buckets.length === 0) return null
  const base = raw.reduce((s, d) => s + d.symbol_count, 0) || 1
  const maxCount = Math.max(...buckets.map((d) => d.symbol_count), 1)
  return { buckets, base, maxCount }
}

export function fundBarColorClass(n: number): string {
  if (n === 8) return 'bg-emerald-500'
  if (n >= 6) return 'bg-emerald-400/80'
  if (n >= 4) return 'bg-yellow-500/80'
  if (n >= 2) return 'bg-orange-500/70'
  return 'bg-red-500/70'
}

export function techBarColorClass(n: number): string {
  if (n === 11) return 'bg-violet-500'
  if (n >= 9) return 'bg-violet-400/80'
  if (n >= 7) return 'bg-yellow-500/80'
  if (n >= 4) return 'bg-orange-500/70'
  return 'bg-red-500/70'
}

export function fundCellClass(passCount: number, insufficient: boolean): string {
  if (insufficient) return 'text-yellow-600 dark:text-yellow-400'
  if (passCount === 8) return 'text-emerald-500 font-semibold'
  if (passCount >= 5) return 'text-emerald-400'
  if (passCount >= 2) return 'text-yellow-500'
  return 'text-red-400'
}

export function techCellClass(passCount: number, insufficient: boolean, evalPresent: boolean): string {
  if (!evalPresent) return 'text-muted-foreground'
  if (insufficient) return 'text-yellow-600 dark:text-yellow-400'
  if (passCount === 11) return 'text-violet-400 font-semibold'
  if (passCount >= 8) return 'text-violet-400'
  if (passCount >= 5) return 'text-yellow-500'
  return 'text-red-400'
}

export function sortReadinessRows(
  rows: ReadinessSnapshotRow[],
  sortCol: SortColumn,
  sortDir: SortDirection,
): ReadinessSnapshotRow[] {
  if (!sortCol) return rows
  return [...rows].sort((a, b) => {
    const va = sortCol === 'tech' ? (a.technical_pass_count ?? -1) : (a.fundamental_pass_count ?? -1)
    const vb = sortCol === 'tech' ? (b.technical_pass_count ?? -1) : (b.fundamental_pass_count ?? -1)
    return sortDir === 'desc' ? vb - va : va - vb
  })
}

export function computeReadinessSummary(rows: ReadinessSnapshotRow[]) {
  if (rows.length === 0) return null
  const found = rows.filter((r) => r.found)
  return {
    total: rows.length,
    found: found.length,
    fundPass: found.filter((r) => (r.fundamental_pass_count ?? 0) === 8).length,
    techPass: found.filter((r) => r.technical_pass === true).length,
    insufficient: found.filter((r) => r.fundamental_insufficient).length,
  }
}

export function intersectSymbolLists(lists: string[][]): string[] {
  if (lists.length === 0) return []
  let result = lists[0] ?? []
  for (let i = 1; i < lists.length; i++) {
    const set = new Set(lists[i])
    result = result.filter((x) => set.has(x))
  }
  return result
}
