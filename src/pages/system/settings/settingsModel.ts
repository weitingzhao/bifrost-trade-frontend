/**
 * The trader's own configuration, read rather than restated.
 *
 * `Settings.dc.html` is the other half of the Owner's 2026-09-15 collapse:
 * System becomes Status and this. Its boundary: the old System ›
 * Configuration › IB Connection merges in here, and cluster, pipeline and
 * market-data infrastructure config belongs to the Ops Console — so nothing
 * about the cluster is on any pane. Since Rev .80 the page is macOS System
 * Settings: a category list and one pane of grouped rows.
 *
 * The prototype is read-only and says so: *此页原型只读——编辑动作在实现侧接
 * YAML/配置存储*. The implementation side is this page since the Owner's
 * 2026-09-25 call: each row edits in place through the same two writes the
 * retired IB Connection page used, and the two YAML rows open their full
 * reading, because config.yaml has no write route.
 */
import type { FlexAccountItem, IbClientPort, StatusResponse } from '@/types/monitor'
import type { FlexConfigSummary } from '@/api/flexQueryPlugin'
import type { FlexCoverageFreshnessResponse } from '@/types/trading'
/** Same shape as `fmtSince`, with the clock passed in so this stays pure. */
function ageWords(elapsedSec: number): string {
  const e = Math.max(0, Math.floor(elapsedSec))
  if (e < 60) return `${e}s`
  if (e < 3600) return `${Math.floor(e / 60)}m`
  if (e < 86400) return `${Math.floor(e / 3600)}h`
  return `${Math.floor(e / 86400)}d`
}

// ── Categories (Rev .80) ─────────────────────────────────────────────────────

export type SettingsPane = 'ib' | 'flex' | 'look' | 'keys'

/** The four categories, with the words a search matches beyond the label. */
export const SETTINGS_CATEGORIES: readonly { id: SettingsPane; label: string; keys: string }[] = [
  { id: 'ib', label: 'IB Connection', keys: 'ib tws login user client id account u-number slot yaml host port agent' },
  { id: 'flex', label: 'Flex', keys: 'flex query token preference columns range pull fetch transactions ledger transfer' },
  { id: 'look', label: 'Appearance', keys: 'appearance theme dark light auto contrast transparency glass text size display' },
  { id: 'keys', label: 'Keyboard', keys: 'keyboard shortcut omnibar copilot sidebar inspector keys' },
]

export function isSettingsPane(v: string | null | undefined): v is SettingsPane {
  return SETTINGS_CATEGORIES.some((c) => c.id === v)
}

/**
 * The categories a search leaves, and the pane shown: the chosen one while it
 * is among them, else the first that matched. With nothing matched the pane
 * stays where it was and the list says so.
 */
export function settingsSearch(
  q: string,
  pane: SettingsPane,
): { shown: (typeof SETTINGS_CATEGORIES)[number][]; pane: SettingsPane } {
  const t = q.trim().toLowerCase()
  const shown = SETTINGS_CATEGORIES.filter((c) => !t || c.label.toLowerCase().includes(t) || c.keys.includes(t))
  const pick = shown.length === 0 || shown.some((c) => c.id === pane) ? pane : shown[0].id
  return { shown, pane: pick }
}

// ── Rows ─────────────────────────────────────────────────────────────────────

export interface SettingRow {
  /** Which editor or reading the row opens. */
  id: string
  label: string
  /** What it is, in the design's own words. */
  what: string
  /** The value as it stands — never a secret, only whether one is set. */
  reading: string
}

const IB_AGENTS = ['ib_ingestor', 'ib_account_agent', 'ib_operator'] as const

/** How many of the three IB agents answered — null when the monitor has not. */
function ibAgentCount(status: StatusResponse | undefined): { connected: number; total: number } | null {
  if (!status) return null
  const socket = (status.socket ?? {}) as Record<string, { connected?: boolean } | undefined>
  return { connected: IB_AGENTS.filter((k) => socket[k]?.connected === true).length, total: IB_AGENTS.length }
}

/** The IB slots that answered, out of the ones configured. */
export function ibSlotStanding(status: StatusResponse | undefined): string {
  const n = ibAgentCount(status)
  if (!n) return 'not probed'
  return n.connected === n.total ? `${n.connected} agents connected` : `${n.connected} of ${n.total} agents connected`
}

