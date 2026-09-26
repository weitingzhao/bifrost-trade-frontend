/**
 * The trader's three questions, and nothing else.
 *
 * `System Status.dc.html` is the Owner's 2026-09-15 ruling made into a page:
 * System collapses to this and Settings. Its own footer draws the line —
 * *"Green means trade; amber means trade with the stated caveat; red means
 * stop — anything needing a graph, a log or a rerun button is Ops Console's
 * job."* So this file answers three questions and refuses the fourth:
 *
 *   Trading link   can I trade
 *   Market data    can I see
 *   Nightly data   did the data land
 *
 * Each answer is a lamp, a state in three words, one sentence of *why*, and
 * the business page that owns the detail. No graphs, no logs, no buttons.
 *
 * ## Read, not re-derived
 *
 * Every reading here comes from a model another page already uses — the
 * monitor's own `health.block_reasons`, `computeMarketStreamsLamp` and
 * `countFreshQuotes` from the Live page, `overallRule` from Signal Health.
 * A status page that computes its own opinion of the book is the one thing
 * worse than no status page: it can disagree with the page it sends you to.
 */
import type { StatusResponse } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import type { SignalHealthResponse } from '@/api/research/similarRegime'
import type { CoverageQuality } from '@/api/marketDataCoverage'
import { computeMarketStreamsLamp, countFreshQuotes } from '@/utils/livePageLamps'
import { isLate, isUnjudged, overallRule, unjudgedReason } from '@/utils/signalHealthModel'

export type DomainLamp = 'green' | 'yellow' | 'red' | 'gray'

export interface DomainDetail {
  /** Grey is a caveat that does not stop anything; amber is one that shapes a reading. */
  tone: 'warn' | 'note'
  text: string
  /** The Ops Console view that owns this line, when it is not the row's own. */
  ops?: { view: string; label: string }
}

export interface DomainStanding {
  key: 'trading' | 'market' | 'nightly'
  name: string
  lamp: DomainLamp
  /** `trade normally`, `live · 1 caveat`, `ready · 1 lens old`. */
  state: string
  /** One sentence. The reader decides from this line alone. */
  why: string
  /** The business page that owns the detail — never an Ops page. */
  to: string
  toLabel: string
  detail: DomainDetail[]
}

/**
 * What the monitor's own block reasons mean in the reader's words.
 *
 * The strings are the backend's; leaving them raw would make the one line a
 * trader reads before opening a position read like a log.
 */
const BLOCK_TEXT: Record<string, string> = {
  ib_not_connected: 'the IB link is down',
  socket_massive_disconnected: 'the market-data socket is disconnected',
  trading_suspended: 'trading is suspended by the operator',
  daemon_not_alive: 'the daemon is not running',
}

export function blockText(reason: string): string {
  return BLOCK_TEXT[reason] ?? reason.replace(/_/g, ' ')
}

/** Can I trade — the daemon, the IB link, and what the monitor says blocks it. */
export function tradingStanding(status: StatusResponse | undefined): DomainStanding {
  const base = {
    key: 'trading' as const,
    name: 'Trading link',
    to: '/trade/fills',
    toLabel: 'Orders & Fills →',
  }
  if (!status) {
    return {
      ...base,
      lamp: 'gray',
      state: 'not probed',
      why: 'The monitor has not answered, so nothing here knows whether the link is up. Unknown is not clear.',
      detail: [],
    }
  }
  const hb = status.daemon?.heartbeat
  const reasons = [...new Set([...(status.health?.block_reasons ?? []), ...(status.daemon?.block_reasons ?? [])])]
  const alive = hb?.daemon_alive === true
  const ibConnected = hb?.ib_connected === true
  const detail: DomainDetail[] = reasons.map((r) => ({ tone: 'warn', text: blockText(r) }))
  if (!alive) {
    return {
      ...base,
      lamp: 'red',
      state: 'stop',
      why: 'The daemon is not running. Nothing is watching the book and no order path is open.',
      detail,
    }
  }
  if (reasons.length > 0 || !ibConnected) {
    const named = reasons.length > 0 ? reasons.map(blockText).join(' · ') : 'the IB link is down'
    return {
      ...base,
      lamp: reasons.length > 0 ? 'red' : 'yellow',
      state: reasons.length > 0 ? 'stop' : 'degraded',
      why: `The daemon is alive, and the monitor blocks trading: ${named}. Positions still read; a new one does not go out.`,
      detail,
    }
  }
  return {
    ...base,
    lamp: 'green',
    state: 'trade normally',
    why: 'The daemon is alive and the IB link is connected, with nothing on the monitor blocking a new position.',
    detail: [],
  }
}

/** Can I see — the quote path, and how much of it is actually moving. */
export function marketStanding(
  status: StatusResponse | undefined,
  quotes: Record<string, QuoteItem>,
  streamKeys: readonly string[],
  /** Passed in so the reading is a pure function of its inputs. */
  nowSec: number = Date.now() / 1000,
): DomainStanding {
  const base = {
    key: 'market' as const,
    name: 'Market data',
    to: '/market/live',
    toLabel: 'Live →',
  }
  const lamp = computeMarketStreamsLamp(status, quotes)
  const { fresh, total } = countFreshQuotes(quotes, streamKeys, nowSec)
  const behind = total - fresh
  if (lamp === 'none') {
    return {
      ...base,
      lamp: 'gray',
      state: 'not probed',
      why: 'The monitor has not answered, so the quote path is unknown rather than clear.',
      detail: [],
    }
  }
  if (lamp === 'red') {
    return {
      ...base,
      lamp: 'red',
      state: 'no quotes',
      why: 'Neither the quote reader nor the IB ingest is answering. Every mark on every page is a settled close, not a live price.',
      detail: [],
    }
  }
  const detail: DomainDetail[] =
    behind > 0
      ? [
          {
            tone: 'note',
            text: `${behind} of ${total} streams have no quote under a minute old — those rows grey out on Live rather than showing a stale price as live.`,
          },
        ]
      : []
  return {
    ...base,
    lamp: lamp === 'yellow' ? 'yellow' : behind > 0 ? 'yellow' : 'green',
    state: behind > 0 ? `live · ${behind} behind` : 'live',
    why:
      behind > 0
        ? `${fresh} of ${total} streams are current. The rest are stale, which is a gap in what you can see rather than a fault in the book.`
        : `All ${total} streams are current.`,
    detail,
  }
}

