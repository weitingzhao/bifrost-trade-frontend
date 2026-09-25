/**
 * One bell, grouped by source — the Alerts panel the status bar opens.
 *
 * There were three notification controls and two surfaces: a Radar bell for
 * analyze alerts with its own popover, a Bell for system messages opening a
 * drawer, and a status-bar segment opening the same drawer. Two of them could
 * be showing counts at once with no way to know which mattered, and the
 * platform plugins — the third thing that can want your attention — had no
 * count at all after their docked panel became a page.
 *
 * Design: `design/trade/_Shell StatusBar.dc.html`, which pulled the last of it
 * down from the top bar and settled the name. **Alerts holds messages; Inbox
 * is the Decision Inbox, and holds work.** Two counts called Inbox on one
 * screen was the collision that ruling ends, so nothing in this file may call
 * itself an inbox again.
 *
 * Risk limits lead the four groups for a reason that is not severity: a breach
 * is the only thing here that would stop an open. What the shell can afford to
 * read of that book is `useRiskLimitWatch`, which also names what it is not
 * reading — a group that quietly covered one rule of twelve would be the same
 * false quiet this file was written to prevent.
 *
 * It takes the system-message stream rather than subscribing to it, so a
 * second caller cannot open a second SSE connection — the hazard is gone by
 * construction instead of by comment. `AppLayout` owns the one subscription
 * and feeds both this and the toast stack.
 */
import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAlerts } from '@/api/research/alertScan'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { alertHref, alertLamp, alertSummary, rankAlerts } from '@/lib/alertRanking'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import { useRiskLimitWatch, UNWATCHED_HERE } from '@/hooks/useRiskLimitWatch'
import { fmtReading } from '@/utils/limitsModel'
import { IbConnectionMessageTitle, ibSlotDisplayLabel } from '@/components/MessageCenter/IbConnectionSlotBadge'
import type { SystemMessage } from '@/types/messages'

export type AlertLamp = 'green' | 'yellow' | 'red' | 'gray'

export interface AlertItem {
  id: string
  title: ReactNode
  sub?: string
  /**
   * A string is a fixed label (a trade date, a checked-at clock). A number is
   * unix seconds, which the drawer renders as "N ago" and keeps ticking — a
   * relative time that stops moving is worse than an absolute one.
   */
  when: string | number
  lamp: AlertLamp
  /** Where the row goes. Omitted when nothing can say more than the row does. */
  to?: string
  /** Only the reader can clear a system message; the other sources clear themselves. */
  onDismiss?: () => void
}

export interface AlertGroup {
  id: 'risk' | 'analyze' | 'system' | 'platform'
  title: string
  /** Who said it — the design puts this at the right of the group heading. */
  source: string
  /**
   * Four states, never three. `ready` with no items is an empty result and a
   * fact about the world; `unavailable` is a fact about us, and must never
   * render as the same quiet.
   */
  state: 'checking' | 'unavailable' | 'ready'
  /** What `unavailable` means here, and what would end it. */
  note?: string
  /**
   * What "no rows" means for this group, when "Nothing waiting" would overstate.
   *
   * Risk limits needs it: Today can be showing a concentration breach while
   * this group is empty, because this group does not read concentration. The
   * empty line has to say what was checked, or the panel reads as a denial of
   * what the page beside it is saying.
   */
  emptyLabel?: string
  /**
   * What the group does *not* cover, printed under it whatever its state.
   *
   * `note` explains a failure; this explains a boundary. Risk limits is the
   * group that needs one — it watches the lines the shell can read from every
   * page and none of the rest, and a panel that showed the watched ones alone
   * would read as the whole book.
   */
  footnote?: string
  onRetry?: () => void
  items: AlertItem[]
}

