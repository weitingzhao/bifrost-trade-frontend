import { useQueries } from '@tanstack/react-query'
import {
  fetchPluginStatus,
  needsAttention,
  pluginLamp,
  PLATFORM_PLUGINS,
  type PlatformPluginDef,
  type PluginLamp,
  type PluginStatus,
} from '@/api/platformPlugins'

export interface PluginRow {
  def: PlatformPluginDef
  status?: PluginStatus
  lamp: PluginLamp
  isLoading: boolean
  /** The fetch itself failed — the gateway route or platform-api is unreachable. */
  fetchError?: string
}

/** Slow enough to be free, fast enough that a plugin dropping shows up while you watch. */
const REFETCH_MS = 30_000

export function usePlatformPlugins(enabled: boolean) {
  const results = useQueries({
    queries: PLATFORM_PLUGINS.map(def => ({
      queryKey: ['platform-plugin', def.key],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchPluginStatus(def.key, signal),
      enabled,
      refetchInterval: (enabled ? REFETCH_MS : false) as number | false,
      refetchOnWindowFocus: false,
      staleTime: REFETCH_MS / 2,
      retry: 1,
    })),
  })

  const rows: PluginRow[] = PLATFORM_PLUGINS.map((def, i) => {
    const r = results[i]
    return {
      def,
      status: r?.data,
      lamp: r?.isError ? 'unknown' : pluginLamp(r?.data),
      isLoading: Boolean(r?.isLoading),
      fetchError: r?.isError ? (r.error as Error)?.message : undefined,
    }
  })

  return {
    rows,
    attentionCount: rows.filter(r => !r.isLoading && needsAttention(r.lamp)).length,
    isLoading: rows.some(r => r.isLoading),
    refetch: () => results.forEach(r => void r.refetch()),
  }
}
