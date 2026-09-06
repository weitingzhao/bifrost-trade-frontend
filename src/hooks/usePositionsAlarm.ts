/**
 * The checks a premium seller reads before deciding whether to keep reading.
 *
 * The page's opening four questions — is a short leg in the money, what expires
 * this week, am I naked anywhere, how much room is left — sat at y=1369, 1369,
 * 1629 and 2700, so the first act of every morning was scrolling three times.
 * This gathers them into facts the strip can render in one line.
 *
 * Two rules hold this together:
 *
 *  - It derives nothing of its own. Cushion, ITM and expiry come from the single
 *    `buildExpiryLadder` call the ladder section also renders; naked calls come
 *    from the model-analysis query the capital section already runs; margin
 *    comes from the broker's fields. A strip that recomputed would eventually
 *    disagree with the table under it, and the louder number would win.
 *  - Only checks with a threshold. Inventory counts ("13 strategies", "39 short")
 *    have no state to be in, and putting them in an alarm channel is how an
 *    alarm channel stops being read.
 */
import { extractUnderlyingRootSymbol } from '@/components/positions/linkExecutionModalHelpers'
import { instanceGroupKey } from '@/utils/instanceSheetExec'
import { quoteFeedAgeSec } from '@/utils/positions'
import {
  buildExpiryLadder,
  cushionBand,
  type ExpiryLadderRow,
  type LadderLeg,
} from '@/utils/positionsOptionRisk'
import { marginBand, rollupMargin, type MarginRollup } from '@/utils/marginPressure'
import { buildSpotResolver, spotMixOf, type LatestBar, type SpotMix, type SpotResolver } from '@/utils/spotPrice'
import {
  assignmentCoverRatio,
  summarizeAssignmentExposure,
  type ExposureSummary,
} from '@/utils/assignmentExposure'
import type { InstanceAllGroup, LivePositionRow } from '@/types/positions'
import {
  deriveBookVsBase,
  riskCountsFromLadder,
  type BookVsBase,
  type RiskCounts,
} from '@/utils/bookVsBase'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'

/** Which section a chip opens. Null when the chip has nowhere useful to go. */
/** Where a chip or gauge label lands: a collapsible section, or an anchor on the page. */
export type AlarmTarget = 'ladder' | 'capital' | 'coverage' | 'independent' | 'margin' | 'lines' | 'room'

export type AlarmTone = 'ok' | 'warn' | 'danger'

export interface AlarmCheck {
  id: string
  label: string
  value: string
  tone: AlarmTone
  /** One line saying what fired and why it matters. */
  detail: string
  target: AlarmTarget | null
}

/** Past this the quote path is suspect — the page polls every 8 seconds. */
export const STALE_FEED_SEC = 60

/** Shorts landing inside this window are the week's work. */
export const NEAR_EXPIRY_DAYS = 7

