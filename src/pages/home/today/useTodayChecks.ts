/**
 * The questions Today asks, and what each one can answer.
 *
 * Every check reads a page that already owns its figure — Expiration, Limits,
 * Assignment, Margin, Plans, Orders & Fills, Corporate Actions — through the
 * shared hook or model that page uses, so a row here and the page it links to
 * cannot disagree (§14.2). Nothing is re-derived and nothing is written.
 *
 * Six of the thirteen checks cannot run at all on this book, and each says
 * which half is missing rather than answering "clean". They are the honest
 * shape of the system today, not an oversight: no daily snapshot means no
 * overnight capital move, no plan has ever been linked to a position so no stop
 * or planned exit can be watched, no future earnings date reaches this side,
 * and nothing records that a trade was reviewed.
 */
import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchStrategyPlans } from '@/api/strategyPlans'
import { fetchCorporateActions } from '@/api/marketData/corporateActions'
import { useExecutionsCanonical } from '@/hooks/useExecutions'
import { useAssignmentLegs } from '@/hooks/useAssignmentLegs'
import { useRiskExposure } from '@/hooks/useRiskExposure'
import { usePressureCeiling } from '@/hooks/usePressureCeiling'
import { HOUSE_GATE_PCT } from '@/utils/backingJudgment'
import { rollupMargin } from '@/utils/marginPressure'
import { RISK_CONCENTRATION_FLOOR } from '@/utils/riskExposure'
import { shortOptContractKey } from '@/utils/ledger/optionsModeBridge'
import { daysTo } from '@/utils/optionTicker'
import { fmtIsoDateToken } from '@/lib/format'
import { fmtPct0 } from '@/utils/positions'
import { computeDailyChange, resolveDailyBasePrice } from '@/utils/dailyChange'
import { limitRules, openBreaches, withHeadroom } from '@/pages/risk/limits/limitsModel'
import type { HomeCheck, HomeRow, TapeRow } from './todayModel'

/** Inside this many days, an expiry is a decision rather than a date. */
const EXPIRY_WINDOW_DAYS = 2
/** Within this much of the strike at expiry, a leg is a pin rather than a position. */
const PIN_BAND = 0.01
/** The benchmark every β on this side is measured against. */
const BENCHMARK_SYMBOL = 'SPY'

function row(
  check: Omit<HomeCheck, 'rows' | 'cannotRun'>,
  n: number,
  r: Omit<HomeRow, 'key' | 'seg' | 'layer' | 'to'>,
): HomeRow {
  return { key: `${check.key}:${n}`, seg: check.seg, layer: check.layer, to: check.to, ...r }
}

