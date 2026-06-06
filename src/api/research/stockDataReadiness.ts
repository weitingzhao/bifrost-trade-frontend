import type {
  FinDrawerKind,
  SepaFinGapRow,
  SepaGapAckDataType,
  SepaPriceGapItem,
  SepaReadinessSummaryResponse,
} from '@/types/stockDataReadiness'
import type { SepaCriteriaStats } from '@/types/stockScreener'
import { researchUrl } from '@/lib/devApiUrl'

async function fetchJson<T>(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...init, signal: controller.signal })
    const j = await r.json().catch(() => ({})) as Record<string, unknown>
    if (!r.ok) {
      const msg =
        typeof j.detail === 'string'
          ? j.detail
          : typeof j.error === 'string'
            ? j.error
            : `HTTP ${r.status}`
      throw new Error(msg)
    }
    return j as T
  } finally {
    clearTimeout(timer)
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  return fetchJson<T>(
    url,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) },
    timeoutMs,
  )
}

export async function fetchSepaReadinessSummary(): Promise<SepaReadinessSummaryResponse> {
  try {
    return await fetchJson<SepaReadinessSummaryResponse>(
      researchUrl('/research/data/readiness/summary'),
      { method: 'GET' },
      45_000,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error'
    return { ok: false, error: msg }
  }
}

export async function postSepaSyncHolidays(): Promise<{
  ok: boolean
  error?: string
  fetched?: number
  inserted?: number
  updated?: number
  skipped?: number
  total_in_table?: number
  synced_at?: string
  massive_error?: string
}> {
  try {
    return await postJson(researchUrl('/research/data/readiness/sync-holidays'), {}, 30_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaStockUnifiedSnapshot(): Promise<{
  ok: boolean
  error?: string
  symbols_total?: number
  chunks?: number
  rows_upserted?: number
  errors?: string[]
  elapsed_ms?: number
  message?: string
}> {
  try {
    return await postJson(researchUrl('/research/data/readiness/stock-unified-snapshot'), {}, 600_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaGroupedHistoryBackfill(daysBack = 420): Promise<{
  ok: boolean
  error?: string
  dates_queued?: number
  checked_dates?: number
  job_ids?: string[]
  message?: string
}> {
  try {
    return await postJson(
      researchUrl('/research/data/readiness/backfill-grouped-history'),
      { days_back: daysBack },
      120_000,
    )
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaPriceGapBackfill(symbols?: string[]): Promise<{
  ok: boolean
  error?: string
  gap_count?: number
  chunks?: number
  job_ids?: string[]
  message?: string
}> {
  try {
    return await postJson(
      researchUrl('/research/data/readiness/backfill-price-gaps'),
      symbols?.length ? { symbols } : {},
      60_000,
    )
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchSepaPriceGaps(): Promise<{
  ok: boolean
  error?: string
  total_gap_count?: number
  items?: SepaPriceGapItem[]
}> {
  try {
    return await fetchJson(researchUrl('/research/data/readiness/price-gaps'), { method: 'GET' }, 60_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaReadinessSnapshot(): Promise<{
  ok: boolean
  error?: string
  rows_affected?: number
  elapsed_ms?: number
}> {
  try {
    return await postJson(researchUrl('/research/data/readiness/snapshot'), {}, 180_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaFundamentalsBackfill(opts?: {
  max_workers?: number
  rate_limit_rps?: number
  only_missing?: boolean
}): Promise<{ ok: boolean; error?: string; gap_count?: number; message?: string }> {
  try {
    return await postJson(researchUrl('/research/data/readiness/backfill-fundamentals'), opts ?? {}, 60_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function postSepaTechnicalBackfill(opts?: {
  only_missing?: boolean
}): Promise<{ ok: boolean; error?: string; gap_count?: number; message?: string }> {
  try {
    return await postJson(researchUrl('/research/data/readiness/backfill-technical'), opts ?? {}, 60_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

type FinGapsResponse = { ok: boolean; error?: string; gaps?: SepaFinGapRow[]; total_gap_count?: number }
type FinBackfillResponse = {
  ok: boolean
  error?: string
  gap_count?: number
  chunks?: number
  job_ids?: string[]
  message?: string
}

async function getFinGaps(path: string): Promise<FinGapsResponse> {
  try {
    return await fetchJson(researchUrl(path), { method: 'GET' }, 60_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

async function postFinBackfill(path: string, symbols?: string[]): Promise<FinBackfillResponse> {
  try {
    return await postJson(researchUrl(path), symbols?.length ? { symbols } : {}, 120_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export const fetchSepaIncomeStatementsGaps = () =>
  getFinGaps('/research/data/readiness/income-statements-gaps')
export const postSepaIncomeStatementsBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-income-statements', symbols)

export const fetchSepaBalanceSheetsGaps = () =>
  getFinGaps('/research/data/readiness/balance-sheets-gaps')
export const postSepaBalanceSheetsBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-balance-sheets', symbols)

export const fetchSepaCashFlowsGaps = () =>
  getFinGaps('/research/data/readiness/cash-flows-gaps')
export const postSepaCashFlowsBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-cash-flows', symbols)

export const fetchSepaRatiosGaps = () => getFinGaps('/research/data/readiness/ratios-gaps')
export const postSepaRatiosBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-ratios', symbols)

export const fetchSepaShortInterestGaps = () =>
  getFinGaps('/research/data/readiness/short-interest-gaps')
export const postSepaShortInterestBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-short-interest', symbols)

export const fetchSepaShortVolumeGaps = () =>
  getFinGaps('/research/data/readiness/short-volume-gaps')
export const postSepaShortVolumeBackfill = (symbols?: string[]) =>
  postFinBackfill('/research/data/readiness/backfill-short-volume', symbols)

export async function postSepaGapAck(
  dataType: SepaGapAckDataType,
  isVoid: boolean,
  gapCount: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await postJson(researchUrl('/research/data/readiness/gap-ack'), {
      data_type: dataType,
      is_void: isVoid,
      gap_count: gapCount,
    }, 15_000)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' }
  }
}

export async function fetchSepaDataInventory(): Promise<{
  ok: boolean
  error?: string
  universe_count: number
  tables: Record<string, Record<string, number>>
}> {
  try {
    return await fetchJson(researchUrl('/research/data/readiness/data-inventory'), { method: 'GET' }, 60_000)
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error',
      universe_count: 0,
      tables: {},
    }
  }
}

export type { SepaCriteriaStats }

export function finGapsFetcher(kind: FinDrawerKind) {
  switch (kind) {
    case 'income':
      return fetchSepaIncomeStatementsGaps
    case 'balance':
      return fetchSepaBalanceSheetsGaps
    case 'cash':
      return fetchSepaCashFlowsGaps
    case 'ratios':
      return fetchSepaRatiosGaps
    case 'sint':
      return fetchSepaShortInterestGaps
    case 'svol':
      return fetchSepaShortVolumeGaps
  }
}

export function finBackfillPoster(kind: FinDrawerKind) {
  switch (kind) {
    case 'income':
      return postSepaIncomeStatementsBackfill
    case 'balance':
      return postSepaBalanceSheetsBackfill
    case 'cash':
      return postSepaCashFlowsBackfill
    case 'ratios':
      return postSepaRatiosBackfill
    case 'sint':
      return postSepaShortInterestBackfill
    case 'svol':
      return postSepaShortVolumeBackfill
  }
}

export function gapAckTypeForFinKind(kind: FinDrawerKind): SepaGapAckDataType {
  switch (kind) {
    case 'income':
      return 'income_statements'
    case 'balance':
      return 'balance_sheets'
    case 'cash':
      return 'cash_flows'
    case 'ratios':
      return 'ratios'
    case 'sint':
      return 'short_interest'
    case 'svol':
      return 'short_volume'
  }
}
