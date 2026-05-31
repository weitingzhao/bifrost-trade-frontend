import type { OptionSnapshotRow } from '@/types/optionDiscovery'
import { fmtUsd } from '@/lib/format'
import { DiscoveryHint } from '@/components/optionDiscovery/DiscoveryHint'
import { Button } from '@/components/ui/button'

const MAX_SLOTS = 4

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
  /** Human-readable DTE from the page (e.g. "12 days"). */
  dteLabel: string
  onRemove: (index: number) => void
  onClear: () => void
}) {
  if (!open) return null

  return (
    <div
      className="od-compare-drawer-backdrop fixed inset-0 z-50 bg-black/45"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="od-compare-drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Compare option contracts"
        onClick={e => e.stopPropagation()}
      >
        <div className="od-compare-drawer-header flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h3 className="od-compare-drawer-title text-base font-semibold">Compare contracts</h3>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        <DiscoveryHint className=" od-compare-drawer-meta">
          {symbol.trim().toUpperCase()} · {expiration || '—'}
          {dteLabel && dteLabel !== '—' ? ` · ${dteLabel}` : ''} · max {MAX_SLOTS} legs
        </DiscoveryHint>
        {rows.length === 0 ? (
          <DiscoveryHint className="">Add contracts from the chain or contract header (Add to compare).</DiscoveryHint>
        ) : (
          <>
            <div className="table-wrapper od-compare-table-wrap">
              <table className="data-table od-compare-table">
                <thead>
                  <tr>
                    <th scope="col">Side</th>
                    <th scope="col">Strike</th>
                    <th scope="col">Bid</th>
                    <th scope="col">Ask</th>
                    <th scope="col">Mid</th>
                    <th scope="col">IV</th>
                    <th scope="col" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.strike}-${r.right}-${i}`}>
                      <td>{r.right === 'P' || r.right === 'PUT' ? 'Put' : 'Call'}</td>
                      <td>{r.strike.toFixed(2)}</td>
                      <td>{r.bid != null ? fmtUsd(r.bid) : '—'}</td>
                      <td>{r.ask != null ? fmtUsd(r.ask) : '—'}</td>
                      <td>{r.mid != null ? fmtUsd(r.mid) : '—'}</td>
                      <td>{fmtOptNum(r.iv, 4)}</td>
                      <td>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => onRemove(i)}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="od-compare-drawer-actions px-4 py-3 border-t border-border">
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

export function canAddCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): boolean {
  if (current.length >= MAX_SLOTS) return false
  const k = (r: OptionSnapshotRow) => `${r.strike}|${(r.right || '').trim().toUpperCase()}`
  return !current.some(r => k(r) === k(row))
}

export function addCompareRow(current: OptionSnapshotRow[], row: OptionSnapshotRow): OptionSnapshotRow[] {
  if (!canAddCompareRow(current, row)) return current
  return [...current, row]
}
