/**
 * The hedge daemon's readings, as the Trade Desk's Hedge menu and header strip
 * show them. Pure, so the menu and the strip read the same words, and kept
 * out of the component file so fast refresh can keep the menu's state.
 */
import type { StatusResponse } from '@/types/monitor'

export interface HedgeReading {
  suspended: boolean
  alive: boolean
  /** What the daemon calls itself — `running_suspended`, `BOOT`, … */
  state: string | null
  paperTrade: boolean | null
}

/** One line of the hedge daemon's own reading. */
export interface HedgeFact {
  label: string
  value: string
}

const money = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? `${v < 0 ? '−' : ''}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'
const plain = (v: unknown) => (v == null || v === '' ? '—' : String(v))

/**
 * What the hedge daemon says about itself — the readings the retired System ›
 * Daemon page carried as "strategy metrics" and as its Risk model tiles, which
 * were the same auto status twice (Owner 2026-09-25: they live with the hedge
 * controls). Read-only; nothing here is computed for this menu.
 */
export function hedgeFacts(status: StatusResponse | undefined): HedgeFact[] {
  const a = status?.daemon?.trading?.auto_status as Record<string, unknown> | undefined
  const ts = typeof a?.ts === 'number' ? new Date(a.ts * 1000).toISOString().slice(11, 19) + 'Z' : '—'
  return [
    { label: 'Trading state', value: plain(a?.trading_state) },
    { label: 'Symbol · spot', value: a?.symbol ? `${a.symbol} · ${money(a?.spot)}` : '—' },
    { label: 'Stock position', value: plain(a?.stock_position) },
    { label: 'Net Δ', value: plain(a?.net_delta) },
    { label: 'Hedges today', value: plain(a?.daily_hedge_count) },
    { label: 'Hedge P&L today', value: money(a?.daily_pnl) },
    { label: 'As of', value: ts },
  ]
}

/** The daemon's own words, read once so the menu and the strip agree. */
export function hedgeReading(status: StatusResponse | undefined): HedgeReading {
  const auto = status?.daemon?.trading?.auto_status as Record<string, unknown> | undefined
  const summary = typeof auto?.config_summary === 'string' ? auto.config_summary : null
  return {
    suspended: status?.daemon?.trading?.trading_suspended ?? false,
    alive: status?.daemon?.heartbeat?.daemon_alive ?? false,
    state: typeof auto?.daemon_state === 'string' ? auto.daemon_state : null,
    paperTrade: summary == null ? null : /paper_trade\s*=\s*true/i.test(summary),
  }
}
