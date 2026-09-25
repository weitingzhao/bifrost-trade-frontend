import type { ReactNode } from 'react'
import { fmtUsd } from '@/lib/format'
import { LedgerMetricExplainContent } from '@/pages/portfolio/ledger/LedgerMetricExplainContent'
import type { LedgerMetricExplainPayload } from '@/pages/portfolio/ledger/ledgerSummaryExplainPayload'
import type { LedgerExplainTarget } from '@/pages/portfolio/ledger/ledgerInspectorState'
import type { LedgerHealthModel } from '@/pages/portfolio/ledger/ledgerHealth'
import type { LedgerUnlinkBasis } from '@/pages/portfolio/ledger/ledgerReconcile'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-foreground">
        {n}. {title}
      </h4>
      {children}
    </div>
  )
}

function HealthCopy({
  title,
  value,
  what,
  formula,
  basis,
}: {
  title: string
  value: string
  what: string
  formula: string
  basis: string
}) {
  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-dense-body font-bold">{title}</span>
        <span className="font-mono text-dense-body font-bold">{value}</span>
      </div>
      <Section n={1} title="What this is">
        <p className="text-dense-meta text-muted-foreground leading-relaxed">{what}</p>
      </Section>
      <Section n={2} title="Formula">
        <pre className="overflow-x-auto border px-2.5 py-2 font-mono text-dense-caption whitespace-pre-wrap mat-card">
          {formula}
        </pre>
      </Section>
      <Section n={3} title="Line by line">
        <p className="text-dense-meta text-muted-foreground">The figure is the live count or sum on this page — click again after filters change.</p>
      </Section>
      <Section n={4} title="Basis">
        <p className="text-dense-meta text-muted-foreground leading-relaxed">{basis}</p>
      </Section>
    </div>
  )
}

export function LedgerExplainFace({
  target,
  payload,
  health,
  unlinkBasis,
}: {
  target: LedgerExplainTarget | null
  payload: LedgerMetricExplainPayload | null
  health: LedgerHealthModel
  unlinkBasis: LedgerUnlinkBasis
}) {
  if (target?.source === 'health' && target.kind === 'commissions') {
    return (
      <HealthCopy
        title="Commissions"
        value={fmtUsd(health.commissionSum)}
        what="Sum of commission on book rows that actually carry a commission. Rows with a null commission (expired book events) are not in the charged count."
        formula={`Σ commission  over ${health.commissionRows} book rows with a commission reading`}
        basis="Book scope. A missing commission is no reading, not zero. Amber never applies here — this is a cost figure."
      />
    )
  }
  if (target?.source === 'health' && target.kind === 'unlinked') {
    return (
      <HealthCopy
        title="Unlinked"
        value={`${health.unlink.n} of ${health.unlink.of}`}
        what={
          unlinkBasis === 'options'
            ? 'Option fills with no strategy instance and no instance_allocations. Amber, never red — not a fault.'
            : 'Fills with no strategy instance and no instance_allocations, over every row. Stock fills dominate this basis.'
        }
        formula="unlinked = executionStrategyInstanceIds(row).length === 0"
        basis="Not a fault — amber, never red. Allocations count as linked even when strategy_instance_id is empty."
      />
    )
  }
  if (target?.source === 'summary' && payload) {
    return (
      <div className="px-3 py-2.5">
        <LedgerMetricExplainContent kind={target.kind} payload={payload} />
      </div>
    )
  }
  return (
    <p className="px-3 py-3 text-dense-meta text-muted-foreground">
      Click a figure on the page to see its derivation.
    </p>
  )
}
