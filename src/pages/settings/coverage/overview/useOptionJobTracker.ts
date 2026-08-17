import { useCallback, useState } from 'react'
import { MARKET_DATA_PLUGIN_MIGRATED } from '@/api/marketDataRetired'

export interface OptionJobTrackItem {
  job_id: string
  kindLabel: string
  symbol: string
  status: string
  enqueuedAt: number
  deduplicated?: boolean
  error?: string
}

/**
 * Job tracker for Coverage option fill actions.
 * Massive job-event SSE was retired with api-massive; trackJob records a
 * terminal "failed" row so the UI can show the migration notice.
 */
export function useOptionJobTracker(onTerminal?: () => void) {
  void onTerminal
  const [items, setItems] = useState<OptionJobTrackItem[]>([])

  const trackJob = useCallback(
    (jobId: string, kindLabel: string, symbol: string, deduplicated?: boolean) => {
      setItems(prev =>
        [
          {
            job_id: jobId,
            kindLabel,
            symbol,
            status: 'failed',
            enqueuedAt: Date.now(),
            deduplicated,
            error: MARKET_DATA_PLUGIN_MIGRATED,
          },
          ...prev.filter(it => it.job_id !== jobId),
        ].slice(0, 128),
      )
    },
    [],
  )

  return {
    items,
    trackJob,
    activeCount: 0,
    clearItems: () => setItems([]),
  }
}
