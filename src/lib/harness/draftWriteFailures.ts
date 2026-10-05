/**
 * Drafts whose held write did not land, by id — so the card it sits on can say
 * which of its drafts failed and why.
 *
 * A call card answers two to four drafts in one Record answer (Rev .143 #2),
 * and the server takes them one request each. When some land and some do not,
 * the landed ones leave the queue and the rest stay on the card; without this
 * the card would come back looking untouched, and the reader would not know
 * the answer was half recorded.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { HttpError } from '@/lib/http'

export interface DraftWriteFailure {
  /** `Record answer` · `Dismiss` */
  verb: string
  message: string
}

const failureStore = createExternalStore<{ byId: Readonly<Record<string, DraftWriteFailure>> }>({ byId: {} })

export function markDraftWrites(failed: Record<string, DraftWriteFailure>, landed: readonly string[]): void {
  failureStore.setState((s) => {
    const byId = { ...s.byId, ...failed }
    for (const id of landed) delete byId[id]
    return { byId }
  })
}

export function clearDraftWriteFailures(ids: readonly string[]): void {
  markDraftWrites({}, ids)
}

export function useDraftWriteFailures(): Readonly<Record<string, DraftWriteFailure>> {
  return failureStore.useStore().byId
}

/** Read outside React — tests and the commit path. */
export function draftWriteFailures(): Readonly<Record<string, DraftWriteFailure>> {
  return failureStore.getState().byId
}

/** What a write on an expired draft is told. Neutral: there is nothing left to answer. */
export const DRAFT_EXPIRED_LINE = 'Expired'
/** …when a newer draft took its place (`reason: 'superseded'`). */
export const DRAFT_SUPERSEDED_LINE = 'Expired — a newer draft replaced it'

/**
 * Whether a refused write means the draft expired before it was answered —
 * not a failure: there is nothing left to answer (Research 0.166.0, Owner
 * 2026-10-04). The server says so with a 409 whose `detail` is an object,
 * `{ code: 'draft_expired', reason, superseded_by, … }`. A 409 whose detail is
 * a string — "draft status is approved, expected pending" — is a different
 * conflict and stays a failure. Returns the line to show, or null.
 */
export function draftExpiredLine(error: unknown): string | null {
  if (!(error instanceof HttpError) || error.status !== 409) return null
  const body = error.body
  const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : null
  if (!detail || typeof detail !== 'object') return null
  const d = detail as { code?: unknown; reason?: unknown }
  if (d.code !== 'draft_expired') return null
  return d.reason === 'superseded' ? DRAFT_SUPERSEDED_LINE : DRAFT_EXPIRED_LINE
}

/**
 * Send one write per draft and settle them all: ids that failed are recorded
 * here and come back on their card; ids that landed are cleared. A draft that
 * had expired is neither — it leaves the card without a red word, and the
 * caller says so in a neutral line (`expiredLine`, from the first expired one). Throws only when every
 * write failed outright, so the caller's single "did not save" voice speaks
 * for the all-or-nothing case and the card speaks for the partial one.
 */
export async function settleDraftWrites<R>(
  ids: readonly string[],
  verb: string,
  send: (id: string) => Promise<R>,
  onLanded?: (id: string, result: R) => void,
): Promise<{ landed: string[]; failed: string[]; expired: string[]; expiredLine: string | null }> {
  const results = await Promise.allSettled(ids.map((id) => send(id)))
  const landed: string[] = []
  const expired: string[] = []
  let expiredLine: string | null = null
  const failed: Record<string, DraftWriteFailure> = {}
  results.forEach((r, i) => {
    const id = ids[i]
    if (r.status === 'fulfilled') {
      landed.push(id)
      onLanded?.(id, r.value)
      return
    }
    const line = draftExpiredLine(r.reason)
    if (line) {
      expired.push(id)
      expiredLine ??= line
    } else {
      failed[id] = { verb, message: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    }
  })
  markDraftWrites(failed, [...landed, ...expired])
  const failedIds = Object.keys(failed)
  if (landed.length === 0 && expired.length === 0 && failedIds.length > 0) {
    throw new Error(failed[failedIds[0]].message)
  }
  return { landed, failed: failedIds, expired, expiredLine }
}

/**
 * The line after a held write settles, or null when everything landed. One
 * line covers the three outcomes: some failed (they stay on the card), some
 * had expired (they leave it), or both.
 */
export function settledLine(
  done: string,
  total: number,
  r: { landed: readonly string[]; failed: readonly string[]; expired: readonly string[]; expiredLine: string | null },
): string | null {
  if (r.failed.length === 0 && r.expired.length === 0) return null
  if (r.failed.length === 0) {
    const line = r.expiredLine ?? DRAFT_EXPIRED_LINE
    return total === 1 ? line : `${done} ${r.landed.length} of ${total} · ${r.expired.length} ${line.charAt(0).toLowerCase()}${line.slice(1)}`
  }
  const expired = r.expired.length > 0 ? ` · ${r.expired.length} expired` : ''
  return `${done} ${r.landed.length} of ${total}${expired} — the rest stay on the card`
}