export function useTodayChecks(accountFilter: string) {
  const exposure = useRiskExposure(accountFilter)
  const assignment = useAssignmentLegs()
  const { ceiling } = usePressureCeiling()
  const execQuery = useExecutionsCanonical()
  const plansQuery = useQuery({ queryKey: ['strategy', 'plans', 'home'], queryFn: () => fetchStrategyPlans({}) })

  // The book's dates are calendar dates on the desk, not UTC ones: after 20:00
  // ET `toISOString()` is already tomorrow, and "fills booked today" would look
  // at the wrong day.
  const [today] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  const book = exposure.book
  /** Names carrying an open leg — the only ones an event can reshape here. */
  const legSymbols = useMemo(
    () => [...new Set(assignment.legs.map((l) => l.symbol))].sort(),
    [assignment.legs],
  )

  // Only the newest rows are needed: the read orders by ex_date descending, so
  // anything dated ahead is on the first page. The key carries the limit so it
  // never collides with the Corporate Actions page's deeper pull.
  const caQueries = useQueries({
    queries: legSymbols.map((symbol) => ({
      queryKey: ['market-data', 'corporate-actions', symbol, 50],
      queryFn: () => fetchCorporateActions(symbol, 50),
      enabled: Boolean(symbol),
      staleTime: 60 * 60_000,
    })),
  })
  const caStamp = caQueries.map((q) => q.dataUpdatedAt).join(',')
  const eventsAhead = useMemo(() => {
    const out: { symbol: string; exDate: string; kind: string }[] = []
    caQueries.forEach((q, i) => {
      for (const r of q.data?.rows ?? []) {
        const ex = (r.ex_date ?? '').slice(0, 10)
        if (ex && ex > today) out.push({ symbol: legSymbols[i], exDate: ex, kind: r.action_type })
      }
    })
    return out.sort((a, b) => a.exDate.localeCompare(b.exDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caStamp, legSymbols, today])

  const margin = useMemo(
    () =>
      rollupMargin(
        (exposure.status?.portfolio?.accounts ?? []).filter(
          (a) => accountFilter === 'all' || (a.account_id ?? '').trim() === accountFilter,
        ),
      ),
    [exposure.status, accountFilter],
  )

  /** Limits' own book, held against its own lines — the same model that page draws. */
  const breaches = useMemo(() => {
    const rows = withHeadroom(
      limitRules({
        topNameShare: exposure.rows[0]?.share ?? null,
        concentrationFloor: RISK_CONCENTRATION_FLOOR,
        clusterShare: exposure.clusters.find((c) => c.members.length > 1)?.share ?? null,
        contractsToday: null,
        contractsTodayDate: null,
        newUnderlyingsThisWeek: null,
        buyingPowerBuffer: margin.pressure == null ? null : 1 - margin.pressure,
        bufferFloor: 1 - ceiling,
        backingUsed: exposure.judgment?.usedPct ?? null,
        backingGate: HOUSE_GATE_PCT,
        maintenanceOverNlv: margin.netLiquidation > 0 ? margin.maintMarginReq / margin.netLiquidation : null,
        netBetaDelta: null,
        shortGamma: null,
        nakedShortPuts: null,
      }),
    )
    return openBreaches(rows)
  }, [exposure.rows, exposure.clusters, exposure.judgment, margin, ceiling])

  const checks = useMemo<HomeCheck[]>(() => {
    const out: HomeCheck[] = []
    const legs = assignment.legs

    // ── Pre-open ────────────────────────────────────────────────────────────
    const expiring = legs.filter((l) => l.dte != null && l.dte >= 0 && l.dte <= EXPIRY_WINDOW_DAYS)
    const expiringCheck = {
      key: 'expiring',
      seg: 'pre' as const,
      layer: 'trade' as const,
      question: `Does a short leg expire within ${EXPIRY_WINDOW_DAYS} days?`,
      to: '/trade/expiration',
    }
    const undated = legs.filter((l) => l.dte == null).length
    out.push({
      ...expiringCheck,
      cannotRun: null,
      partial: undated > 0 ? `${undated} legs carry no readable expiry` : null,
      rows: expiring.map((l, i) =>
        row(expiringCheck, i, {
          urg: l.dte === 0 ? 'now' : 'soon',
          what: `${shortOptContractKey(l.contractKey)} expires ${l.dte === 0 ? 'today' : `in ${l.dte} days`}`,
          why: `${l.contracts} short. Decide assign, close or roll before the close.`,
        }),
      ),
    })

    const eventCheck = {
      key: 'corporate-event',
      seg: 'pre' as const,
      layer: 'portfolio' as const,
      question: 'Does a corporate action land on an open leg?',
      to: '/portfolio/corporate-actions',
    }
    out.push({
      ...eventCheck,
      cannotRun: null,
      rows: eventsAhead.map((e, i) =>
        row(eventCheck, i, {
          urg: 'soon',
          what: `${e.kind} on ${e.symbol}, ex ${fmtIsoDateToken(e.exDate)}`,
          why: 'An open leg on this name would be rewritten. Check what it does to the contract and to backing.',
        }),
      ),
    })

    out.push({
      key: 'earnings',
      seg: 'pre',
      layer: 'research',
      question: 'Does a holding report earnings this week?',
      to: '/research/events',
      rows: [],
      cannotRun:
        'no future earnings date reaches this side for any name in the book, so the week ahead cannot be read',
    })
    out.push({
      key: 'overnight-capital',
      seg: 'pre',
      layer: 'risk',
      question: 'Did buying power move overnight?',
      to: '/risk/margin',
      cannotRun:
        'the broker reports buying power as it stands, and nothing stores yesterday’s, so the change cannot be taken',
      rows: [],
    })
    out.push({
      key: 'stop-breach',
      seg: 'pre',
      layer: 'portfolio',
      question: 'Did a position pass the stop its plan set?',
      to: '/portfolio/positions',
      cannotRun:
        'Trade Plans stores a stop, but no plan has ever been linked to a position, so there is nothing to hold a mark against',
      rows: [],
    })
    out.push({
      key: 'unreviewed',
      seg: 'pre',
      layer: 'review',
      question: 'Are closed trades waiting to be reviewed?',
      to: '/review',
      cannotRun: 'nothing records that a trade was reviewed, so reviewed and unreviewed read the same',
      rows: [],
    })

    // ── Intraday ────────────────────────────────────────────────────────────
    const limitCheck = {
      key: 'limits',
      seg: 'rth' as const,
      layer: 'risk' as const,
      question: 'Is any limit over its line?',
      to: '/risk/limits',
    }
    out.push({
      ...limitCheck,
      cannotRun: null,
      rows: breaches.map((b, i) =>
        row(limitCheck, i, {
          urg: b.kind === 'hard' ? 'now' : 'soon',
          what: `${b.name} is over its line`,
          why: `${b.unit === 'pct' ? fmtPct0(b.current ?? 0) : String(b.current)} against ${
            b.unit === 'pct' ? fmtPct0(b.limit ?? 0) : String(b.limit)
          }. ${b.onBreach}.`,
        }),
      ),
    })

    const plans = plansQuery.data?.items ?? []
    const ready = plans.filter((p) => p.effective_status === 'intended')
    const planCheck = {
      key: 'plans-ready',
      seg: 'rth' as const,
      layer: 'trade' as const,
      question: 'Is a plan ready to place?',
      to: '/trade/plans',
    }
    out.push({
      ...planCheck,
      cannotRun: null,
      rows: ready.map((p, i) =>
        row(planCheck, i, {
          urg: 'soon',
          what: `${p.symbol ?? 'a plan'} is intended and not yet filled`,
          why: `${p.structure_label ?? 'Plan'} — size it against the budget before placing.`,
        }),
      ),
    })

    out.push({
      key: 'planned-exit',
      seg: 'rth',
      layer: 'portfolio',
      question: 'Is a position past the exit its plan set?',
      to: '/portfolio/positions',
      cannotRun: 'the same missing link as the stop: no plan has ever reached a position',
      rows: [],
    })
    out.push({
      key: 'candidates',
      seg: 'rth',
      layer: 'research',
      question: 'Are there new candidates above threshold?',
      to: '/research/scan',
      cannotRun: 'the scan this would read is not built on this side yet',
      rows: [],
    })

    // ── Pre-close ───────────────────────────────────────────────────────────
    const pinning = expiring.filter((l) => l.cushionPct != null && Math.abs(l.cushionPct) <= PIN_BAND)
    const pinCheck = {
      key: 'pin',
      seg: 'close' as const,
      layer: 'trade' as const,
      question: 'Is a short strike pinning into the close?',
      to: '/trade/expiration',
    }
    const unpriced = legs.filter((l) => l.cushionPct == null).length
    out.push({
      ...pinCheck,
      cannotRun: null,
      partial: unpriced > 0 ? `${unpriced} legs carry no spot, so their distance to the strike is unread` : null,
      rows: pinning.map((l, i) =>
        row(pinCheck, i, {
          urg: 'now',
          what: `${shortOptContractKey(l.contractKey)} is on its strike`,
          why: 'Spot is within 1% of the strike with the session running out — assignment is a coin flip.',
        }),
      ),
    })

    const itm = legs.filter((l) => l.itm === true)
    const itmCheck = {
      key: 'itm',
      seg: 'close' as const,
      layer: 'portfolio' as const,
      question: 'Is a short leg in the money?',
      to: '/trade/assignment',
    }
    out.push({
      ...itmCheck,
      cannotRun: null,
      partial: unpriced > 0 ? `${unpriced} legs carry no spot, so their moneyness is unread` : null,
      rows: itm.map((l, i) =>
        row(itmCheck, i, {
          urg: l.dte != null && l.dte <= EXPIRY_WINDOW_DAYS ? 'now' : 'today',
          what: `${shortOptContractKey(l.contractKey)} is in the money`,
          why: `${l.contracts} short, ${l.dte == null ? 'no expiry read' : `${l.dte} days left`}. Assignment says what the book becomes if it is exercised.`,
        }),
      ),
    })

    const fillsToday = (execQuery.data?.items ?? []).filter((e) => (e.trade_date ?? '').slice(0, 10) === today)
    const fillCheck = {
      key: 'fills',
      seg: 'close' as const,
      layer: 'trade' as const,
      question: 'Are there fills from this session to reconcile?',
      to: '/trade/fills',
    }
    out.push({
      ...fillCheck,
      cannotRun: null,
      rows:
        fillsToday.length === 0
          ? []
          : [
              row(fillCheck, 0, {
                urg: 'soon',
                what: `${fillsToday.length} fills booked today`,
                why: 'Check them against what was intended before the day closes.',
              }),
            ],
    })

    return out
  }, [assignment.legs, eventsAhead, breaches, plansQuery.data?.items, execQuery.data?.items, today])

  /**
   * The ambient tape: what a short-premium book watches on open.
   *
   * The design's rule, not a quote board — the benchmark β is measured
   * against, then the names carrying the most exposure, with a note on each
   * saying why it is there. Quotes come from the same map the Positions page
   * reads; outside the session the cache is empty and the rows say so rather
   * than showing a stale last as though it were live.
   */
  const tape = useMemo<TapeRow[]>(() => {
    const top = exposure.rows.filter((r) => r.betaDeltaDollars != null).slice(0, 4)
    const itm = new Set(assignment.legs.filter((l) => l.itm === true).map((l) => l.symbol))
    const rowFor = (symbol: string, note: string): TapeRow => {
      const q = book.quotesBySymbol[symbol]
      // A quote carries no prior close; the benchmark map is where it lives.
      const base = resolveDailyBasePrice(null, book.benchBySymbol[symbol])
      const { dailyPct } = computeDailyChange(q?.last ?? null, base)
      return { symbol, last: q?.last ?? null, changePct: dailyPct, note }
    }
    return [
      rowFor(BENCHMARK_SYMBOL, 'β is measured against it'),
      ...top.map((r, i) =>
        rowFor(
          r.symbol,
          itm.has(r.symbol) ? 'through the strike' : i === 0 ? 'largest β-weighted Δ$' : 'top exposure',
        ),
      ),
    ]
  }, [exposure.rows, assignment.legs, book.quotesBySymbol, book.benchBySymbol])

  return {
    checks,
    tape,
    today,
    accountIds: exposure.accountIds,
    book,
    exposure,
    loading: exposure.statusLoading || assignment.loading,
    error: exposure.error ?? assignment.error ?? null,
    /** True when `daysTo` cannot read an expiry — kept so the caller can say so. */
    unreadableExpiries: assignment.legs.filter((l) => l.dte == null).length,
    daysToToday: (expiry: string) => daysTo(expiry, today),
  }
}
