import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryScrollArea } from '@/components/optionDiscovery/DiscoveryScrollArea'
import { DiscoveryCompareTable } from '@/components/optionDiscovery/DiscoveryCompareTable'
import { Button } from '@/components/ui/button'

import { COMPARE_MAX_SLOTS } from '@/utils/optionDiscovery/compareRows'

const MAX_SLOTS = COMPARE_MAX_SLOTS

export function OptionDiscoveryCompareDrawer({
  open,
  onClose,
  rows,
  symbol,
  expiration,
  dteLabel,
  onRemove,
  onClear,
}: {
  open: boolean
  onClose: () => void
  rows: OptionSnapshotRow[]
  symbol: string
  expiration: string
  dteLabel: string
  onRemove: (index: number) => void
  onClear: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Compare option contracts"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="text-base font-semibold">Compare contracts</h3>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <DiscoveryHint className="px-4">
          {symbol.trim().toUpperCase()} · {expiration || '—'}
          {dteLabel && dteLabel !== '—' ? ` · ${dteLabel}` : ''} · max {MAX_SLOTS} legs
        </DiscoveryHint>
        {rows.length === 0 ? (
          <DiscoveryHint className="px-4">Add contracts from the chain or contract header (Add to compare).</DiscoveryHint>
        ) : (
          <>
            <DiscoveryScrollArea className="flex-1 px-4" maxHeightClass="max-h-[60vh]">
              <DiscoveryCompareTable rows={rows} onRemove={onRemove} />
            </DiscoveryScrollArea>
            <div className="border-t border-border px-4 py-3">
              <Button type="button" variant="secondary" size="sm" onClick={onClear}>
                Clear all
              </Button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
