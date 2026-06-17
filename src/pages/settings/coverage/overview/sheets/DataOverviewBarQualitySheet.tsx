/* eslint-disable react-hooks/set-state-in-effect -- fetch on dialog open */
import { useEffect, useState } from 'react'
import { fetchBarQualityDetail } from '@/api/massive/watchlistCoverage'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DenseDataTable } from '@/components/data-display/DenseTable'

export function DataOverviewBarQualitySheet({
  open,
  onClose,
  symbol,
  table,
  period,
}: {
  open: boolean
  onClose: () => void
  symbol: string | null
  table: 'option_day' | 'option_min'
  period?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dailyCount, setDailyCount] = useState(0)

  useEffect(() => {
    if (!open || !symbol) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchBarQualityDetail(symbol, table, period).then(res => {
      if (cancelled) return
      if (!res.ok) {
        setError(res.error ?? 'Load failed')
        setDailyCount(0)
      } else {
        setDailyCount(res.daily.length)
        setError(null)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, symbol, table, period])

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Bar quality — {symbol ?? '—'} ({table})
          </DialogTitle>
        </DialogHeader>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!loading && !error ? (
          <p className="text-sm text-muted-foreground">
            {dailyCount} daily breakdown row(s). Open Legacy UI for full expiry/period grids if needed.
          </p>
        ) : null}
        <DenseDataTable tableClassName="text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1">Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1 text-muted-foreground">
                Detailed bar-quality tables are loaded from GET /research/massive/bar-quality-detail.
              </td>
            </tr>
          </tbody>
        </DenseDataTable>
      </DialogContent>
    </Dialog>
  )
}
