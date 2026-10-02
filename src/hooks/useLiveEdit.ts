/**
 * Edit an object where it is read (design §17.5, Rev .138 / .140): the fields
 * hold a draft, and every change goes out as one write of the whole object a
 * short beat after the last keystroke. No Save. Each change pushes its undo on
 * the page's stack (`pushUndo`) — a run of typing in one field is one step —
 * and the undo writes the earlier draft back. Leaving (unmount) sends what is
 * still waiting.
 *
 * Mount it per object (key the component on the object's id), so a new object
 * starts from its own fields.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { notify, pushUndo } from '@/lib/shellNotify'

const WRITE_DELAY_MS = 500

export function useLiveEdit<T>({
  initial,
  undoKey,
  write,
  ready = () => true,
  onSaved,
}: {
  initial: T
  /** Unique per object, e.g. `alloc:12` — the undo step is `${undoKey}:${field}`. */
  undoKey: string
  /** One write of the whole draft. Throwing says why on the toast. */
  write: (draft: T) => Promise<unknown>
  /** A draft the server would refuse (a blank name) is held back, not sent. */
  ready?: (draft: T) => boolean
  onSaved?: () => void
}) {
  const [draft, setDraft] = useState<T>(initial)
  const latest = useRef(draft)
  const fns = useRef({ write, ready, onSaved })
  useLayoutEffect(() => {
    latest.current = draft
    fns.current = { write, ready, onSaved }
  })
  const timer = useRef<number | null>(null)
  const pending = useRef<T | null>(null)

  const flush = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    const next = pending.current
    pending.current = null
    if (next == null || !fns.current.ready(next)) return
    fns.current
      .write(next)
      .then(() => fns.current.onSaved?.())
      .catch((e: unknown) => notify(`Not saved — ${e instanceof Error ? e.message : String(e)}`))
  }, [])
  useEffect(() => flush, [flush])

  const queue = useCallback(
    (next: T) => {
      pending.current = next
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, WRITE_DELAY_MS)
    },
    [flush],
  )

  /** Change one field. `field` names the undo step; same field within 1.5s = one step. */
  const edit = useCallback(
    (field: string, change: (d: T) => T) => {
      const before = latest.current
      const next = change(before)
      pushUndo(`${undoKey}:${field}`, () => {
        setDraft(before)
        queue(before)
      })
      setDraft(next)
      queue(next)
    },
    [undoKey, queue],
  )

  return { draft, edit, flush }
}
