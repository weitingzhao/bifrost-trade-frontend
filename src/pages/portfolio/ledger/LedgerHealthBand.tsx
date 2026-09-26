import { SegmentControl } from '@/components/data-display'
import { HeroCard, HeroRow, SectionHead } from '@/components/layout'
import { pnlClass } from '@/pages/portfolio/ledger/ledgerFormat'
import {
  type LedgerHealthModel,
  type LedgerHealthTile,
} from '@/pages/portfolio/ledger/ledgerHealth'
import { LEDGER_UNLINK_BASIS_TABS, type LedgerUnlinkBasis } from '@/pages/portfolio/ledger/ledgerReconcile'

function tileValueClass(tile: LedgerHealthTile): string {
  if (tile.tone === 'amber') return 'text-[var(--color-warning)]'
  if (tile.tone === 'cost') return tile.pnl && tile.pnl !== 0 ? 'text-loss' : 'text-muted-foreground'
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
    <section className="space-y-2.5" aria-label="Is this book healthy">
      {/* §16.4 · Rev .84: an h2; the section's rule — every figure opens its
          own derivation, unlinked and unreconciled are amber, never red — is
          its title. */}
      <SectionHead note="Every figure opens its own derivation · unlinked and unreconciled are amber, never red.">
        Is this book healthy
      </SectionHead>
      {/* The five readings as heroes (Rev .84), each still a button onto its
          derivation. */}
      <HeroRow label="Is this book healthy">
        {model.tiles.map(tile => (
          <HeroCard
            key={tile.id}
            label={tile.label}
            value={tile.value}
            valueClassName={tileValueClass(tile)}
            sub={tile.sub}
            title={tile.title}
            onClick={() => onTile(tile)}
          />
        ))}
      </HeroRow>
      {/* Its own card now, no raised band (Rev .84). */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border px-3 py-1.5 mat-card">
        <span className="text-dense-meta font-semibold text-muted-foreground">Unlinked counts</span>
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
    </section>
  )
}
