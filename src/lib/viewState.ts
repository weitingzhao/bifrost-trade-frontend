/**
 * Which §17.1 state one data source is in, read off its query.
 *
 * The distinction the design cares about is between the two failures: a read
 * that failed with nothing to show (`failed` — the region says nothing was
 * evaluated) and a refresh that failed over a copy we still hold (`stale` —
 * the data stays, a strip says it stopped moving). TanStack keeps the last
 * good `data` when a refetch errors, which is exactly that line.
 */
import { etClock } from '@/lib/freshness'

export type SourceState = 'loading' | 'failed' | 'stale' | 'ready'

export interface QueryLike {
  data: unknown
  isPending: boolean
  isError: boolean
  error: unknown
  dataUpdatedAt?: number
  errorUpdatedAt?: number
}

export function sourceState(q: QueryLike): SourceState {
  const has = q.data != null
  if (q.isError) return has ? 'stale' : 'failed'
  if (!has && q.isPending) return 'loading'
  return 'ready'
}

function reason(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.split('\n')[0].slice(0, 140)
  return 'the service did not answer'
}

/**
 * The failed detail: the reason and the time, and — the part that keeps a
 * failure from reading as "no problems" — that nothing here was evaluated.
 */
export function failedDetail(q: QueryLike, what: string): string {
  const at = q.errorUpdatedAt ? ` · ${etClock(q.errorUpdatedAt, true)} ET` : ''
  return `${reason(q.error)}${at}. ${what}`
}

/** The stale detail: what is shown, since when, and what it may be missing. */
export function staleDetail(q: QueryLike, missing: string): string {
  const shown = q.dataUpdatedAt ? `Showing ${etClock(q.dataUpdatedAt)}` : 'Showing the last copy'
  const failed = q.errorUpdatedAt ? ` · failed ${etClock(q.errorUpdatedAt, true)} ET` : ''
  return `${shown}${failed} — ${missing}`
}
