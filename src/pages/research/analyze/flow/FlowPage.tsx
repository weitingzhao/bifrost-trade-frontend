/**
 * Flow — a placeholder with the reason on it (D-RLA-4).
 * `/research/flow` (+ `#multi-leg`)
 *
 * Options trades and quotes are not on the current Massive plan: the tape
 * endpoints return 403, so what this page can show is an OI × volume proxy
 * from the daily option snapshot. The proxy stays reachable under a section
 * that says what it is, so the real tape drops in here without a rebuild.
 */
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  CollapsibleChevron,
  CollapsibleGroup,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  CollapsibleGroupTitle,
  DenseTag,
} from '@/components/data-display'
import { PageHeader, PageShell } from '@/components/layout'
import { ResearchContextBar } from '@/components/research/ResearchContextBar'
import { OrderSentimentSection } from './OrderSentimentSection'

export const FLOW_PLACEHOLDER_REASON =
  'Options trades and quotes are not on the current Massive plan (Options Starter) — the tape endpoints answer 403. ' +
  'What follows is an OI × volume proxy built from the daily option snapshot, not order flow.'

export default function FlowPage() {
  // Open by default: a page whose only content is folded away reads as empty.
  const [proxyOpen, setProxyOpen] = useState(true)
  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        title="Flow"
        description="Order sentiment and multi-leg flow — placeholder until the options tape is on the plan."
        actions={
          <DenseTag variant="warning" size="cell" title="Owner decision D-RLA-4">
            placeholder · D-RLA-4
          </DenseTag>
        }
      />
      <ResearchContextBar />

      <div
        role="status"
        className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2"
        data-testid="flow-placeholder"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="min-w-0 space-y-0.5">
          <p className="text-dense-meta font-medium text-warning">No options tape on this plan</p>
          <p className="text-dense-micro text-muted-foreground">
            {FLOW_PLACEHOLDER_REASON} Real tape lands here when the subscription is upgraded
            (follow-on: program market-data-subscription-focus, options tape); nothing else on
            this page needs rebuilding.
          </p>
        </div>
      </div>

      <CollapsibleGroup>
        <CollapsibleGroupHeader expanded={proxyOpen} onToggle={() => setProxyOpen((o) => !o)}>
          <CollapsibleChevron expanded={proxyOpen} />
          <CollapsibleGroupTitle>OI × volume proxy</CollapsibleGroupTitle>
          <span className="ml-2 text-dense-caption text-muted-foreground/70">
            an approximation from the daily snapshot — not the tape
          </span>
        </CollapsibleGroupHeader>
        {proxyOpen ? (
          <CollapsibleGroupBody className="px-3 pb-3">
            <OrderSentimentSection />
          </CollapsibleGroupBody>
        ) : null}
      </CollapsibleGroup>
    </PageShell>
  )
}
