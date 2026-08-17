import { MARKET_DATA_PLUGIN_MIGRATED } from '@/api/marketDataRetired'
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
}: {
  open: boolean
  onClose: () => void
  symbol: string | null
  table: 'option_day' | 'option_min'
  period?: string
}) {
  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Bar quality — {symbol ?? '—'} ({table})
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{MARKET_DATA_PLUGIN_MIGRATED}</p>
        <DenseDataTable tableClassName="text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1">Note</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1 text-muted-foreground">
                Bar-quality detail moved to Market Data Plugin analytics.
              </td>
            </tr>
          </tbody>
        </DenseDataTable>
      </DialogContent>
    </Dialog>
  )
}
