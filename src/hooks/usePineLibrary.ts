/**
 * The Pine scripts the daily build runs, for the surfaces that offer them as
 * choices — the Screener's Pine stage and the Symbol chart's signal picker.
 *
 * Same query as the Simulator's and Signal Decay's script lists, so a script
 * saved in Backtest › Pine library (which invalidates `research-engine/pine`)
 * shows up everywhere at once. The built-ins stand in until the library answers.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPineScripts, pineLibraryEntries, type PineLibraryEntry, type PineScriptRow } from '@/api/research/pine'
import { QUERY_KEYS } from '@/constants/queryKeys'

export function usePineLibrary(): {
  scripts: readonly PineLibraryEntry[]
  fromLibrary: boolean
  /** The library's rows as Research sent them (plots, overlay…); undefined until it answers. */
  rows: readonly PineScriptRow[] | undefined
} {
  const q = useQuery({
    queryKey: QUERY_KEYS.researchEngine.pineScripts,
    queryFn: () => fetchPineScripts(),
    staleTime: 5 * 60_000,
  })
  const rows = q.data?.scripts
  const scripts = useMemo(() => pineLibraryEntries(rows), [rows])
  return { scripts, fromLibrary: rows != null, rows }
}
