import { RUNBOOK_STAGE_LAYOUT } from '@/constants/stockDataReadiness'
import type {
  CheckStatus,
  RunbookStageView,
  RunbookStepView,
  SepaReadinessSummaryResponse,
  SepaRunStep,
} from '@/types/stockDataReadiness'
import { finGapOk, fmt } from './format'

export function gapCountCheckStatus(summaryLoading: boolean, n: number | null | undefined): CheckStatus {
  if (summaryLoading) return 'loading'
  if (n == null) return 'unknown'
  if (n === 0) return 'ok'
  if (n < 500) return 'warn'
  return 'error'
}

export function gapCountCheckStatusWithVoid(
  summaryLoading: boolean,
  actionable: number | null | undefined,
  isVoid: boolean | undefined,
): CheckStatus {
  if (summaryLoading) return 'loading'
  if (isVoid) {
    if (actionable == null || actionable === 0) return 'void'
    if (actionable < 500) return 'warn'
    return 'error'
  }
  return gapCountCheckStatus(summaryLoading, actionable)
}

export function foldStageStatus(statuses: CheckStatus[]): CheckStatus {
  if (statuses.length === 0) return 'unknown'
  if (statuses.some(x => x === 'loading')) return 'loading'
  if (statuses.some(x => x === 'error')) return 'error'
  if (statuses.some(x => x === 'warn')) return 'warn'
  if (statuses.every(x => x === 'ok' || x === 'void')) {
    return statuses.every(x => x === 'ok') ? 'ok' : 'void'
  }
  if (statuses.some(x => x === 'ok' || x === 'void')) return 'warn'
  return 'unknown'
}

export interface RunbookDerivedState {
  runbookSteps: RunbookStepView[]
  runbookStages: RunbookStageView[]
  universeCount: number
  tickersActive: number
  priceReady: number
  totalSymbols: number
  priceGap: number | null
  vendorFillGap: number | null
  notesCount: number
  step1Status: CheckStatus
  holidaysStatus: CheckStatus
  unifiedSnapStatus: CheckStatus
  barStepStatus: CheckStatus
  matSnapshotStepStatus: CheckStatus
  fundStepStatus: CheckStatus
  incomeFinStatus: CheckStatus
  balanceFinStatus: CheckStatus
  cashFinStatus: CheckStatus
  ratiosFinStatus: CheckStatus
  shortIntFinStatus: CheckStatus
  shortVolFinStatus: CheckStatus
  reviewStepStatus: CheckStatus
  incomeGap: number | null | undefined
  balanceGap: number | null | undefined
  cashGap: number | null | undefined
  ratiosGap: number | null | undefined
  shortIntGap: number | null | undefined
  shortVolGap: number | null | undefined
  incomeActionable: number | null | undefined
  balanceActionable: number | null | undefined
  cashActionable: number | null | undefined
  ratiosActionable: number | null | undefined
  shortIntActionable: number | null | undefined
  shortVolActionable: number | null | undefined
  incomeAcked: number | null | undefined
  balanceAcked: number | null | undefined
  cashAcked: number | null | undefined
  ratiosAcked: number | null | undefined
  shortIntAcked: number | null | undefined
  shortVolAcked: number | null | undefined
  unifiedSnapRows: number | null | undefined
  fundCacheValid: number
  holidaysTotal: number
  holidaysMassive: number
  holidaysSeed: number
  holidaysEarlyClose: number
  holidaysLastSync: string | null
  holidaysEarliest: string | null
  holidaysLatest: string | null
}

