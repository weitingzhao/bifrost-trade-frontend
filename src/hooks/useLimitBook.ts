/**
 * The limit book, assembled once.
 *
 * Twelve house rules plus the gate's, each with what it reads now and the
 * line it is held against. It lives here rather than on Limits & Breaches
 * because three pages want the same book and none of them may build a second
 * one: Limits draws it in full, Risk (the layer page) sorts it by how much of
 * each line is spent, and Today asks it for open breaches. A second assembly
 * would be a second answer to "am I over a line", which is the one question
 * where two answers is worse than none.
 *
 * It is expensive, and honestly so: the model service per account, the
 * positions book, Research's β and correlation, the fills, the allocation and
 * its gate. That cost is why the status bar reads a cheap subset instead
 * (`useRiskLimitWatch`) and says which lines it is not watching.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fmtIsoDateToken } from '@/lib/format'
import { extractUnderlyingRootSymbol } from '@/utils/optionTicker'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { rollupMargin } from '@/utils/marginPressure'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { readInstances } from '@/utils/strategyInstances'
import {
  fetchAllocations,
  fetchGateSafety,
  fetchGateSafetyFull,
  fetchStrategyInstances,
} from '@/api/strategy'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { gateLimitRules, limitRules, withHeadroom, type GateReadings, type LimitRow } from '@/utils/limitsModel'

/**
 * The window "new underlyings this week" looks back over.
 *
 * Six days, not seven: the newest fill date is itself inside the window, so
 * seven would reach back into the same weekday a week earlier and count a
 * name that had already been seen as new.
 */
const WEEK_MS = 6 * 86_400_000

/** Everything the two pages that draw the book need from it. */
export interface LimitBook {
  rows: LimitRow[]
  /** Accounts the reader can narrow to. */
  accountIds: string[]
  statusLoading: boolean
  /** Per-account model reads, so a page can say which ones have not answered. */
  modelQueries: ReturnType<typeof useRiskExposure>['modelQueries']
  error: ReturnType<typeof useRiskExposure>['error']
  /** The exposure the concentration lines are read from — cited, not redrawn. */
  exposure: ReturnType<typeof useRiskExposure>['rows']
  judgment: ReturnType<typeof useRiskExposure>['judgment']
  gateReadings: GateReadings
}

/**
 * @param accountFilter `'all'`, or the account id the reader narrowed to.
 */
