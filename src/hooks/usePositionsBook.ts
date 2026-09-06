/**
 * The book, derived once for the two pages that read it.
 *
 * Positions (what is in the book and where it is tight) and Backing (what the
 * options need and what backs them) are two screens over one model. Keeping
 * the derivation here — fetch, scope, grouping, Greeks, the alarm, the cover
 * arithmetic — means a number on one page cannot disagree with the same number
 * on the other, and neither page carries three hundred lines of memos.
 *
 * Input is the page scope (accounts, symbol, expiry) and the tightness
 * setting. Grid-only filters stay on the Positions page: they change what the
 * grid shows, never what the book is.
 */
import { useMemo } from 'react'
import { useMonitorStatus } from './useMonitorStatus'
import { useQuotes } from './useQuotes'
import { useBenchmarks } from './useBenchmarks'
import { usePositionAttribution } from './usePositionAttribution'
import { useExecutionsFinal, useExecutionsTws, useExecutionsCanonical } from './useExecutions'
import { useOpportunities, useStructures, useStrategyInstances } from './useStrategies'
import { useOptionGreeks, type GreekLeg } from './useOptionGreeks'
import { usePositionsAlarm } from './usePositionsAlarm'
import { useLatestBars } from './useLatestBars'
import { buildSpotResolver, repriceRows } from '@/utils/spotPrice'
import type { PositionsScope } from './usePositionsScope'
import {
  buildQuoteMap,
  buildCkMap,
  uniqueSymbols,
  uniqueContractKeys,
  uniqueOptionUnderlyings,
} from '@/utils/positions'
import {
  flattenPositions,
  splitBySecType,
  filterStocksByBucket,
  buildOpenOptionPositions,
  positionMatchesAccountFilter,
} from '@/utils/positionsGrouping'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'
import { buildInstanceAllGroups } from '@/utils/buildInstanceAllGroups'
import { buildCanonicalOptContractKeySet } from '@/utils/execAttributionSync'
import { buildInstanceGroups } from '@/utils/buildInstanceGroups'
import { sortInstanceGroupOptions } from '@/utils/instanceGroupSort'
import { extractUnderlyingRootSymbol } from '@/components/positions/linkExecutionModalHelpers'
import { rollupMargin } from '@/utils/marginPressure'
import { coverByAccountSymbol } from '@/utils/bookVsBase'
import { buildObligationsRows } from '@/utils/obligationsRows'
import { buildRiskMapLegs } from '@/utils/shortLegRiskMap'

function optionExpiryMatchesFilter(expiryRaw: string, filterRaw: string): boolean {
  const f = filterRaw.replace(/\D/g, '')
  if (!f) return true
  const ex = (expiryRaw ?? '').replace(/\D/g, '')
  if (!ex) return false
  if (ex.length >= f.length) return ex.startsWith(f)
  return f.startsWith(ex)
}

