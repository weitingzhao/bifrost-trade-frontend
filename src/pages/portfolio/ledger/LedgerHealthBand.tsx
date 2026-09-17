import { cn } from '@/lib/utils'
import { SegmentControl } from '@/components/data-display'
import { pnlClass } from '@/pages/portfolio/ledger/ledgerFormat'
import { ledgerFilterPanelClass } from '@/lib/ledgerUi'
import {
  type LedgerHealthModel,
  type LedgerHealthTile,
} from '@/pages/portfolio/ledger/ledgerHealth'
import { LEDGER_UNLINK_BASIS_TABS, type LedgerUnlinkBasis } from '@/pages/portfolio/ledger/ledgerReconcile'

function tileValueClass(tile: LedgerHealthTile): string {
  if (tile.tone === 'amber') return 'text-[var(--color-warning)]'
  if (tile.tone === 'cost') return tile.pnl && tile.pnl !== 0 ? 'text-[var(--color-danger)]' : 'text-muted-foreground'
  if (tile.tone === 'pnl') return pnlClass(tile.pnl)
  return 'text-foreground'
}

export function LedgerHealthBand({
  model,
  unlinkBasis,
  onUnlinkBasis,
  onTile,
  onOpenReconcile,
}: {
  model: LedgerHealthModel
  unlinkBasis: LedgerUnlinkBasis
  onUnlinkBasis: (v: LedgerUnlinkBasis) => void
  onTile: (tile: LedgerHealthTile) => void
  onOpenReconcile: () => void
}) {
  const unlinkOptions = LEDGER_UNLINK_BASIS_TABS.map(({ id, label }) => ({ value: id, label }))

  return (
    <section className="space-y-1.5" aria-label="Is this book healthy">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-dense-meta font-bold uppercase tracking-wide text-muted-foreground">
          Is this book healthy
        </span>
        <span className="h-px min-w-8 flex-1 bg-border" />
        <span className="text-dense-meta text-muted-foreground">
          every figure opens its own derivation · unlinked and unreconciled are amber, never red
        </span>
      </div>
      <div className={ledgerFilterPanelClass}>
        <div className="flex flex-wrap gap-x-6 gap-y-3 px-1 py-1">
          {model.tiles.map(tile => (
            <button
              key={tile.id}
              type="button"
              title={tile.title}
              onClick={() => onTile(tile)}
              className="flex min-w-0 flex-col items-start gap-px border-0 bg-transparent p-0 text-left"
            >
              <span className="text-dense-meta font-bold uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </span>
              <span
                className={cn(
                  'font-mono text-base font-bold tabular-nums underline decoration-dotted underline-offset-2',
                  tileValueClass(tile),
                )}
              >
                {tile.value}
              </span>
              <span className="text-dense-caption text-muted-foreground">{tile.sub}</span>
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-border bg-muted/30 px-3 py-1.5 -mx-2 -mb-2 rounded-b-lg">
          <span className="text-dense-meta font-bold uppercase tracking-wide text-muted-foreground">
            Unlinked counts
          </span>
          <SegmentControl
            size="xs"
            ariaLabel="Unlinked basis"
            value={unlinkBasis}
            onChange={v => onUnlinkBasis(v as LedgerUnlinkBasis)}
            options={unlinkOptions}
          />
          <span className="min-w-0 flex-[1_1_16rem] text-dense-meta text-muted-foreground text-pretty">
            {model.unlink.note}
          </span>
          <button
            type="button"
            className="text-dense-meta text-link underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer"
            onClick={onOpenReconcile}
          >
            open the diff →
          </button>
        </div>
      </div>
    </section>
  )
}
