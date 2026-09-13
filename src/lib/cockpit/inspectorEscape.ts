/**
 * Which inspector Escape closes.
 *
 * Both the Copilot and the inspector want the key, and both would listen on
 * `window` — where the Copilot's handler is registered first (AppLayout mounts
 * before any page) and so would run first, closing the Copilot while the
 * reader meant the panel they just opened. Precedence has to be stated
 * somewhere rather than fall out of mount order, and `keybinds.ts` is where
 * this app states it.
 *
 * A stack, not a flag: an inspector opened over another closes first.
 */
type Close = () => void

const open: Close[] = []

export function registerInspectorEscape(close: Close): () => void {
  open.push(close)
  return () => {
    const i = open.lastIndexOf(close)
    if (i >= 0) open.splice(i, 1)
  }
}

/** Closes the topmost open inspector. False when there was none. */
export function closeTopInspector(): boolean {
  const close = open.pop()
  if (!close) return false
  close()
  return true
}

/** Test seam — the stack is module state, and a leaked entry would fail the next test silently. */
export function inspectorEscapeDepth(): number {
  return open.length
}
