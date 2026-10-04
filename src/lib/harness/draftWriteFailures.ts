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

/**
 * Send one write per draft and settle them all: ids that failed are recorded
 * here and come back on their card; ids that landed are cleared. Throws only
 * when every write failed, so the caller's single "did not save" voice speaks
 * for the all-or-nothing case and the card speaks for the partial one.
 */
export async function settleDraftWrites<R>(
  ids: readonly string[],
  verb: string,
  send: (id: string) => Promise<R>,
  onLanded?: (id: string, result: R) => void,
): Promise<{ landed: string[]; failed: string[] }> {
  const results = await Promise.allSettled(ids.map((id) => send(id)))
  const landed: string[] = []
  const failed: Record<string, DraftWriteFailure> = {}
  results.forEach((r, i) => {
    const id = ids[i]
    if (r.status === 'fulfilled') {
      landed.push(id)
      onLanded?.(id, r.value)
    } else {
      failed[id] = { verb, message: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    }
  })
  markDraftWrites(failed, landed)
  const failedIds = Object.keys(failed)
  if (landed.length === 0 && failedIds.length > 0) {
    throw new Error(failed[failedIds[0]].message)
  }
  return { landed, failed: failedIds }
}