export interface AlertsSummary {
  /** Items we know about. A floor, not a total, when `incomplete`. */
  count: number
  /** A source could not be reached, so `count` may be under-reporting. */
  incomplete: boolean
  /** Named for the tooltip — "unknown" is only useful if you know whose. */
  unreachable: string[]
  /** Nothing has answered yet. */
  checking: boolean
  /** Worst lamp among known items; drives the badge fill. */
  worst: AlertLamp | null
}

const LAMP_SEVERITY: Record<AlertLamp, number> = { red: 0, yellow: 1, green: 2, gray: 3 }

function worstLampOf(items: readonly AlertItem[]): AlertLamp | null {
  let worst: AlertLamp | null = null
  for (const item of items) {
    if (worst == null || LAMP_SEVERITY[item.lamp] < LAMP_SEVERITY[worst]) worst = item.lamp
  }
  return worst
}

/**
 * What the bell is entitled to say.
 *
 * Pure, and separate from the hook, because the load-bearing claim is one a
 * render test would state badly: a source that could not be reached must never
 * come out looking like an all-clear. `count` is a floor whenever `incomplete`
 * is set, and the badge has to show that rather than a confident zero.
 */
export function alertsSummary(groups: readonly AlertGroup[]): AlertsSummary {
  const all = groups.flatMap((g) => g.items)
  const unreachable = groups.filter((g) => g.state === 'unavailable').map((g) => g.title)
  return {
    count: all.length,
    incomplete: unreachable.length > 0,
    unreachable,
    checking: all.length === 0 && groups.some((g) => g.state === 'checking'),
    worst: worstLampOf(all),
  }
}

/* ── Analyze alerts ─────────────────────────────────────────────────────── */




/* ── System messages ────────────────────────────────────────────────────── */

/** Where a message goes. Both topics have one obvious page; anything new has none. */
function messageHref(msg: SystemMessage): string | undefined {
  if (msg.topic === 'ib.connection') return '/system/status'
  if (msg.topic === 'portfolio.tws_executions') return '/portfolio/ledger'
  return undefined
}

function messageLamp(msg: SystemMessage): AlertLamp {
  switch (msg.level) {
    case 'error': return 'red'
    case 'warning': return 'yellow'
    case 'success': return 'green'
    default: return 'gray'
  }
}

function messageSub(msg: SystemMessage): string {
  const meta =
    msg.topic === 'ib.connection' && msg.slot
      ? [msg.service, ibSlotDisplayLabel(msg.slot), msg.account]
      : [msg.service, msg.slot, msg.account]
  return [msg.message, ...meta.filter(Boolean)].filter(Boolean).join(' · ')
}

/* ── The panel ──────────────────────────────────────────────────────────── */

/** What `useSystemMessages()` returns — the part Alerts reads. */
export interface AlertsMessageStream {
  messages: SystemMessage[]
  dismissedIds: Set<string>
  dismissMessage: (id: string) => void
}

