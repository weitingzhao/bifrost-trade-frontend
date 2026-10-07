/**
 * The daily book snapshots (api 0.12.0 / core 0.54.0, TD-138 / TD-139).
 *
 * `null` means the API does not serve the route (404: an API older than 0.12.0) —
 * the page keeps its not-wired state then, which is the truth for that API, and
 * never reads it as an empty history. Any other failure throws as usual.
 */
import { withValidation } from '@/lib/apiValidation'
import { HttpError, requestJson } from '@/lib/http'
import { portfolioUrl } from '@/lib/devApiUrl'
import {
  NavHistoryResponseSchema,
  PnlAttributionResponseSchema,
  type NavHistoryResponse,
  type PnlAttributionResponse,
} from '@/lib/schemas/snapshots'

export interface SnapshotRange {
  /** YYYY-MM-DD, inclusive. Both omitted: the latest session. */
  from?: string | null
  to?: string | null
  accountId?: string | null
  tradeId?: number | null
}

const validateNav = withValidation<NavHistoryResponse>(NavHistoryResponseSchema, 'portfolio/nav-history')
const validateAttribution = withValidation<PnlAttributionResponse>(
  PnlAttributionResponseSchema,
  'portfolio/pnl-attribution',
)

/** `?from_date=&to_date=&account_id=&trade_id=` — the canonical names (TD-51). */
export function snapshotQuery(r: SnapshotRange): string {
  const q = new URLSearchParams()
  if (r.from) q.set('from_date', r.from)
  if (r.to) q.set('to_date', r.to)
  if (r.accountId) q.set('account_id', r.accountId)
  if (r.tradeId != null) q.set('trade_id', String(r.tradeId))
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function readOrNotServed<T>(path: string, label: string, signal?: AbortSignal): Promise<T | null> {
  try {
    return (await requestJson(portfolioUrl(path), { label, signal })) as T
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return null
    throw e
  }
}

export async function fetchNavHistory(r: SnapshotRange = {}, signal?: AbortSignal): Promise<NavHistoryResponse | null> {
  const path = `/portfolio/nav-history${snapshotQuery(r)}`
  const raw = await readOrNotServed<unknown>(path, 'Portfolio /portfolio/nav-history', signal)
  return raw == null ? null : validateNav(raw, path)
}

export async function fetchPnlAttribution(
  r: SnapshotRange = {},
  signal?: AbortSignal,
): Promise<PnlAttributionResponse | null> {
  const path = `/portfolio/pnl-attribution${snapshotQuery(r)}`
  const raw = await readOrNotServed<unknown>(path, 'Portfolio /portfolio/pnl-attribution', signal)
  return raw == null ? null : validateAttribution(raw, path)
}