function pct1(v: number): string {
  const p = v * 100
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`
}

/** A leg as the page flattens it: ladder fields plus the account and contract that own it, and its entry cost per share. */
export type AlarmLeg = LadderLeg & { accountId: string; contractKey: string; avgCostPerShare?: number | null }

export interface PositionsAlarm {
  ladderRows: ExpiryLadderRow[]
  /** Live quote first, broker mark second, with provenance — every risk figure prices through this. */
  resolveSpot: SpotResolver
  /** How the short legs' underlyings were priced; the caption every risk figure owes the reader. */
  spotMix: SpotMix
  /** Every option leg in scope, flattened once for the ladder, the exposure, and the risk map. */
  legs: AlarmLeg[]
  checks: AlarmCheck[]
  margin: MarginRollup
  exposure: ExposureSummary
  /** Assignment cash as a fraction of buying power. Null when BP is unknown. */
  coverRatio: number | null
  /** True when anything is in warn or danger — the strip's own reason to exist. */
  anyFiring: boolean
  /** The ladder collapsed to the counts the risk gauge grades on. */
  riskCounts: RiskCounts
  /** The four gauges, demand against supply, and the base by role. */
  book: BookVsBase
}

export function usePositionsAlarm({
  groups,
  quotesBySymbol,
  accounts,
  liveStocks,
  coreStocks,
  incomeEtfs,
  cashLike,
  thetaPerDay,
  cushionTightPct,
  barsBySymbol,
}: {
  groups: InstanceAllGroup[]
  quotesBySymbol: Record<string, QuoteItem>
  accounts: IbAccountSnapshot[]
  /** Stock rows in scope, for allocating shares against short calls. */
  liveStocks: LivePositionRow[]
  /** The same stocks split by role, for the base layers. */
  coreStocks: LivePositionRow[]
  incomeEtfs: LivePositionRow[]
  cashLike: LivePositionRow[]
  /** Portfolio theta a day from the vendor Greeks; null while loading. */
  thetaPerDay: number | null
  cushionTightPct: number
  /** Dated closes; without them the resolver only knows live quotes and marks. */
  barsBySymbol?: Readonly<Record<string, LatestBar>>
}): PositionsAlarm {
  const legs: AlarmLeg[] = []
  for (const group of groups) {
    const key = instanceGroupKey(group)
    for (const pos of group.options) {
      legs.push({
        strike: pos.strike,
        expiry: pos.expiry,
        right: pos.right,
        qty: pos.qty,
        underlying: extractUnderlyingRootSymbol(pos.symbol),
        instanceKey: key,
        accountId: (pos.account_id ?? '').trim(),
        contractKey: pos.contract_key ?? '',
        // Instance groups already carry the cost per share (IB's ×100 unwound upstream); normalising again would
        // shrink every leg sold above $10 a share by a hundredfold.
        avgCostPerShare: pos.avg_cost ?? null,
      })
    }
  }
  const resolveSpot = buildSpotResolver(quotesBySymbol, liveStocks, barsBySymbol)
  const ladderRows = buildExpiryLadder(legs, (leg) => resolveSpot(leg.underlying)?.price ?? null)
  // Counted per short leg, like every other count on the Risk line.
  const spotMix = spotMixOf(
    legs.filter((l) => l.qty < 0).map((l) => l.underlying),
    resolveSpot,
  )

  const margin = rollupMargin(accounts)
  const feedAgeSec = quoteFeedAgeSec(Object.values(quotesBySymbol))

  // Keyed by account and symbol: a call is covered only by shares in its own account.
  const sharesByAccountSymbol = new Map<string, number>()
  for (const st of liveStocks) {
    const sym = (st.symbol ?? '').toUpperCase()
    if (!sym) continue
    // Long shares only: a short stock position cannot deliver against a call.
    const qty = st.position ?? 0
    if (qty <= 0) continue
    const k = `${(st.account_id ?? '').trim()}\x00${sym}`
    sharesByAccountSymbol.set(k, (sharesByAccountSymbol.get(k) ?? 0) + qty)
  }
  const exposure = summarizeAssignmentExposure(
    legs,
    (sym, acct) => sharesByAccountSymbol.get(`${acct}\x00${sym}`) ?? 0,
  )
  // One source for "naked" on this page: the same share arithmetic the
  // Backing gauge and the obligations table read. The model's own count lives
  // in the Capital section under its own name.
  const nakedCalls = exposure.nakedCallContracts
  const buyingPower = margin.accounts.reduce((n, a) => n + (a.buyingPower ?? 0), 0)
  const coverRatio = assignmentCoverRatio(exposure.putAssignmentCash, buyingPower || null)

  const riskCounts = riskCountsFromLadder(ladderRows, NEAR_EXPIRY_DAYS)

  const checks = buildChecks({
    riskCounts,
    ladderRows,
    nakedCalls,
    margin,
    feedAgeSec,
    cushionTightPct,
    coverRatio,
  })

  const book = deriveBookVsBase({
    margin,
    exposure,
    risk: riskCounts,
    thetaPerDay,
    coreStocks,
    incomeEtfs,
    cashLike,
    accounts,
  })

  return {
    ladderRows,
    resolveSpot,
    spotMix,
    legs,
    checks,
    margin,
    exposure,
    coverRatio,
    anyFiring: checks.some((c) => c.tone !== 'ok'),
    riskCounts,
    book,
  }
}

/** Above this, a full assignment eats most of what the account can reach. */
export const ASSIGN_HEAVY = 0.5
export const ASSIGN_CRITICAL = 1

/**
 * The checks, as a pure function of what was measured.
 *
 * Split out so the thresholds can be tested directly: this is the code that
 * decides whether the page says "nothing is wrong", and that sentence has to be
 * earned rather than defaulted to.
 */
export function buildChecks({
  riskCounts,
  ladderRows,
  nakedCalls,
  margin,
  feedAgeSec,
  cushionTightPct,
  coverRatio,
}: {
  /** Pre-collapsed counts; pass them so the gauge and the checks cannot drift. */
  riskCounts?: RiskCounts
  ladderRows: readonly ExpiryLadderRow[]
  nakedCalls: number
  margin: MarginRollup
  feedAgeSec: number | null
  cushionTightPct: number
  /** Assignment cash / buying power. Null when buying power is unknown. */
  coverRatio?: number | null
}): AlarmCheck[] {
  const c = riskCounts ?? riskCountsFromLadder(ladderRows, NEAR_EXPIRY_DAYS)
  const itm = c.itm
  const unpriced = c.unpriced
  const nearShorts = c.near7d
  const zeroDteShorts = c.zeroDte
  const pastShorts = c.past
  const tightest = c.tightest

  const checks: AlarmCheck[] = [
    {
      id: 'itm',
      label: 'ITM short',
      value: String(itm),
      tone: itm > 0 ? 'danger' : 'ok',
      detail:
        itm > 0
          ? `${itm} short leg${itm === 1 ? '' : 's'} past its strike — assignable tonight.`
          : 'No short leg is past its strike.',
      target: 'lines',
    },
    {
      id: 'cushion',
      label: 'Tightest',
      value: tightest == null ? 'n/a' : pct1(tightest),
      tone:
        tightest == null
          ? 'warn'
          : cushionBand(tightest, cushionTightPct) === 'breached'
            ? 'danger'
            : cushionBand(tightest, cushionTightPct) === 'tight'
              ? 'warn'
              : 'ok',
      detail:
        tightest == null
          ? 'No short leg could be priced, so there is no cushion to report — not a clean reading.'
          : `Closest any short strike is to being breached. Warning line ${pct1(cushionTightPct)}.`,
      target: 'lines',
    },
    {
      id: 'expiring',
      label: zeroDteShorts > 0 ? '0DTE' : `≤${NEAR_EXPIRY_DAYS}d`,
      value: zeroDteShorts > 0 ? String(zeroDteShorts) : String(nearShorts),
      tone: zeroDteShorts > 0 ? 'danger' : nearShorts > 0 ? 'warn' : 'ok',
      detail:
        zeroDteShorts > 0
          ? `${zeroDteShorts} short contract${zeroDteShorts === 1 ? '' : 's'} expiring today.`
          : nearShorts > 0
            ? `${nearShorts} short contract${nearShorts === 1 ? '' : 's'} expiring within ${NEAR_EXPIRY_DAYS} days.`
            : `Nothing short expires within ${NEAR_EXPIRY_DAYS} days.`,
      target: 'ladder',
    },
    {
      id: 'naked',
      label: 'Naked C',
      value: String(nakedCalls),
      tone: nakedCalls > 0 ? 'danger' : 'ok',
      detail:
        nakedCalls > 0
          ? `${nakedCalls} short call contract${nakedCalls === 1 ? '' : 's'} with no shares behind them in the same account — the loss is unbounded.`
          : 'Every short call is covered by shares in its own account.',
      target: 'coverage',
    },
    {
      id: 'margin',
      label: 'Margin',
      value: margin.pressure == null ? 'n/a' : `${(margin.pressure * 100).toFixed(0)}%`,
      tone:
        margin.pressure == null
          ? 'warn'
          : marginBand(margin.pressure) === 'critical'
            ? 'danger'
            : marginBand(margin.pressure) === 'heavy'
              ? 'warn'
              : 'ok',
      detail:
        margin.pressure == null
          ? 'The broker did not report a cushion for any funded account.'
          : `1 − the broker's own Cushion. At 100% excess liquidity is gone and it starts closing positions.` +
            (margin.tightest?.accountId
              ? ` Most loaded: ${margin.tightest.accountId} at ${((margin.tightest.pressure ?? 0) * 100).toFixed(0)}%.`
              : ''),
      target: 'margin',
    },
  ]

  if (coverRatio != null) {
    checks.push({
      id: 'assign',
      label: 'If assigned',
      value: `${(coverRatio * 100).toFixed(0)}%`,
      tone:
        coverRatio >= ASSIGN_CRITICAL ? 'danger' : coverRatio >= ASSIGN_HEAVY ? 'warn' : 'ok',
      detail:
        `Cash to take assignment on every short put, as a share of buying power. ` +
        `At 100% a full assignment cannot be funded without selling something.`,
      target: 'coverage',
    })
  }

  // Data-quality checks come last: they qualify everything above them, and a
  // reading of "nothing is wrong" taken over missing data is the failure this
  // whole strip exists to prevent.
  if (unpriced > 0) {
    checks.push({
      id: 'unpriced',
      label: 'Unpriced',
      value: String(unpriced),
      tone: 'warn',
      detail: `${unpriced} short leg${unpriced === 1 ? '' : 's'} with no underlying quote — excluded from ITM and cushion above, not known to be safe.`,
      target: 'ladder',
    })
  }
  if (pastShorts > 0) {
    checks.push({
      id: 'past',
      label: 'Past expiry',
      value: String(pastShorts),
      tone: 'warn',
      detail: `${pastShorts} short contract${pastShorts === 1 ? '' : 's'} still open past their expiry date.`,
      target: 'ladder',
    })
  }
  if (feedAgeSec == null || feedAgeSec > STALE_FEED_SEC) {
    checks.push({
      id: 'feed',
      label: 'Quotes',
      value: feedAgeSec == null ? 'n/a' : `${feedAgeSec}s`,
      tone: 'warn',
      detail:
        feedAgeSec == null
          ? 'No quote carried a timestamp — the age of everything priced above is unknown.'
          : `The quote path last wrote ${feedAgeSec}s ago. This is the gateway cache, not proof any single price is current.`,
      target: null,
    })
  }

  return checks
}
