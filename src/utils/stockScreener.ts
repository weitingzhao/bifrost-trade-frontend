import { SEPA_COND_CATALOG, TECH_COND_CATALOG } from '@/constants/stockScreenerCatalog'
import type { FundPassCountBucket, ReadinessSnapshotRow, SortColumn, SortDirection, TechPassCountBucket } from '@/types/stockScreener'

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
