/**
 * A wired page's account pair, followed from the shell (`lib/accountScope.ts`).
 *
 * The page keeps its own two toggles; they and the top bar's Account control
 * are one value, not two:
 *
 * - With no account in the URL, the page shows the shell scope.
 * - A link that names one (`?acct=host`, `?sec=0`) is honoured on arrival and
 *   becomes the scope — the way an arriving `?symbol=` becomes the held
 *   symbol — and the URL gives it back.
 * - A toggle that lands on one account or both writes the scope; one that
 *   lands on neither is the page's alone (the shell never carries "none"),
 *   so it stays in the URL.
 */
import { useCallback, useEffect, useMemo } from 'react'
import {
  pairToScope,
  scopeToPair,
  setAccountScope,
  useAccountScope,
  type AccountPair,
} from '@/lib/accountScope'

export function useFollowedAccountPair(
  /** What the URL names, or null when it names nothing. */
  explicit: AccountPair | null,
  /**
   * Put a pair in the URL, or take it out (null). Must be stable. `arrival`
   * marks the write that absorbs an arriving link — it lands in the same pass
   * as the held-symbol sync, and must not undo it (`keepHeldSymbol`).
   */
  writeUrl: (pair: AccountPair | null, arrival?: boolean) => void,
): { pair: AccountPair; setPair: (next: AccountPair) => void } {
  const shell = useAccountScope()
  const has = explicit != null
  const eh = explicit?.host ?? true
  const es = explicit?.secondary ?? true

  useEffect(() => {
    if (!has) return
    const scope = pairToScope({ host: eh, secondary: es })
    if (!scope) return
    setAccountScope(scope)
    writeUrl(null, true)
  }, [has, eh, es, writeUrl])

  const setPair = useCallback(
    (next: AccountPair) => {
      const scope = pairToScope(next)
      if (scope) {
        setAccountScope(scope)
        writeUrl(null)
      } else {
        writeUrl(next)
      }
    },
    [writeUrl],
  )

  const pair = useMemo(
    () => (has ? { host: eh, secondary: es } : scopeToPair(shell)),
    [has, eh, es, shell],
  )
  return { pair, setPair }
}
