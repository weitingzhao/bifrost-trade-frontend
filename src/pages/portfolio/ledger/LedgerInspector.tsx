/**
 * The Ledger's right-hand column (design Rev .165, §18.12): Explain · Reconcile
 * · Links · Journal, and a ticker's stock detail.
 *
 * One `DetailPane`: a column beside the page while the layout docks, a
 * floating panel over the right edge otherwise, a bottom sheet on compact.
 * It sits in the page lane rather than the shell's inspector slot, so opening
 * it never narrows the area the dock is measured on. Every write in the faces
 * goes through the same face components as before; only the surface moved.
 */
import { useEffect } from 'react'
import { DetailPane } from '@/components/layout/DetailPane'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { StockInspectorPanel } from '@/components/positions/StockInspectorPanel'
import { registerInspectorEscape } from '@/lib/cockpit/inspectorEscape'
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
  return [seed.mode, seed.accountId, seed.contractKey, String(seed.netQty ?? ''), String(seed.tradeId ?? '')].join('|')
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
  const open = state.type !== null
  // Escape closes it ahead of the Copilot, as it did on the shell's inspector.
  useEffect(() => (open ? registerInspectorEscape(onClose) : undefined), [open, onClose])

  return (
    <DetailPane
      open={open}
      onClose={onClose}
      label={state.type === 'stock' ? 'Stock detail' : 'Trade ledger inspector'}
    >
      <div className={inspectorShell.panel}>
        {state.type === 'stock' ? (
          <StockInspectorPanel symbol={state.symbol} accountId={state.accountId} onClose={onClose} hideWide />
        ) : state.type === null ? null : (
          <LedgerFaces
            state={state}
            onClose={onClose}
            onFace={onFace}
            explainPayload={explainPayload}
            health={health}
            unlinkBasis={unlinkBasis}
            reconcile={reconcile}
            onWrote={onWrote}
            onOpenFullJournalForm={onOpenFullJournalForm}
          />
        )}
      </div>
    </DetailPane>
  )
}

type FacesProps = {
  state: Exclude<LedgerInspectorState, { type: null } | { type: 'stock' }>
  onClose: () => void
  onFace: (face: LedgerInspectorFace) => void
  explainPayload: LedgerMetricExplainPayload | null
  health: LedgerHealthModel
  unlinkBasis: LedgerUnlinkBasis
  reconcile: LedgerReconcileModel
  onWrote: () => void | Promise<void>
  onOpenFullJournalForm: () => void
}

/** The four faces under one head; the pane holds its own width, so no Wide toggle. */
function LedgerFaces({
  state,
  onClose,
  onFace,
  explainPayload,
  health,
  unlinkBasis,
  reconcile,
  onWrote,
  onOpenFullJournalForm,
}: FacesProps) {
  const face = faceOfInspector(state)

  return (
    <>
      <RightInspectorHeader
        hideWide
        title={
          <span className="flex flex-wrap items-center gap-1.5">
            {FACES.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFace(f.id)}
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-dense-meta font-medium',
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
    </>
  )
}
