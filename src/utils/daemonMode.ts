import type { StatusResponse } from '@/types/monitor'

/**
 * Whether the hedge daemon says it runs in paper mode, from its own heartbeat
 * (`auto_status.config_summary`, e.g. "paper_trade=True"). Null when it has not
 * said.
 *
 * This is the only source for the mode. The gate's `guard.risk.paper_trade` key
 * is never read by the daemon, which forces paper mode in code while D10 holds,
 * so a gate edited to `false` used to make the Limits book and the hedge menu
 * read "live" over a daemon that was still simulating (debt TD-66).
 */
export function daemonPaperTrade(status: StatusResponse | undefined): boolean | null {
  const auto = status?.daemon?.trading?.auto_status as Record<string, unknown> | undefined
  const summary = typeof auto?.config_summary === 'string' ? auto.config_summary : null
  return summary == null ? null : /paper_trade\s*=\s*true/i.test(summary)
}