export function useAlerts({ messages, dismissedIds, dismissMessage }: AlertsMessageStream) {
  const alertsQuery = useQuery({
    queryKey: QUERY_KEYS.research.alerts,
    queryFn: () => fetchAlerts({ limit: 20, days: 14 }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })
  const plugins = usePlatformPlugins(true)
  const limits = useRiskLimitWatch()

  const alertItems = useMemo<AlertItem[]>(
    () =>
      rankAlerts(alertsQuery.data?.items ?? []).map((item, i) => ({
        id: `alert:${item.trade_date}:${item.kind}:${item.symbol ?? ''}:${item.lens ?? ''}:${i}`,
        title: [item.kind, item.symbol?.trim() || null, item.lens?.trim() || null]
          .filter(Boolean)
          .join(' · '),
        sub: alertSummary(item) || undefined,
        when: item.trade_date,
        lamp: alertLamp(item.severity),
        to: alertHref(item),
      })),
    [alertsQuery.data],
  )

  const systemItems = useMemo<AlertItem[]>(
    () =>
      messages
        .filter((m) => !dismissedIds.has(m.message_id))
        .map((msg) => ({
          id: msg.message_id,
          title: <IbConnectionMessageTitle msg={msg} />,
          sub: messageSub(msg),
          when: msg.occurred_at,
          lamp: messageLamp(msg),
          to: messageHref(msg),
          onDismiss: () => dismissMessage(msg.message_id),
        })),
    [messages, dismissedIds, dismissMessage],
  )

  // Only what wants a look. A healthy plugin is not waiting on anyone, and the
  // status bar's System panel already lists every one of them either way.
  const platformItems = useMemo<AlertItem[]>(
    () =>
      plugins.rows
        .filter((row) => row.fetchError != null || (row.lamp !== 'ok' && !row.isLoading))
        .map((row) => ({
          id: `plugin:${row.def.key}`,
          title: row.def.label,
          sub: row.fetchError
            ? `platform-api unreachable: ${row.fetchError}`
            : (row.status?.summary ?? row.status?.error ?? 'no detail reported'),
          when: row.status?.generated_at?.slice(11, 16) ?? '—',
          lamp: row.fetchError ? 'gray' : row.lamp === 'down' ? 'red' : row.lamp === 'degraded' ? 'yellow' : 'gray',
          to: '/system/status',
        })),
    [plugins.rows],
  )

  /**
   * A breach reads as both numbers and the consequence — the reading, the line
   * it crossed, and what the house says happens. The share of the limit is
   * deliberately not what is printed: on a floor it inverts, so "122%" would
   * mean a buffer that is *too small*, which is the opposite of how the same
   * figure reads on a ceiling.
   */
  const riskItems = useMemo<AlertItem[]>(
    () =>
      limits.breaches.map((r) => ({
        id: `limit:${r.key}`,
        title: r.name,
        sub: `${fmtReading(r, r.current)} against a ${r.bound} of ${fmtReading(r, r.limit)} · ${r.onBreach}`,
        when: 'now',
        // Every line the shell watches is a hard one — it is the only kind
        // whose breach blocks an open, which is why these are watchable at
        // all. Soft lines are acknowledged, not enforced, and none of the
        // cheap readings carry one.
        lamp: r.kind === 'soft' ? 'yellow' : 'red',
        to: '/risk/limits',
      })),
    [limits.breaches],
  )

  const groups = useMemo<AlertGroup[]>(
    () => [
      {
        id: 'risk',
        title: 'Risk limits',
        source: 'limit book',
        state: limits.isLoading ? 'checking' : 'ready',
        emptyLabel: 'Nothing breached among the lines watched here',
        footnote:
          (limits.watching.length > 0
            ? `Watched from every page: ${limits.watching.join(' · ')}. `
            : 'Nothing here carries both a reading and a line yet. ') + UNWATCHED_HERE,
        items: riskItems,
      },
      {
        id: 'analyze',
        title: 'Analyze alerts',
        source: 'research-api',
        // A cached list beats a blank one, so items outrank the error — the
        // same order `bellState` uses, for the same reason.
        state: alertItems.length > 0 ? 'ready' : alertsQuery.isError ? 'unavailable' : alertsQuery.isPending ? 'checking' : 'ready',
        note: 'Alert check failed — this is not an all-clear. Whether anything fired is unknown until research-api :8795 answers.',
        onRetry: () => void alertsQuery.refetch(),
        items: alertItems,
      },
      {
        id: 'system',
        title: 'System',
        source: 'trade-api',
        // The stream pushes; there is no pending state to report and a dropped
        // SSE reconnects on its own.
        state: 'ready',
        items: systemItems,
      },
      {
        id: 'platform',
        title: 'Platform',
        source: 'plugins',
        state: plugins.isLoading && platformItems.length === 0 ? 'checking' : 'ready',
        items: platformItems,
      },
    ],
    [riskItems, limits.isLoading, limits.watching, alertItems, alertsQuery, systemItems, platformItems, plugins.isLoading],
  )

  const summary = useMemo(() => alertsSummary(groups), [groups])

  return { groups, summary }
}
