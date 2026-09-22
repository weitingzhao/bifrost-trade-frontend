/**
 * Reading and writing JSON in `localStorage`, once.
 *
 * Every storage-backed corner of this app had grown its own four-line pair —
 * a `try`, a `JSON.parse`, a `catch` that returns null — and the code-health
 * ratchet counted the fourth one and was right to. The failure modes are the
 * same everywhere and worth stating in one place rather than four:
 *
 * - **a private window throws on access**, not on read, so the `try` has to
 *   wrap `getItem` itself and not just the parse;
 * - **a corrupt value is not an empty one**: a half-written string parses to a
 *   throw, and the caller wants its default rather than a crash;
 * - **quota failures on write are not worth reporting** — the thing being
 *   stored is a convenience, and a desk that cannot remember a window position
 *   still works.
 *
 * Three older helpers named `readStored` do the same job in
 * `usePressureCeiling`, `useCushionThreshold` and `useDiscoveryCompare`; they
 * can adopt this whenever one of them is next touched.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** `null` removes the key — storing "nothing" and having nothing are one state. */
export function writeJson(key: string, value: unknown): void {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private window, quota — the convenience simply does not survive a reload */
  }
}