export function usePositionsBook(scope: PositionsScope, cushionTightPct: number) {
  const { accountFilter, filterSymbol, filterExpiry } = scope
  const { data, isLoading, isError, error } = useMonitorStatus()
  const { data: attrData } = usePositionAttribution()
  const { data: execFinalData } = useExecutionsFinal()
  const { data: execTwsData } = useExecutionsTws()
  const { data: execCanonicalData } = useExecutionsCanonical()
  const { data: oppsData } = useOpportunities()
  const { data: structsData } = useStructures()
  const { data: instancesData } = useStrategyInstances()

  const accounts = useMemo(() => data?.portfolio.accounts ?? [], [data])
  const hostAccountId = data?.config?.ib_client?.account?.event_host ?? ''
  const secondaryAccountId = data?.config?.ib_client?.account?.event_secondary ?? ''
  const scopedAccounts = useMemo(
    () =>
      accounts.filter((a) =>
        positionMatchesAccountFilter(a.account_id ?? '', accountFilter, hostAccountId, secondaryAccountId),
      ),
    [accounts, accountFilter, hostAccountId, secondaryAccountId],
  )

  const rawPositions = useMemo(
    () =>
      flattenPositions(accounts).filter((p) =>
        positionMatchesAccountFilter(p.account_id, accountFilter, hostAccountId, secondaryAccountId),
      ),
    [accounts, accountFilter, hostAccountId, secondaryAccountId],
  )

  // Include the underlyings of held options, not just held stock: a short put
  // on a symbol with no share position still needs a spot to be measured against.
  const stkSymbols = [...new Set([...uniqueSymbols(accounts), ...uniqueOptionUnderlyings(accounts)])]
  const optCks = uniqueContractKeys(accounts)
  const { data: quotesData } = useQuotes(stkSymbols, optCks)
  const { data: benchData } = useBenchmarks(stkSymbols)
  const quotesBySymbol = buildQuoteMap(quotesData)
  const quotesByCk = buildCkMap(quotesData)
  const benchBySymbol = useMemo(() => benchData?.benchmarks ?? {}, [benchData?.benchmarks])
  const barsBySymbol = useLatestBars(stkSymbols)

  // The snapshot's price on a stock row is the broker's mark, and on DEV it
  // has read March for six months. Every reader of row.price — market values,
  // cover valuation, the rings — gets the rows re-priced once through the same
  // resolver the risk side uses: live, then the dated close, then the mark only
  // if it is fresher than the close.
  const allPositions = useMemo(() => {
    const resolve = buildSpotResolver(quotesBySymbol, rawPositions, barsBySymbol)
    return repriceRows(rawPositions, resolve, barsBySymbol)
  }, [rawPositions, quotesBySymbol, barsBySymbol])
  const { stocks: allStocks, options: allOptions } = useMemo(() => splitBySecType(allPositions), [allPositions])
  const coreStocks = useMemo(() => filterStocksByBucket(allStocks, 'core'), [allStocks])
  // A symbol scope narrows the book on both sides: that symbol's legs and that
  // symbol's shares. Cash and income ETFs are not symbol-specific and stay.
  const scopedCoreStocks = useMemo(
    () => (filterSymbol ? coreStocks.filter((p) => (p.symbol ?? '').toUpperCase().includes(filterSymbol)) : coreStocks),
    [coreStocks, filterSymbol],
  )
  const fixedIncomeStocks = useMemo(() => filterStocksByBucket(allStocks, 'fixed_income'), [allStocks])
  const cashLikeStocks = useMemo(() => filterStocksByBucket(allStocks, 'cash_like'), [allStocks])

  const executionsFinal = useMemo(() => execFinalData?.items ?? [], [execFinalData])
  const executionsTws = useMemo(() => execTwsData?.items ?? [], [execTwsData?.items])
  const canonicalOptContractKeys = useMemo(
    () => buildCanonicalOptContractKeySet(execCanonicalData?.items ?? []),
    [execCanonicalData],
  )
  const opportunities = useMemo(() => oppsData?.items ?? [], [oppsData?.items])
  const structures = useMemo(() => structsData?.items ?? [], [structsData?.items])
  const attributions = useMemo(() => attrData?.items ?? [], [attrData])
  const instanceStructureById = useMemo(() => {
    const map = new Map<number, number | null | undefined>()
    for (const inst of instancesData?.items ?? []) {
      map.set(inst.strategy_instance_id, inst.strategy_structure_id)
    }
    return map
  }, [instancesData?.items])

  const liveOptions = useMemo(() => buildOpenOptionPositions(allOptions, attributions), [allOptions, attributions])
  const showOffTrack = accountFilter.host && accountFilter.secondary
  const offTrackPositions = useMemo(
    () => (showOffTrack ? buildOffTrackPositions(executionsFinal, filterSymbol, filterExpiry) : []),
    [showOffTrack, executionsFinal, filterSymbol, filterExpiry],
  )
  const openOptions = useMemo(() => [...liveOptions, ...offTrackPositions], [liveOptions, offTrackPositions])

  const baseInstanceGroups = useMemo(
    () =>
      buildInstanceGroups({
        attributions,
        liveOptions: allOptions,
        accountFilter,
        hostAccountId,
        secondaryAccountId,
        filterSymbol,
        filterExpiry,
        showOffTrack,
        executionsFinal,
      }),
    [attributions, allOptions, accountFilter, hostAccountId, secondaryAccountId, filterSymbol, filterExpiry, showOffTrack, executionsFinal],
  )
  const instanceAllGroups = useMemo(
    () =>
      buildInstanceAllGroups({
        instanceGroups: baseInstanceGroups,
        attributions,
        executionsFinal,
        executionsTws,
        opportunities,
        structures,
        liveStocks: allStocks,
      }),
    [baseInstanceGroups, attributions, executionsFinal, executionsTws, opportunities, structures, allStocks],
  )
  /** The scope bar's set — accounts, symbol, expiry — with no grid filter applied. */
  const scopedInstanceGroups = useMemo(() => sortInstanceGroupOptions(instanceAllGroups), [instanceAllGroups])

  const instanceFilterOptions = useMemo(() => {
    const structureTypes = [...new Set(instanceAllGroups.map((g) => g.structure_type).filter(Boolean) as string[])]
    const oppNames = [
      ...new Set(instanceAllGroups.map((g) => g.strategy_opportunity_name).filter(Boolean) as string[]),
    ]
    const scopeTypes = [...new Set(instanceAllGroups.map((g) => g.scope_type).filter(Boolean) as string[])]
    return { structureTypes, oppNames, scopeTypes }
  }, [instanceAllGroups])

  const filteredOptions = useMemo(() => {
    let list = openOptions
    const sym = filterSymbol.trim().toUpperCase()
    if (sym) list = list.filter((p) => (p.symbol ?? '').toUpperCase().includes(sym))
    const exp = filterExpiry.trim()
    if (exp) list = list.filter((p) => optionExpiryMatchesFilter(p.expiry, exp))
    return list
  }, [openOptions, filterSymbol, filterExpiry])

  const totalPositions = allPositions.length
  const portfolioPositionCount = useMemo(() => flattenPositions(accounts).length, [accounts])
  const hasAccountSelection = (!hostAccountId && !secondaryAccountId) || accountFilter.host || accountFilter.secondary
  const accountOptions = useMemo(
    () => [...new Set(accounts.map((a) => a.account_id ?? '').filter(Boolean))],
    [accounts],
  )

  // Vendor Greeks for the legs actually held (Owner decision 2026-09-05: the
  // Golden Source is the authority, not a second in-house derivation).
  const greekLegs: GreekLeg[] = scopedInstanceGroups.flatMap((g) =>
    g.options.map((p) => ({
      underlying: extractUnderlyingRootSymbol(p.symbol),
      expiry: p.expiry,
      strike: p.strike,
      right: p.right,
      qty: p.qty,
    })),
  )
  const greeks = useOptionGreeks(greekLegs)

  // Margin, cash and buying power follow the account scope like the legs do
  // (Owner decision 2026-09-05): with one account off, Pressure is that
  // account's pressure, not a two-account blend.
  const alarm = usePositionsAlarm({
    groups: scopedInstanceGroups,
    quotesBySymbol,
    accounts: scopedAccounts,
    liveStocks: allStocks,
    coreStocks: scopedCoreStocks,
    incomeEtfs: fixedIncomeStocks,
    cashLike: cashLikeStocks,
    thetaPerDay: greeks.matched > 0 ? greeks.theta : null,
    cushionTightPct,
    barsBySymbol,
  })
  /** Every funded account, so a switched-off one is still visible, dimmed. */
  const marginAllAccounts = useMemo(() => rollupMargin(accounts), [accounts])

  const riskLegs = useMemo(
    () => buildRiskMapLegs({ legs: alarm.legs, spotOf: (leg) => alarm.resolveSpot(leg.underlying) }),
    [alarm.legs, alarm.resolveSpot],
  )
  /** Per account × symbol: held, backing, spare — the rows Potential and the obligations are summed from. */
  const coverRows = useMemo(
    () => coverByAccountSymbol(scopedCoreStocks, alarm.exposure.byAccountSymbol).rows,
    [scopedCoreStocks, alarm.exposure.byAccountSymbol],
  )
  /** Unsorted; the Backing page sorts by the column the reader chose. */
  const obligationsRows = useMemo(
    () => buildObligationsRows(alarm.exposure.byAccountSymbol, coverRows, scopedCoreStocks),
    [scopedCoreStocks, alarm.exposure.byAccountSymbol, coverRows],
  )

  return {
    isLoading,
    isError,
    error,
    accounts,
    scopedAccounts,
    hostAccountId,
    secondaryAccountId,
    hasAccountSelection,
    showOpenPositionsPanel: accounts.length > 0,
    totalPositions,
    portfolioPositionCount,
    accountOptions,
    allPositions,
    allStocks,
    coreStocks,
    fixedIncomeStocks,
    cashLikeStocks,
    quotesBySymbol,
    quotesByCk,
    benchBySymbol,
    executionsFinal,
    executionsTws,
    canonicalOptContractKeys,
    opportunities,
    structures,
    attributions,
    instanceStructureById,
    instanceAllGroups,
    scopedInstanceGroups,
    instanceFilterOptions,
    filteredOptions,
    greeks,
    alarm,
    marginAllAccounts,
    riskLegs,
    coverRows,
    obligationsRows,
  }
}

export type PositionsBook = ReturnType<typeof usePositionsBook>
