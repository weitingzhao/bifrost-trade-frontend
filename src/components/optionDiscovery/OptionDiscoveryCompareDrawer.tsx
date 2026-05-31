import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { fmtUsd } from '@/lib/format'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { DiscoveryScrollArea } from '@/components/optionDiscovery/DiscoveryScrollArea'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { COMPARE_MAX_SLOTS } from '@/utils/optionDiscovery/compareRows'

const MAX_SLOTS = COMPARE_MAX_SLOTS

function fmtOptNum(v: number | null | undefined, digits = 4): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

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
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Side</TableHead>
                    <TableHead>Strike</TableHead>
                    <TableHead>Bid</TableHead>
                    <TableHead>Ask</TableHead>
                    <TableHead>Mid</TableHead>
                    <TableHead>IV</TableHead>
                    <TableHead className="w-20" aria-label="Remove" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={`${r.strike}-${r.right}-${i}`}>
                      <TableCell>{r.right === 'P' || r.right === 'PUT' ? 'Put' : 'Call'}</TableCell>
                      <TableCell className="tabular-nums">{r.strike.toFixed(2)}</TableCell>
                      <TableCell className="tabular-nums">{r.bid != null ? fmtUsd(r.bid) : '—'}</TableCell>
                      <TableCell className="tabular-nums">{r.ask != null ? fmtUsd(r.ask) : '—'}</TableCell>
                      <TableCell className="tabular-nums">{r.mid != null ? fmtUsd(r.mid) : '—'}</TableCell>
                      <TableCell className="tabular-nums">{fmtOptNum(r.iv, 4)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onRemove(i)}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
