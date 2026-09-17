import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { cn } from '@/lib/utils'
import { LedgerExplainFace } from '@/pages/portfolio/ledger/LedgerExplainFace'
import { LedgerReconcileFace } from '@/pages/portfolio/ledger/LedgerReconcileFace'
import {
  LedgerJournalPlaceholderFace,
  LedgerLinksPlaceholderFace,
} from '@/pages/portfolio/ledger/LedgerPlaceholderFaces'
import {
  faceOfInspector,
  type LedgerInspectorFace,
  type LedgerInspectorState,
} from '@/pages/portfolio/ledger/ledgerInspectorState'
import type { LedgerMetricExplainPayload } from '@/pages/portfolio/ledger/ledgerSummaryExplainPayload'
import type { LedgerHealthModel } from '@/pages/portfolio/ledger/ledgerHealth'
import type { LedgerReconcileModel } from '@/pages/portfolio/ledger/ledgerReconcile'
import type { LedgerUnlinkBasis } from '@/pages/portfolio/ledger/ledgerReconcile'

const FACES: { id: LedgerInspectorFace; label: string }[] = [
  { id: 'explain', label: 'Explain' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'links', label: 'Links' },
  { id: 'journal', label: 'Journal' },
]

export function LedgerInspector({
  state,
  onClose,
  onFace,
  explainPayload,
  health,
  unlinkBasis,
  reconcile,
}: {
  state: LedgerInspectorState
  onClose: () => void
  onFace: (face: LedgerInspectorFace) => void
  explainPayload: LedgerMetricExplainPayload | null
  health: LedgerHealthModel
  unlinkBasis: LedgerUnlinkBasis
  reconcile: LedgerReconcileModel
}) {
  if (state.type === 'stock') {
    return (
      <InspectorDrawer
        state={{ type: 'stock', symbol: state.symbol, accountId: state.accountId }}
        onClose={onClose}
      />
    )
  }
  if (state.type === null) return null

  const face = faceOfInspector(state)

  return (
    <RightInspectorShell open ariaLabel="Trade ledger inspector" onClose={onClose}>
      <RightInspectorHeader
        title={
          <span className="flex flex-wrap items-center gap-1.5">
            {FACES.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFace(f.id)}
                className={cn(
                  'rounded border px-1.5 py-0.5 text-dense-meta font-medium',
                  face === f.id
                    ? 'border-[var(--color-success)] text-[var(--color-success)]'
                    : 'border-border text-muted-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </span>
        }
        onClose={onClose}
      />
      <div className={inspectorShell.body}>
        {state.type === 'explain' ? (
          <LedgerExplainFace
            target={state.target}
            payload={explainPayload}
            health={health}
            unlinkBasis={unlinkBasis}
          />
        ) : null}
        {state.type === 'reconcile' ? (
          <LedgerReconcileFace model={reconcile} focus={state.focus} />
        ) : null}
        {state.type === 'links' ? <LedgerLinksPlaceholderFace /> : null}
        {state.type === 'journal' ? <LedgerJournalPlaceholderFace /> : null}
      </div>
    </RightInspectorShell>
  )
}