export function deriveRunbookState(
  summary: SepaReadinessSummaryResponse | null | undefined,
  summaryLoading: boolean,
  activeRunStep: SepaRunStep,
): RunbookDerivedState {
  const live = summary?.price_readiness_live
  const snap = summary?.snapshot_today

  const universeCount = summary?.universe_count ?? 0
  const tickersActive = summary?.tickers_active_count ?? 0
  const priceReady = live?.price_ready ?? 0
  const totalSymbols = live?.total_symbols ?? 0
  const vendorFillGap = summary?.stock_day_vendor_fill_gap_count ?? null
  const priceGap =
    vendorFillGap != null
      ? vendorFillGap
      : totalSymbols > 0
        ? totalSymbols - priceReady
        : null
  const notesCount = (summary?.notes_breakdown ?? []).reduce((s, r) => s + r.count, 0)

  const step1Status: CheckStatus = summaryLoading
    ? 'loading'
    : universeCount > 5000
      ? 'ok'
      : universeCount > 100
        ? 'warn'
        : summary
          ? 'error'
          : 'unknown'

  const holidaysSummary = summary?.holidays_summary
  const holidaysTotal = holidaysSummary?.total ?? 0
  const holidaysMassive = holidaysSummary?.massive_count ?? 0
  const holidaysSeed = holidaysSummary?.seed_count ?? 0
  const holidaysEarlyClose = holidaysSummary?.early_close_count ?? 0
  const holidaysLastSync = holidaysSummary?.last_massive_sync ?? null
  const holidaysEarliest = holidaysSummary?.earliest_date ?? null
  const holidaysLatest = holidaysSummary?.latest_date ?? null

  const holidaysStatus: CheckStatus = summaryLoading
    ? 'loading'
    : holidaysTotal >= 100
      ? 'ok'
      : holidaysTotal > 0
        ? 'warn'
        : summary
          ? 'error'
          : 'unknown'

  const unifiedSnapRows = summary?.stock_unified_snapshot_row_count ?? null
  const unifiedSnapStatus: CheckStatus = summaryLoading
    ? 'loading'
    : unifiedSnapRows != null && unifiedSnapRows > 0
      ? 'ok'
      : summary && universeCount > 0
        ? 'warn'
        : 'unknown'

  const barStepStatus: CheckStatus = summaryLoading
    ? 'loading'
    : priceGap === 0
      ? 'ok'
      : priceGap != null && priceGap < 500
        ? 'warn'
        : priceGap != null
          ? 'error'
          : 'unknown'

  const matSnapshotStepStatus: CheckStatus = summaryLoading
    ? 'loading'
    : summary?.snapshot_populated === true
      ? 'ok'
      : summary
        ? 'error'
        : 'unknown'

  const incomeGap = summary?.income_statements_gap_count
  const balanceGap = summary?.balance_sheets_gap_count
  const cashGap = summary?.cash_flows_gap_count
  const ratiosGap = summary?.ratios_gap_count
  const shortIntGap = summary?.short_interest_gap_count
  const shortVolGap = summary?.short_volume_gap_count

  const incomeActionable = summary?.income_statements_actionable_gap_count
  const balanceActionable = summary?.balance_sheets_actionable_gap_count
  const cashActionable = summary?.cash_flows_actionable_gap_count
  const ratiosActionable = summary?.ratios_actionable_gap_count
  const shortIntActionable = summary?.short_interest_actionable_gap_count
  const shortVolActionable = summary?.short_volume_actionable_gap_count

  const incomeAcked = summary?.income_statements_acked_gap_count
  const balanceAcked = summary?.balance_sheets_acked_gap_count
  const cashAcked = summary?.cash_flows_acked_gap_count
  const ratiosAcked = summary?.ratios_acked_gap_count
  const shortIntAcked = summary?.short_interest_acked_gap_count
  const shortVolAcked = summary?.short_volume_acked_gap_count

  const incomeFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    incomeActionable,
    summary?.income_statements_source_void,
  )
  const balanceFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    balanceActionable,
    summary?.balance_sheets_source_void,
  )
  const cashFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    cashActionable,
    summary?.cash_flows_source_void,
  )
  const ratiosFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    ratiosActionable,
    summary?.ratios_source_void,
  )
  const shortIntFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    shortIntActionable,
    summary?.short_interest_source_void,
  )
  const shortVolFinStatus = gapCountCheckStatusWithVoid(
    summaryLoading,
    shortVolActionable,
    summary?.short_volume_source_void,
  )

  const reviewStepStatus: CheckStatus = summaryLoading
    ? 'loading'
    : notesCount === 0 && summary?.snapshot_populated
      ? 'ok'
      : notesCount > 0
        ? notesCount > 500
          ? 'error'
          : 'warn'
        : 'unknown'

  const step1Done = universeCount > 0
  const unifiedSnapDone = (unifiedSnapRows ?? 0) > 0
  const fundCacheValid = summary?.fund_cache_valid_count ?? 0
  const fundCacheViewExists = summary?.fund_cache_view_exists
  const fundStepStatus: CheckStatus = summaryLoading
    ? 'loading'
    : fundCacheViewExists === false
      ? 'error'
      : fundCacheValid > 0 && universeCount > 0 && fundCacheValid / universeCount >= 0.5
        ? 'ok'
        : fundCacheValid > 0
          ? 'warn'
          : summary
            ? 'error'
            : 'unknown'
  const fundStepDone = fundCacheValid > 0
  const matSnapshotStepDone = summary?.snapshot_populated === true

  const runbookSteps: RunbookStepView[] = [
    {
      id: 1,
      title: 'Universe + holidays',
      short: 'Reference data',
      status:
        step1Status === 'ok' && holidaysStatus === 'ok'
          ? 'ok'
          : step1Status === 'error' || holidaysStatus === 'error'
            ? 'error'
            : step1Status === 'loading' || holidaysStatus === 'loading'
              ? 'loading'
              : step1Status === 'warn' || holidaysStatus === 'warn'
                ? 'warn'
                : 'unknown',
      done: step1Done && holidaysTotal > 0,
      metric: `${fmt(universeCount)} symbols`,
    },
    {
      id: 2,
      title: 'Unified snapshots',
      short: 'Massive baseline',
      status: unifiedSnapStatus,
      done: unifiedSnapDone,
      metric: unifiedSnapRows != null ? `${fmt(unifiedSnapRows)} rows` : 'not loaded',
    },
    {
      id: 3,
      title: 'Stock day bars',
      short: 'Daily fill',
      status: barStepStatus,
      done: barStepStatus === 'ok',
      metric: priceGap != null ? `${fmt(priceGap)} gaps` : 'unchecked',
    },
    {
      id: 4,
      title: 'Income statements',
      short: 'PG ingest',
      status: incomeFinStatus,
      done: finGapOk(incomeGap) || (incomeFinStatus === 'void' && (incomeActionable ?? 0) === 0),
      metric:
        incomeFinStatus === 'void'
          ? (incomeActionable ?? 0) > 0
            ? `${fmt(incomeActionable)} / ${fmt(incomeAcked)} acked`
            : `N/A (${fmt(incomeAcked)} acked)`
          : incomeGap != null
            ? `${fmt(incomeGap)} gaps`
            : '—',
    },
    {
      id: 5,
      title: 'Balance sheets',
      short: 'PG ingest',
      status: balanceFinStatus,
      done: finGapOk(balanceGap) || (balanceFinStatus === 'void' && (balanceActionable ?? 0) === 0),
      metric:
        balanceFinStatus === 'void'
          ? (balanceActionable ?? 0) > 0
            ? `${fmt(balanceActionable)} / ${fmt(balanceAcked)} acked`
            : `N/A (${fmt(balanceAcked)} acked)`
          : balanceGap != null
            ? `${fmt(balanceGap)} gaps`
            : '—',
    },
    {
      id: 6,
      title: 'Cash flows',
      short: 'PG ingest',
      status: cashFinStatus,
      done: finGapOk(cashGap) || (cashFinStatus === 'void' && (cashActionable ?? 0) === 0),
      metric:
        cashFinStatus === 'void'
          ? (cashActionable ?? 0) > 0
            ? `${fmt(cashActionable)} / ${fmt(cashAcked)} acked`
            : `N/A (${fmt(cashAcked)} acked)`
          : cashGap != null
            ? `${fmt(cashGap)} gaps`
            : '—',
    },
    {
      id: 7,
      title: 'Ratios',
      short: 'PG ingest',
      status: ratiosFinStatus,
      done: finGapOk(ratiosGap) || (ratiosFinStatus === 'void' && (ratiosActionable ?? 0) === 0),
      metric:
        ratiosFinStatus === 'void'
          ? (ratiosActionable ?? 0) > 0
            ? `${fmt(ratiosActionable)} / ${fmt(ratiosAcked)} acked`
            : `N/A (${fmt(ratiosAcked)} acked)`
          : ratiosGap != null
            ? `${fmt(ratiosGap)} gaps`
            : '—',
    },
    {
      id: 8,
      title: 'Short interest',
      short: 'PG ingest',
      status: shortIntFinStatus,
      done: finGapOk(shortIntGap) || (shortIntFinStatus === 'void' && (shortIntActionable ?? 0) === 0),
      metric:
        shortIntFinStatus === 'void'
          ? (shortIntActionable ?? 0) > 0
            ? `${fmt(shortIntActionable)} / ${fmt(shortIntAcked)} acked`
            : `N/A (${fmt(shortIntAcked)} acked)`
          : shortIntGap != null
            ? `${fmt(shortIntGap)} gaps`
            : '—',
    },
    {
      id: 9,
      title: 'Short volume',
      short: 'PG ingest',
      status: shortVolFinStatus,
      done: finGapOk(shortVolGap) || (shortVolFinStatus === 'void' && (shortVolActionable ?? 0) === 0),
      metric:
        shortVolFinStatus === 'void'
          ? (shortVolActionable ?? 0) > 0
            ? `${fmt(shortVolActionable)} / ${fmt(shortVolAcked)} acked`
            : `N/A (${fmt(shortVolAcked)} acked)`
          : shortVolGap != null
            ? `${fmt(shortVolGap)} gaps`
            : '—',
    },
    {
      id: 10,
      title: 'Evaluate & publish',
      short: 'Fund + Snapshot',
      status: (fundStepStatus === 'error' || matSnapshotStepStatus === 'error'
        ? 'error'
        : fundStepStatus === 'loading' || matSnapshotStepStatus === 'loading'
          ? 'loading'
          : fundStepStatus === 'warn'
            ? 'warn'
            : fundStepStatus === 'ok' && matSnapshotStepStatus === 'ok'
              ? 'ok'
              : 'unknown') as CheckStatus,
      done: fundStepDone && matSnapshotStepDone,
      metric: matSnapshotStepDone
        ? `${fmt(snap?.rows_total)} rows · ${fmt(fundCacheValid)} cached`
        : fundCacheValid > 0
          ? `${fmt(fundCacheValid)} cached`
          : 'not run',
    },
  ]

  const runbookStages: RunbookStageView[] = RUNBOOK_STAGE_LAYOUT.map(meta => {
    const steps = meta.stepIds
      .map(id => runbookSteps.find(s => s.id === id))
      .filter((s): s is RunbookStepView => s != null)
    const stageStatus = foldStageStatus(steps.map(s => s.status))
    const doneCount = steps.filter(s => s.done).length
    return {
      ...meta,
      steps,
      stageStatus,
      doneCount,
      stageDone: doneCount === steps.length && steps.length > 0,
      containsActive: steps.some(s => s.id === activeRunStep),
    }
  })

  return {
    runbookSteps,
    runbookStages,
    universeCount,
    tickersActive,
    priceReady,
    totalSymbols,
    priceGap,
    vendorFillGap,
    notesCount,
    step1Status,
    holidaysStatus,
    unifiedSnapStatus,
    barStepStatus,
    matSnapshotStepStatus,
    fundStepStatus,
    incomeFinStatus,
    balanceFinStatus,
    cashFinStatus,
    ratiosFinStatus,
    shortIntFinStatus,
    shortVolFinStatus,
    reviewStepStatus,
    incomeGap,
    balanceGap,
    cashGap,
    ratiosGap,
    shortIntGap,
    shortVolGap,
    incomeActionable,
    balanceActionable,
    cashActionable,
    ratiosActionable,
    shortIntActionable,
    shortVolActionable,
    incomeAcked,
    balanceAcked,
    cashAcked,
    ratiosAcked,
    shortIntAcked,
    shortVolAcked,
    unifiedSnapRows,
    fundCacheValid,
    holidaysTotal,
    holidaysMassive,
    holidaysSeed,
    holidaysEarlyClose,
    holidaysLastSync,
    holidaysEarliest,
    holidaysLatest,
  }
}
