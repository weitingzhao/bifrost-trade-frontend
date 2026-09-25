/**
 * The page scope — which accounts, symbol and expiry the whole book is read
 * for — kept in the URL so it survives the walk from Positions to Backing and
 * back, and so a link can carry it. Filters live in the URL by convention
 * here (see the Instances page); this is the same rule for the two pages
 * that share one derivation.
 *
 *   ?acct=host            HOST only          (absent = both accounts)
 *   ?acct=none            neither — the page's own empty state
 *
 * Positions follows the shell's account scope (`followAccount`, Rev .58):
 * there, an absent `?acct=` means the scope, not both — see
 * `useFollowedAccountPair`.
 *   ?symbol=NVDA          symbol scope
 *   ?expiry=20261120      YYYYMMDD prefix
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AccountFilter } from '@/utils/positionsGrouping'
import type { AccountPair } from '@/lib/accountScope'
import { useFollowedAccountPair } from '@/hooks/useFollowedAccountPair'
import { keepHeldSymbol } from '@/lib/symbolContext'

export interface PositionsScope {
  accountFilter: AccountFilter
  filterSymbol: string
  filterExpiry: string
}

export const SCOPE_KEYS = { account: 'acct', symbol: 'symbol', expiry: 'expiry' } as const

export function parsePositionsScope(sp: URLSearchParams): PositionsScope {
  const acct = (sp.get(SCOPE_KEYS.account) ?? '').toLowerCase()
  const parts = new Set(acct.split(',').map((s) => s.trim()).filter(Boolean))
  // Both on unless the URL names a subset; naming neither is a link that shows
  // nothing, which is never what a link means.
  const accountFilter: AccountFilter =
    parts.size === 0 || (parts.has('host') && parts.has('secondary'))
      ? { host: true, secondary: true }
      : { host: parts.has('host'), secondary: parts.has('secondary') }
  return {
    accountFilter,
    filterSymbol: (sp.get(SCOPE_KEYS.symbol) ?? '').trim().toUpperCase(),
    filterExpiry: (sp.get(SCOPE_KEYS.expiry) ?? '').replace(/\D/g, '').slice(0, 8),
  }
}

/** Writes the scope onto `base`, leaving the page's other params alone. */
export function serializePositionsScope(scope: PositionsScope, base?: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(base)
  const { host, secondary } = scope.accountFilter
  if (host && secondary) out.delete(SCOPE_KEYS.account)
  // Neither is a value too: an empty `acct=` would read back as both.
  else out.set(SCOPE_KEYS.account, [host ? 'host' : '', secondary ? 'secondary' : ''].filter(Boolean).join(',') || 'none')
  if (scope.filterSymbol) out.set(SCOPE_KEYS.symbol, scope.filterSymbol)
  else out.delete(SCOPE_KEYS.symbol)
  if (scope.filterExpiry) out.set(SCOPE_KEYS.expiry, scope.filterExpiry)
  else out.delete(SCOPE_KEYS.expiry)
  return out
}

export function usePositionsScope(opts?: { followAccount?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const parsed = useMemo(() => parsePositionsScope(searchParams), [searchParams])
  const follow = Boolean(opts?.followAccount)

  const writeAccount = useCallback(
    (pair: AccountPair | null, arrival?: boolean) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (pair == null) next.delete(SCOPE_KEYS.account)
          else next.set(SCOPE_KEYS.account, serializePositionsScope({ ...parsePositionsScope(prev), accountFilter: pair }).get(SCOPE_KEYS.account) ?? '')
          return arrival ? keepHeldSymbol(next) : next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  const { pair: followedPair, setPair: setFollowedPair } = useFollowedAccountPair(
    follow && searchParams.has(SCOPE_KEYS.account) ? parsed.accountFilter : null,
    writeAccount,
  )
  const scope = useMemo(
    () => (follow ? { ...parsed, accountFilter: followedPair } : parsed),
    [follow, parsed, followedPair],
  )

  const update = useCallback(
    (patch: Partial<PositionsScope>) => {
      setSearchParams(
        (prev) => serializePositionsScope({ ...parsePositionsScope(prev), ...patch }, prev),
        // Typing a symbol is not navigation; one history entry per page, not per keystroke.
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return {
    scope,
    setAccountFilter: useCallback(
      (accountFilter: AccountFilter) => (follow ? setFollowedPair(accountFilter) : update({ accountFilter })),
      [follow, setFollowedPair, update],
    ),
    setFilterSymbol: useCallback((filterSymbol: string) => update({ filterSymbol }), [update]),
    setFilterExpiry: useCallback((filterExpiry: string) => update({ filterExpiry }), [update]),
    /**
     * Every axis back to the whole book in one write (§17.3 Clear). Three
     * setters in a row would each serialise from the same stale params, and
     * the last would put the other two back.
     */
    resetScope: useCallback(
      () => update({ accountFilter: { host: true, secondary: true }, filterSymbol: '', filterExpiry: '' }),
      [update],
    ),
    /** The scope alone, for a link to the other page. */
    scopeSearch: serializePositionsScope(scope).toString(),
  }
}