export function useLimitBook(accountFilter: string): LimitBook {
  const { ceiling } = usePressureCeiling()
  const { status, statusLoading, accountIds, modelQueries, book, legs, rows: exposure, totals, clusters, judgment, error } =
    useRiskExposure(accountFilter)

  const margin = useMemo(
    () =>
      rollupMargin(
        (status?.portfolio?.accounts ?? []).filter(
          (a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter,
        ),
      ),
    [status, accountFilter],
  )

  /** Velocity, read off the same fills Orders & Fills lists. */
  const execQuery = useExecutionsCanonical()
  const velocity = useMemo(() => {
    const dated = (execQuery.data?.items ?? []).filter((e) => (e.trade_date ?? '').length >= 8)
    if (dated.length === 0) return { contracts: null, date: null, newNames: null }
    const newest = dated.reduce((a, e) => ((e.trade_date ?? '') > a ? (e.trade_date ?? '') : a), '')
    const weekFloor = new Date(Date.parse(`${newest.slice(0, 10)}T00:00:00Z`) - WEEK_MS).toISOString().slice(0, 10)
    let contracts = 0
    const inWeek = new Set<string>()
    const before = new Set<string>()
    for (const e of dated) {
      const day = (e.trade_date ?? '').slice(0, 10)
      const symbol = extractUnderlyingRootSymbol(e.symbol)
      if (day >= weekFloor) {
        if (symbol) inWeek.add(symbol)
        if (day === newest.slice(0, 10) && (e.sec_type ?? '').toUpperCase() === 'OPT') {
          contracts += Math.abs(Number(e.quantity ?? e.qty ?? 0)) || 0
        }
      } else if (symbol) before.add(symbol)
    }
    return { contracts, date: newest.slice(0, 10), newNames: [...inWeek].filter((s) => !before.has(s)).length }
  }, [execQuery.data?.items])

  /**
   * Naked in the options sense: short puts with no long put in the same name
   * behind them. Whether what remains is cash-secured is Backing's question.
   */
  const nakedShortPuts = useMemo(() => {
    if (book.isLoading) return null
    const shortBy = new Map<string, number>()
    const longBy = new Map<string, number>()
    for (const p of book.filteredOptions) {
      if ((p.right ?? '').toUpperCase() !== 'P') continue
      const symbol = extractUnderlyingRootSymbol(p.symbol)
      const qty = Number(p.qty ?? 0)
      if (qty < 0) shortBy.set(symbol, (shortBy.get(symbol) ?? 0) + Math.abs(qty))
      else if (qty > 0) longBy.set(symbol, (longBy.get(symbol) ?? 0) + qty)
    }
    let n = 0
    for (const [symbol, short] of shortBy) n += Math.max(0, short - (longBy.get(symbol) ?? 0))
    return n
  }, [book.isLoading, book.filteredOptions])

  /**
   * The gate the daemon runs under — the only limits in this book anyone has
   * written down. Design DECISIONS 2026-09-18: a gate is a limit at scope =
   * allocation, defined in Trade › Rules and read here.
   */
  const allocationsQuery = useQuery({
    queryKey: ['strategy', 'allocations'],
    queryFn: () => fetchAllocations(),
  })
  const instancesQuery = useQuery({
    queryKey: ['strategy', 'instances'],
    queryFn: () => fetchStrategyInstances(),
  })
  const gatesQuery = useQuery({ queryKey: ['strategy', 'gate-safety'], queryFn: fetchGateSafety })

  const allocation = (allocationsQuery.data?.items ?? []).find((a) => a.is_active) ?? null
  // The allocation names its own gate; the active-gate list is the fallback for
  // an allocation that carries none.
  const gateId =
    allocation?.gate_safety_strategy_id ??
    (gatesQuery.data?.items ?? []).find((g) => g.is_active)?.gate_safety_strategy_id ??
    null
  const gateFullQuery = useQuery({
    queryKey: ['strategy', 'gate-safety', gateId],
    queryFn: () => fetchGateSafetyFull(gateId!),
    enabled: gateId != null,
  })

  const gateReadings = useMemo<GateReadings>(() => {
    const gate = gateFullQuery.data ?? null
    const guard = ((gate?.gates as Record<string, unknown> | undefined)?.guard as
      | Record<string, unknown>
      | undefined)?.risk as Record<string, unknown> | undefined
    if (allocation == null || gate == null) {
      return {
        allocationName: allocation?.name ?? null,
        gateName: gate?.name ?? null,
        gateVersion: gate?.version ?? null,
        guard: guard ?? null,
        openInstances: null,
        maxPositions: allocation?.max_positions ?? null,
        lossToday: null,
        paperTrade: typeof guard?.paper_trade === 'boolean' ? (guard.paper_trade as boolean) : null,
      }
    }
    const oppIds = new Set(allocation.strategy_opportunity_ids ?? [])
    const mine = readInstances(instancesQuery.data?.items ?? [], execQuery.data?.items ?? []).filter((i) =>
      oppIds.has(i.opportunityId),
    )
    const today = new Date().toISOString().slice(0, 10)
    const closedToday = mine.filter((i) => i.closed && i.openedOn != null)
    const todayFills = (execQuery.data?.items ?? []).filter(
      (e) => (e.trade_date ?? '').slice(0, 10) === today && e.strategy_instance_id != null,
    )
    return {
      allocationName: allocation.name,
      gateName: gate.name,
      gateVersion: gate.version,
      guard: guard ?? null,
      openInstances: mine.filter((i) => !i.closed).length,
      maxPositions: allocation.max_positions ?? null,
      // Nothing settled under the allocation today is a reading of zero loss,
      // not an absence — but only once a fill today exists to say so.
      lossToday: todayFills.length === 0 ? null : closedToday.reduce((a, i) => a + (i.realised ?? 0), 0),
      paperTrade: typeof guard?.paper_trade === 'boolean' ? (guard.paper_trade as boolean) : null,
    }
  }, [allocation, gateFullQuery.data, instancesQuery.data?.items, execQuery.data?.items])

  const rows = useMemo(
    () =>
      withHeadroom([
        ...limitRules({
          topNameShare: exposure[0]?.share ?? null,
          concentrationFloor: RISK_CONCENTRATION_FLOOR,
          clusterShare: clusters.find((c) => c.members.length > 1)?.share ?? null,
          contractsToday: velocity.contracts,
          contractsTodayDate: velocity.date ? fmtIsoDateToken(velocity.date) : null,
          newUnderlyingsThisWeek: velocity.newNames,
          buyingPowerBuffer: margin.pressure == null ? null : 1 - margin.pressure,
          bufferFloor: 1 - ceiling,
          backingUsed: judgment?.usedPct ?? null,
          backingGate: HOUSE_GATE_PCT,
          maintenanceOverNlv: margin.netLiquidation > 0 ? margin.maintMarginReq / margin.netLiquidation : null,
          netBetaDelta: totals.withBetaDelta > 0 ? totals.betaDeltaDollars : null,
          shortGamma: legs.length > 0 ? totals.gamma : null,
          nakedShortPuts,
        }),
        ...gateLimitRules(gateReadings),
      ]),
    [exposure, clusters, velocity, margin, ceiling, judgment, totals, legs.length, nakedShortPuts, gateReadings],
  )


  return { rows, accountIds, statusLoading, modelQueries, error, exposure, judgment, gateReadings }
}
