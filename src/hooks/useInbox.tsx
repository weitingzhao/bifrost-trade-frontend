/**
 * One bell, grouped by source.
 *
 * There were three notification controls and two surfaces: a Radar bell for
 * analyze alerts with its own popover, a Bell for system messages opening a
 * drawer, and an Inbox segment in the status bar opening the same drawer. Two
 * of them could be showing counts at once with no way to know which mattered,
 * and the platform plugins — the third thing that can want your attention —
 * had no count at all after their docked panel became a page.
 *
 * Design: `design/trade/_Shell TopBar.dc.html`, whose Inbox header states the
 * rule outright — "one bell · grouped by source". Its fourth group, Risk
 * limits, waits on limit breaches, which this app does not have yet.
 *
 * It takes the system-message stream rather than subscribing to it, so a
 * second caller cannot open a second SSE connection — the hazard is gone by
 * construction instead of by comment. `AppLayout` owns the one subscription
 * and feeds both this and the toast stack.
 */
import { useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAlerts, type AnalyzeAlert } from '@/api/research/alertScan'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { withSymbolParam } from '@/lib/symbolLink'
import { rankAlerts, severityRank } from '@/lib/alertRanking'
import { usePlatformPlugins } from '@/hooks/usePlatformPlugins'
import { IbConnectionMessageTitle, ibSlotDisplayLabel } from '@/components/MessageCenter/IbConnectionSlotBadge'
import type { SystemMessage } from '@/types/messages'

export type InboxLamp = 'green' | 'yellow' | 'red' | 'gray'

export interface InboxItem {
  id: string
  title: ReactNode
  sub?: string
  /**
   * A string is a fixed label (a trade date, a checked-at clock). A number is
   * unix seconds, which the drawer renders as "N ago" and keeps ticking — a
   * relative time that stops moving is worse than an absolute one.
   */
  when: string | number
  lamp: InboxLamp
  /** Where the row goes. Omitted when nothing can say more than the row does. */
  to?: string
  /** Only the reader can clear a system message; the other sources clear themselves. */
  onDismiss?: () => void
}

export interface InboxGroup {
  id: 'alerts' | 'system' | 'platform'
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
  onRetry?: () => void
  items: InboxItem[]
}

export interface InboxSummary {
  /** Items we know about. A floor, not a total, when `incomplete`. */
  count: number
  /** A source could not be reached, so `count` may be under-reporting. */
  incomplete: boolean
  /** Named for the tooltip — "unknown" is only useful if you know whose. */
  unreachable: string[]
  /** Nothing has answered yet. */
  checking: boolean
  /** Worst lamp among known items; drives the badge fill. */
  worst: InboxLamp | null
}

const LAMP_SEVERITY: Record<InboxLamp, number> = { red: 0, yellow: 1, green: 2, gray: 3 }

function worstLampOf(items: readonly InboxItem[]): InboxLamp | null {
  let worst: InboxLamp | null = null
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
export function inboxSummary(groups: readonly InboxGroup[]): InboxSummary {
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

function alertLamp(severity: string): InboxLamp {
  const rank = severityRank(severity)
  return rank === 0 ? 'red' : rank === 1 ? 'yellow' : 'gray'
}

function alertHref(item: AnalyzeAlert): string {
  if (item.kind === 'composite_high') return withSymbolParam('/research/scan', item.symbol)
  if (item.kind === 'hit_rate_drop' || item.kind === 'weight_shift') {
    const lens = item.lens?.trim()
    return lens ? `/research/signal-decay?lens=${encodeURIComponent(lens)}` : '/research/signal-decay'
  }
  return '/research/scan'
}

function alertSummary(item: AnalyzeAlert): string {
  const r = item.reason
  if (r == null) return ''
  if (typeof r === 'string') return r
  if (item.kind === 'composite_high') {
    const parts: string[] = []
    if (r.composite_score != null) parts.push(`score ${String(r.composite_score)}`)
    if (r.rank != null) parts.push(`rank ${String(r.rank)}`)
    return parts.join(' · ')
  }
  if (item.kind === 'hit_rate_drop') {
    return r.drop_pp != null ? `hot hit-rate −${String(r.drop_pp)}pp` : ''
  }
  if (item.kind === 'weight_shift') {
    return r.z != null ? `z=${String(r.z)}` : ''
  }
  return Object.keys(r).slice(0, 2).map((k) => `${k}=${String(r[k])}`).join(' · ')
}

/* ── System messages ────────────────────────────────────────────────────── */

/** Where a message goes. Both topics have one obvious page; anything new has none. */
function messageHref(msg: SystemMessage): string | undefined {
  if (msg.topic === 'ib.connection') return '/system/ib'
  if (msg.topic === 'portfolio.tws_executions') return '/portfolio/ledger'
  return undefined
}

function messageLamp(msg: SystemMessage): InboxLamp {
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

/* ── The Inbox ──────────────────────────────────────────────────────────── */

/** What `useSystemMessages()` returns — the part the Inbox reads. */
export interface InboxMessageStream {
  messages: SystemMessage[]
  dismissedIds: Set<string>
  dismissMessage: (id: string) => void
}

export function useInbox({ messages, dismissedIds, dismissMessage }: InboxMessageStream) {
  const alertsQuery = useQuery({
    queryKey: QUERY_KEYS.research.alerts,
    queryFn: () => fetchAlerts({ limit: 20, days: 14 }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  })
  const plugins = usePlatformPlugins(true)

  const alertItems = useMemo<InboxItem[]>(
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

  const systemItems = useMemo<InboxItem[]>(
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
  const platformItems = useMemo<InboxItem[]>(
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
          to: '/system/platform',
        })),
    [plugins.rows],
  )

  const groups = useMemo<InboxGroup[]>(
    () => [
      {
        id: 'alerts',
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
    [alertItems, alertsQuery, systemItems, platformItems, plugins.isLoading],
  )

  const summary = useMemo(() => inboxSummary(groups), [groups])

  return { groups, summary }
}