/** The same count, short enough for the category list. */
export function ibSlotMeta(status: StatusResponse | undefined): string {
  const n = ibAgentCount(status)
  if (!n) return '—'
  return n.connected === n.total ? `${n.total} agents` : `${n.connected} of ${n.total}`
}

/** The lamp beside the pane's status line: all up, some up, none, or unknown. */
export function ibSlotLamp(status: StatusResponse | undefined): 'green' | 'yellow' | 'red' | 'gray' {
  const n = ibAgentCount(status)
  if (!n) return 'gray'
  return n.connected === n.total ? 'green' : n.connected > 0 ? 'yellow' : 'red'
}

export function ibRows(status: StatusResponse | undefined): [SettingRow, SettingRow, SettingRow] {
  const c = status?.config?.ib_client
  const client = c?.client
  const account = c?.account
  // `— · —` is not a reading; a row with nothing behind it says `—` once.
  const ports = [client?.host_port_type, client?.secondary_port_type].filter(Boolean)
  return [
    {
      id: 'ib-user',
      label: 'User',
      what: 'Login mapping per slot — host · secondary',
      // The login names were purged from this app on 2026-09-16; a slot is
      // identified by where it connects, which is what the YAML actually maps.
      reading: client?.host_ip ? `host ${client.host_ip} · secondary ${client.secondary_host_ip ?? '—'}` : '—',
    },
    {
      id: 'ib-client',
      label: 'Client ID',
      what: 'Client IDs per agent · ib.host.client_id.* · secondary ingestor optional',
      reading: ports.length > 0 ? ports.join(' · ') : '—',
    },
    {
      id: 'ib-account',
      label: 'Account',
      what: 'Single IB account (U-number) the daemon trades and writes positions for',
      reading: account?.trading
        ? `${account.trading}${account.event_secondary && account.event_secondary !== account.trading ? ` · events ${account.event_host ?? '—'} / ${account.event_secondary}` : ''}`
        : '—',
    },
  ]
}

export interface FlexStanding {
  /** The header line: when each kind last landed. */
  text: string
  tone: 'ok' | 'warn' | 'gray'
}

/**
 * When the oldest kind last landed, short enough for the category list: the
 * clock time when it landed today, the age otherwise — yesterday's 23:00
 * printed bare would read as a time still to come.
 */
