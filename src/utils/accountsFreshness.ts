import type { ExecutionFreshnessItem, FlexCoverageDimension } from '@/types/trading'
import { formatLastUpdate } from '@/utils/positions'

const FLEX_SOURCE = 'flex_trades'
const CLIENT_EXEC_SOURCES = new Set(['tws_client', 'tws_event'])

export function isoToEpochSec(iso: string | null | undefined): number | null {
  if (!iso || !iso.trim()) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return ms / 1000
}

export function clockLabel(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  return formatLastUpdate(ts)
}

export function latestBySources(
  items: ExecutionFreshnessItem[],
  sources: ReadonlySet<string>,
): ExecutionFreshnessItem | null {
  return items.reduce<ExecutionFreshnessItem | null>((best, r) => {
    if (!sources.has((r.source ?? '').trim())) return best
    const ts = r.latest_exec_ts ?? 0
    const bestTs = best?.latest_exec_ts ?? 0
    return ts >= bestTs ? r : best
  }, null)
}

export function latestFlexFreshness(items: ExecutionFreshnessItem[]): ExecutionFreshnessItem | null {
  return latestBySources(items, new Set([FLEX_SOURCE]))
}

export function latestClientExecFreshness(
  items: ExecutionFreshnessItem[],
): ExecutionFreshnessItem | null {
  return latestBySources(items, CLIENT_EXEC_SOURCES)
}

/** Last Flex ingest write (Pull), not max(exec_time). */
export function flexPullTsFromCoverage(dims: FlexCoverageDimension[]): number | null {
  let best: number | null = null
  for (const d of dims) {
    const name = (d.dimension ?? '').toLowerCase()
    if (!name.startsWith('flex-')) continue
    const ts = isoToEpochSec(d.updated_at) ?? isoToEpochSec(d.latest_ts)
    if (ts != null && (best == null || ts > best)) best = ts
  }
  return best
}

export function pullAndRecLine(pullTs: number | null, recTs: number | null): string {
  return `Pull ${clockLabel(pullTs)} · Rec ${clockLabel(recTs)}`
}

/** Daily Flex ingest missed when last Pull is older than ~36h. */
export function flexPullStale(pullTs: number | null, nowSec = Date.now() / 1000): boolean {
  if (pullTs == null || !Number.isFinite(pullTs)) return false
  return nowSec - pullTs >= 36 * 3600
}