const MASSIVE = { view: 'market-data-manage', label: 'Massive' }

/**
 * The market-data plugin's own verdict over the watchlist — did last night's
 * raw data land for the names you hold and watch.
 *
 * It is the one conclusion the retired Coverage page carried that a trader
 * needs (Owner 2026-09-25); the rest of that page was ingest diagnosis and
 * lives in Ops · Massive. Read as the plugin gives it: `summary` PASS / FAIL
 * over its own checks. Nothing here re-judges a check.
 */
export function watchlistDataLine(
  quality: CoverageQuality | undefined,
  isError: boolean,
): DomainDetail | null {
  if (isError) {
    return { tone: 'note', text: 'The market-data plugin’s watchlist check did not answer — silence, not a pass.', ops: MASSIVE }
  }
  if (!quality?.summary) return null
  const checks = quality.checks ?? []
  const failed = checks.filter((c) => !c.ok)
  const names = quality.watchlist_source_count
  const over = names != null ? ` over ${names} watchlist names` : ''
  if (quality.summary === 'PASS' && failed.length === 0) {
    return {
      tone: 'note',
      text: `Watchlist market data landed: all ${checks.length} of the plugin’s checks pass${over} (EOD bars, option snapshots, open interest, freshness).`,
      ops: MASSIVE,
    }
  }
  const which = failed.map((c) => String(c.detail ?? c.check)).join('; ')
  return {
    tone: 'warn',
    text: `Watchlist market data did not fully land: ${failed.length || 'the'} plugin check${failed.length === 1 ? '' : 's'} fail${over}${which ? ` — ${which}` : ''}.`,
    ops: MASSIVE,
  }
}

/**
 * Did the data land — Signal Health's own rule for the research readings, and
 * the market-data plugin's own verdict for the raw data under them. Neither is
 * a second opinion; a failing plugin check can only add a caveat (amber).
 */
export function nightlyStanding(
  health: SignalHealthResponse | undefined,
  isError: boolean,
  watchlist: DomainDetail | null = null,
): DomainStanding {
  const base = {
    key: 'nightly' as const,
    name: 'Nightly data',
    to: '/research/signal-health',
    toLabel: 'Signal Health →',
  }
  const extra = watchlist ? [watchlist] : []
  if (isError) {
    return {
      ...base,
      lamp: 'gray',
      state: 'not probed',
      why: 'Signal Health did not answer. This is silence about last night, not an all-clear.',
      detail: extra,
    }
  }
  if (!health) {
    return { ...base, lamp: 'gray', state: 'reading…', why: 'Asking Signal Health what landed.', detail: extra }
  }
  const rule = overallRule(health)
  const late = (health.freshness ?? []).filter(isLate)
  // A probe that did not finish says nothing about last night: grey, and named.
  const unjudged = (health.freshness ?? []).filter(isUnjudged).map((f) => ({
    tone: 'note' as const,
    text: `${f.label} was not judged this read — ${unjudgedReason(f)}. Grey, not late.`,
  }))
  if (rule.tone === 'unknown') {
    return {
      ...base,
      lamp: 'gray',
      state: 'not judged',
      why: `No lens could be judged this read. This is silence about last night, not an all-clear.`,
      detail: [...unjudged, ...extra],
    }
  }
  const rawCaveat = watchlist?.tone === 'warn'
  return {
    ...base,
    lamp: rule.tone === 'ok' && !rawCaveat ? 'green' : 'yellow',
    state: late.length === 0 ? 'ready' : `ready · ${late.length} ${late.length === 1 ? 'lens' : 'lenses'} old`,
    why:
      late.length === 0
        ? `Last night landed clean — ${rule.text}.`
        : `Last night landed, with an exception: ${rule.text}.`,
    detail: [
      ...late.map((f) => ({
        tone: 'warn' as const,
        text:
          f.age_hours == null
            ? `${f.label} is ${f.status} — readings grounded in it carry the amber asof.`
            : `${f.label} is ${f.age_hours.toFixed(1)}h old — readings grounded in it carry the amber asof.`,
      })),
      ...unjudged,
      ...extra,
    ],
  }
}

/**
 * The page's own lamp: the worst of the three.
 *
 * The design's footer says the top-bar system lamp and this page read the same
 * three aggregates. They do not yet — the bar's lamp summarises the platform
 * plugins, which is a fourth question (is the control plane up) and not one a
 * trader asks before opening a position. This is the value it would read.
 */
export function worstLamp(domains: readonly DomainStanding[]): DomainLamp {
  if (domains.some((d) => d.lamp === 'red')) return 'red'
  if (domains.some((d) => d.lamp === 'yellow')) return 'yellow'
  if (domains.every((d) => d.lamp === 'green')) return 'green'
  return 'gray'
}
