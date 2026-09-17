import { InspectorDrawer } from '@/components/positions/InspectorDrawer'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { cn } from '@/lib/utils'
import { LedgerExplainFace } from '@/pages/portfolio/ledger/LedgerExplainFace'
import { LedgerReconcileFace } from '@/pages/portfolio/ledger/LedgerReconcileFace'
import { LedgerLinksFace } from '@/pages/portfolio/ledger/LedgerLinksFace'
import { LedgerJournalFace } from '@/pages/portfolio/ledger/LedgerJournalFace'
import {
  faceOfInspector,
  type LedgerInspectorFace,
  type LedgerInspectorState,
} from '@/pages/portfolio/ledger/ledgerInspectorState'
import type { LedgerMetricExplainPayload } from '@/pages/portfolio/ledger/ledgerSummaryExplainPayload'
import type { LedgerHealthModel } from '@/pages/portfolio/ledger/ledgerHealth'
import type { LedgerReconcileModel } from '@/pages/portfolio/ledger/ledgerReconcile'
import type { LedgerUnlinkBasis } from '@/pages/portfolio/ledger/ledgerReconcile'
import type { LedgerJournalSeed } from '@/pages/portfolio/ledger/ledgerJournalWrite'

const FACES: { id: LedgerInspectorFace; label: string }[] = [
  { id: 'explain', label: 'Explain' },
  { id: 'reconcile', label: 'Reconcile' },
  { id: 'links', label: 'Links' },
  { id: 'journal', label: 'Journal' },
]

function journalSeedKey(seed: LedgerJournalSeed | undefined): string {
  if (!seed) return 'no-contract'
  // The contract key, not just account and symbol: two contracts on one symbol
  // must not share a draft or a half-confirmed write.
  return [seed.mode, seed.accountId, seed.contractKey, String(seed.netQty ?? ''), String(seed.instanceId ?? '')].join('|')
}

export function LedgerInspector({
  state,
  onClose,
  onFace,
  explainPayload,
  health,
  unlinkBasis,
  reconcile,
  onWrote,
  onOpenFullJournalForm,
}: {
  state: LedgerInspectorState
  onClose: () => void
  onFace: (face: LedgerInspectorFace) => void
  explainPayload: LedgerMetricExplainPayload | null
  health: LedgerHealthModel
  unlinkBasis: LedgerUnlinkBasis
  reconcile: LedgerReconcileModel
  onWrote: () => void | Promise<void>
  /** A journal row for a contract with no fills here, or for shares, needs the full form. */
  onOpenFullJournalForm: () => void
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
        {state.type === 'links' ? (
          <LedgerLinksFace
            key={state.execution?.account_executions_id ?? 'empty'}
            execution={state.execution}
            onLinked={onWrote}
          />
        ) : null}
        {state.type === 'journal' ? (
          <LedgerJournalFace
            key={journalSeedKey(state.seed)}
            seed={state.seed}
            onWrote={onWrote}
            onOpenFullForm={onOpenFullJournalForm}
          />
        ) : null}
      </div>
    </RightInspectorShell>
  )
}
