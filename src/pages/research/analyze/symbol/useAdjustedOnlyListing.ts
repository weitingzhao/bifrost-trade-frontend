/**
 * Is this name's option listing only adjusted contracts? Asked only when every
 * option lens came back empty (the dossier batch, already cached by the page),
 * and then through the Chain face's own reads — the listed expiries and the
 * nearest one's snapshot — under its cache keys, so a name with readings costs
 * nothing and an empty one costs what opening Chain would.
 */
import { useQuery } from '@tanstack/react-query'
import { fetchChainExpirations, fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { useDossier } from '@/hooks/useDossier'
import { etTodayIso } from '@/lib/freshness'
import { adjustedOnly, chainListing, optionMetricsEmpty, type ChainListing } from './adjustedListing'

export function useAdjustedOnlyListing(symbol: string): ChainListing | null {
  const sym = (symbol || '').trim().toUpperCase()
  const { exhibits, loading } = useDossier(sym)
  const ask = sym !== '' && !loading && optionMetricsEmpty(exhibits)
  const today = etTodayIso()
  const expQ = useQuery({
    queryKey: ['market', 'chain-expirations', sym, today],
    queryFn: () => fetchChainExpirations(sym, today),
    enabled: ask,
    staleTime: 10 * 60_000,
  })
  const nearest = expQ.data?.[0] ?? null
  const snapQ = useQuery({
    queryKey: ['market', 'option-snapshots', sym, nearest],
    queryFn: () => fetchOptionSnapshots(sym, nearest as string),
    enabled: ask && nearest != null,
    staleTime: 5 * 60_000,
  })
  if (!ask || !snapQ.data) return null
  const listing = chainListing(snapQ.data.rows)
  return adjustedOnly(listing) ? listing : null
}
