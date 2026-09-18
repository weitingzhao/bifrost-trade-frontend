/**
 * Trade › Rules — the rulebook as one chain.
 *
 * Structure → Opportunity → Allocation · gate → Instance, read left to right.
 * This is where the seven `/strategy/*` pages go (design DECISIONS 2026-09-18,
 * re-confirming 2026-09-12): they were seven CRUD screens, and what none of
 * them could show is the thing that matters — that a shape is used twice, that
 * one of those opportunities sits in no allocation, and that every instance
 * under it therefore ran under no gate.
 *
 * This is the **read** side. The five edit sheets the design draws behind each
 * column are the seven pages' CRUD, and they come next; until then each column
 * links out to the page that still owns its editing, so nothing is stranded.
 *
 * Nothing here writes, and that is not only D10: activating an allocation is
 * what the daemon reads on its next start, so it belongs behind a form with a
 * confirmation, not behind a card click.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { useRulesChain } from './useRulesChain'
import { ChainColumnList, ChainDetailPanel } from './ChainColumns'
import { buildChain, detailOf, orphanOpportunities, visibleChain, type ChainSelection } from './rulesChain'

const PAGE_LEAD =
  'One chain, read left to right: a Structure is a shape, an Opportunity is when to use it, an Allocation is what the daemon is told to run, an Instance is one running. Pick anything and its lineage lights up. A gate is a limit whose scope is an allocation — defined here, its breaches land on Risk › Limits.'

/** Where each column's editing still lives until its sheet is built. */
const EDITORS: Record<string, { to: string; label: string }> = {
  structure: { to: '/strategy/structures', label: 'Edit structures →' },
  opportunity: { to: '/strategy/opportunities', label: 'Edit opportunities →' },
  allocation: { to: '/strategy/allocations', label: 'Edit allocations · gates →' },
  instance: { to: '/strategy/instances', label: 'All instances →' },
}

export default function TradeRulesPage() {
  const [activeOnly, setActiveOnly] = useState('active')
  const [sel, setSel] = useState<ChainSelection | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const { data, loading, error, refetch } = useRulesChain()

  const columns = useMemo(
    () => buildChain(data, sel, activeOnly === 'active'),
    [data, sel, activeOnly],
  )


  // Counted over what the filter leaves visible, the same scope the columns
  // draw — a banner about 25 opportunities above a column of 7 is a reader's
  // problem, not a subtlety.
  const visible = useMemo(() => visibleChain(data, activeOnly === 'active'), [data, activeOnly])
  const orphanOpps = orphanOpportunities(visible)
  // The detail is the record, so it keeps the closed history the filter hides —
  // and names the active count wherever the two numbers differ.
  const detail = useMemo(() => detailOf(sel, data, visible), [sel, data, visible])

  const pick = (next: ChainSelection) =>
    setSel((cur) => (cur && cur.kind === next.kind && cur.id === next.id ? null : next))

  return (
    <PageShell padding="compact" className="space-y-3">
      <section className={positionsUi.pageCard} aria-label="Rules">
        <PageHeader
          breadcrumb={<p className="text-xs text-primary/90 font-medium">Trade / Rules</p>}
          title="Rules"
          titleSize="large"
          description={PAGE_LEAD}
          actions={
            <span className="flex flex-wrap items-center gap-2.5">
              <Link to="/risk/limits" className={positionsUi.link}>
                Breaches · Risk Limits →
              </Link>
              <Link to="/review/playbook-stats" className={positionsUi.link}>
                Does it pay? Playbook stats →
              </Link>
            </span>
          }
        />

        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-2">
          <span className={positionsUi.cap}>Show</span>
          <SegmentControl
            size="xs"
            ariaLabel="Show"
            value={activeOnly}
            onChange={setActiveOnly}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'all', label: 'All' },
            ]}
          />
          <span className="text-dense-meta text-muted-foreground">
            {sel ? 'Lineage lit; everything else dimmed. Click it again to release.' : 'Click any card to light its lineage across the four columns.'}
          </span>
          {sel ? (
            <button type="button" className={cn(positionsUi.link, 'ml-auto')} onClick={() => setSel(null)}>
              Clear selection
            </button>
          ) : null}
        </div>

        {error ? <QueryErrorAlert error={error} onRetry={refetch} /> : null}
        {loading ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <>
            {orphanOpps > 0 ? (
              <p className="m-0 rounded-md border border-warning/40 bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                <span className="font-semibold text-warning">
                  {orphanOpps} of {visible.opportunities.length} opportunities sit in no allocation.
                </span>{' '}
                Nothing tells the daemon to run them, and an instance opened under one inherits no gate — which is
                what &ldquo;ran outside rules&rdquo; means on the instance detail below.
              </p>
            ) : null}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start gap-3">
              {columns.map((column) => (
                <div key={column.key} className="flex min-w-0 flex-col gap-2">
                  <ChainColumnList
                    column={column}
                    expanded={Boolean(expanded[column.key])}
                    onExpand={() => setExpanded((e) => ({ ...e, [column.key]: true }))}
                    onPick={pick}
                  />
                  <Link to={EDITORS[column.key].to} className={cn(positionsUi.link, 'px-0.5')}>
                    {EDITORS[column.key].label}
                  </Link>
                </div>
              ))}
            </div>

            {detail ? <ChainDetailPanel detail={detail} onPick={pick} /> : null}

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing on this page writes.
              The edit sheets the design puts behind each column are the seven Strategy pages&rsquo; CRUD and are not
              built yet, so each column links to the page that still owns its editing. Activating an allocation is
              what the daemon reads on its next start, so it stays behind a form rather than a card click.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