export function flexLandedMeta(freshness: FlexCoverageFreshnessResponse | undefined, nowMs: number): string {
  const ts = (freshness?.dimensions ?? []).map((d) => (d.latest_ts ? Date.parse(d.latest_ts) : NaN))
  if (ts.length === 0 || ts.some((t) => !Number.isFinite(t))) return '—'
  const oldest = Math.min(...ts)
  const d = new Date(oldest)
  if (d.toDateString() !== new Date(nowMs).toDateString()) return `${ageWords((nowMs - oldest) / 1000)} ago`
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * When Flex last landed, per kind.
 *
 * The design's header reads `daily 08:30 · missed today, ran 06:02` — a
 * schedule and a comparison against it. The plugin exposes neither: its
 * schedule is Dagster's and no route reports it, so this says what *did*
 * land and when, which is the half that can be read.
 */
export function flexStanding(
  freshness: FlexCoverageFreshnessResponse | undefined,
  nowMs: number,
): FlexStanding {
  const dims = freshness?.dimensions ?? []
  if (dims.length === 0) return { text: 'no pull recorded', tone: 'gray' }
  const parts = dims.map((d) => {
    const ts = d.latest_ts ? Date.parse(d.latest_ts) : NaN
    const age = Number.isFinite(ts) ? `${ageWords((nowMs - ts) / 1000)} ago` : 'never'
    return `${d.dimension.replace(/^flex-/, '')} ${age}`
  })
  const oldestMs = Math.min(
    ...dims.map((d) => (d.latest_ts ? Date.parse(d.latest_ts) : Number.POSITIVE_INFINITY)),
  )
  const staleHours = Number.isFinite(oldestMs) ? (nowMs - oldestMs) / 3_600_000 : Infinity
  return {
    text: parts.join(' · '),
    // A daily pull older than a day and a half has missed one.
    tone: staleHours > 36 ? 'warn' : 'ok',
  }
}

export function flexRows(summary: FlexConfigSummary | undefined): [SettingRow, SettingRow, SettingRow] {
  const t = summary?.tokens
  const rows = summary?.query_rows ?? []
  const named = rows.filter((r) => (r.query_host_id ?? '').trim().length > 0).length
  return [
    {
      id: 'flex-query',
      label: 'Flex Query',
      what: 'Query id + token · the token shows as set, never the value',
      // Never the token — only whether one is set, and its last four, which is
      // what the plugin itself reports.
      reading: t?.host_token_set
        ? `…${t.host_token_last4 ?? '????'}${t.secondary_token_set ? ` · secondary …${t.secondary_token_last4 ?? '????'}` : ''}`
        : 'no token set',
    },
    {
      id: 'flex-preference',
      label: 'Flex Preference',
      what: 'Which Flex queries import, and how they map to Execution',
      reading: rows.length === 0 ? 'no query rows' : `${named} of ${rows.length} queries have an id`,
    },
    {
      id: 'flex-range',
      label: 'Range',
      what: 'Default pull · first run',
      reading: summary ? `${summary.range_days.default}d · ${summary.range_days.init}d` : '—',
    },
  ]
}

/** The two Flex queries the plugin runs, in the order the editor lists them. */
export const FLEX_QUERY_TYPES: readonly { purpose: string; label: string }[] = [
  { purpose: 'cash_transactions', label: 'Cash Transactions' },
  { purpose: 'trades', label: 'Trades' },
]

/** One editable row per query the plugin runs, whatever the store holds. */
export function initFlexRows(stored: FlexAccountItem[] | null | undefined): FlexAccountItem[] {
  return FLEX_QUERY_TYPES.map(({ purpose, label }) => {
    const row = (stored ?? []).find((r) => (r.purpose ?? 'cash_transactions') === purpose)
    return {
      purpose,
      query_label: label,
      query_host_id: row?.query_host_id ?? '',
      query_secondary_id: row?.query_secondary_id ?? '',
    }
  })
}

const PORT_LABELS: Record<string, string> = {
  tws_paper: 'TWS Paper (7497)',
  tws_live: 'TWS Live (7496)',
  gateway: 'Gateway (4002)',
}

/** A read-only line of the YAML: one value per slot. */
export interface SlotLine {
  label: string
  /** Set when the line is the first of a group — the table prints a header row. */
  group?: string
  host: string
  secondary: string
}

/** Where each slot connects — the `User (YAML)` row opened. */
export function ibConnectionLines(status: StatusResponse | undefined): SlotLine[] {
  const client = status?.config?.ib_client?.client
  const secondaryOn = Boolean(client?.secondary_host_ip?.trim())
  const port = (t: string | null | undefined) => (t ? (PORT_LABELS[t] ?? t) : '—')
  return [
    { label: 'IP / host', host: client?.host_ip || '—', secondary: secondaryOn ? String(client?.secondary_host_ip) : 'disabled' },
    { label: 'Port type', host: port(client?.host_port_type), secondary: secondaryOn ? port(client?.secondary_port_type) : '—' },
  ]
}

/** Every client id the YAML assigns — the `Client ID (YAML)` row opened. */
export function ibClientIdLines(status: StatusResponse | undefined): SlotLine[] {
  const p: IbClientPort = status?.config?.ib_client?.port ?? {}
  const secondaryOn = Boolean(status?.config?.ib_client?.client?.secondary_host_ip?.trim())
  const id = (v: number | string | null | undefined) => (v == null || v === '' ? '—' : String(v))
  const second = (v: number | string | null | undefined) => (secondaryOn ? id(v) : '—')
  return [
    { group: 'Daemon', label: 'Trading', host: id(p.trading), secondary: '—' },
    { label: 'Listener', host: id(p.listener_host), secondary: id(p.listener_secondary) },
    { group: 'Socket services', label: 'Operator (cmd RPC)', host: id(p.operator_host), secondary: second(p.operator_secondary) },
    { label: 'Ingestor', host: id(p.ingestor), secondary: '—' },
    { label: 'Account agent', host: id(p.account_agent), secondary: second(p.account_agent_secondary) },
  ]
}
