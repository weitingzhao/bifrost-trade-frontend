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
 * The edit sheets behind each column are the seven pages' own forms, opened
 * from here rather than rewritten (see `RulesSheets.tsx`): a rule edited from
 * the chain and one edited from the old page are the same write with the same
 * validation.
 *
 * Nothing writes from a card click. Activating an allocation is what the daemon
 * reads on its next start, so it lives behind a form with a confirm — which is
 * what the sheets are. D10 is not in play here: a rule is a rulebook entry, not
 * an order.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'
import { opportunityCopyPrefill, opportunityDetailKey } from '@/components/strategy/opportunityCopy'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { InstanceListFilters } from '@/components/strategy/InstanceListFilters'
import { InstancesGroupedTable } from '@/components/strategy/InstancesGroupedTable'
import { useInstanceBook } from '@/hooks/useInstanceBook'
import { createCollapsedGroupsState } from '@/utils/instanceGroupCollapse'
import type { InstanceListFilterValues } from '@/components/strategy/InstanceListFilters'
import { fetchOpportunityDetail } from '@/api/strategy'
import { useRulesChain } from '@/hooks/useRulesChain'
import { SetActiveDialog } from './SetActiveDialog'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { ChainColumnList, ChainDetailPanel } from './ChainColumns'
import { NO_SHEET, RulesSheets, type RulesSheet } from './RulesSheets'
import {
  buildChain,
  detailOf,
  formatPick,
  orphanGates,
  orphanOpportunities,
  parsePick,
  visibleChain,
  type ChainSelection,
} from './rulesChain'

const PAGE_LEAD =
  'One chain, read left to right: a Structure is a shape, an Opportunity is when to use it, an Allocation is what the daemon is told to run, an Instance is one running. Pick anything and its lineage lights up. A gate is a limit whose scope is an allocation — defined here, its breaches land on Risk › Limits.'

/**
 * The old page for each column, kept as a way out rather than as the editor.
 *
 * The sheets are the editor now; these still list, filter and sort in ways the
 * chain does not, so the link stays until someone decides they are redundant
 * (design absence is not deletion — the Owner rules on that, not this page).
 */
/** What each column's ＋ New opens. */
const NEW_SHEET: Record<string, RulesSheet> = {
  structure: { kind: 'structure', mode: { kind: 'create' } },
  opportunity: { kind: 'opportunity' },
  allocation: { kind: 'allocation', mode: 'create', editId: null },
  instance: { kind: 'instance' },
}

export default function TradeRulesPage() {
  const [activeOnly, setActiveOnly] = useState('active')
  // The selection lives in the URL so another page can open the chain already
  // lit on the link it means (§ URL state, CLAUDE.md).
  const [params, setParams] = useSearchParams()
  const sel = parsePick(params.get('pick'))
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  // The Desk's Decide lane hands a Research proposal over as a prefilled New
  // opportunity (design DECISIONS 2026-09-18). It arrives in router state
  // rather than the URL because it is a form's worth of fields, and the sheet
  // opens from the first render rather than from an effect — a form that
  // appeared one frame late would read as a click that missed.
  const location = useLocation()
  const navigate = useNavigate()
  const handedPrefill = (location.state as { opportunityPrefill?: PrefillData } | null)?.opportunityPrefill
  const [sheet, setSheet] = useState<RulesSheet>(() =>
    handedPrefill == null ? NO_SHEET : { kind: 'opportunity', prefill: handedPrefill },
  )
  // Consumed once: the entry stays in history, so without this a Back to this
  // page would re-open the sheet on a proposal already turned into a rule.
  useEffect(() => {
    if (handedPrefill == null) return
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [handedPrefill, navigate, location.pathname, location.search])
  const status = useMonitorStatus()
  const { data, rawInstances, loading, error, refetch } = useRulesChain()

  /**
   * What the daemon's own config points at — a different store from the
   * allocation row's `is_active`, and the one `Set active` writes.
   */
  const daemon = useMemo(
    () => ({ allocationId: status.data?.strategy?.active?.allocation?.id ?? null }),
    [status.data?.strategy?.active?.allocation?.id],
  )
  const [setActiveFor, setSetActiveFor] = useState<number | null | undefined>(undefined)
  const qc = useQueryClient()
  const [duplicating, setDuplicating] = useState(false)

  /**
   * The instance list's filters, with the metrics table they belonged to.
   *
   * Held in component state rather than the URL, unlike everything else on this
   * page. The chain's address is `?pick=`; this is a narrowing *within* what
   * was picked. Reusing the old page's URL sync was the first attempt and it
   * encodes that page's defaults — it drops `since=q` from the URL as its
   * default and drops an empty `since` too, so this page's All and that page's
   * quarter would have become the same address meaning different things. The
   * one thing that genuinely needs an address is a single instance, and that
   * is `Open sheet →` on Positions.
   *
   * All, not a quarter: the column says "every one of them, whatever the filter
   * shows", and a default window would make that sentence false.
   */
  const [instanceFilters, setInstanceFilters] = useState<InstanceListFilterValues>({
    status: '',
    structure: '',
    symbol: '',
    right: '',
    expiry: '',
    since: '',
  })
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  /**
   * Held for comparison. The two open side by side in the shared sheet, which
   * is where the sheet is — so the pair has an address (`?instance=&vs=`) and
   * the chain keeps only the pick.
   */
  const [compareWith, setCompareWith] = useState<number | null>(null)

  /**
   * A copy carries the whole rule, so the detail is fetched first — the list
   * row has neither the symbols nor the entry conditions, and a copy missing
   * its conditions would be a different rule under the same name.
   */
  async function duplicateOpportunity(id: number) {
    setDuplicating(true)
    try {
      const detail = await qc.fetchQuery({
        queryKey: opportunityDetailKey(id),
        queryFn: () => fetchOpportunityDetail(id),
        staleTime: 120_000,
      })
      setSheet({ kind: 'opportunity', prefill: opportunityCopyPrefill(detail) })
    } finally {
      setDuplicating(false)
    }
  }

  const columns = useMemo(
    () => buildChain(data, sel, activeOnly === 'active', daemon),
    [data, sel, activeOnly, daemon],
  )


  // Counted over what the filter leaves visible, the same scope the columns
  // draw — a banner about 25 opportunities above a column of 7 is a reader's
  // problem, not a subtlety.
  const visible = useMemo(() => visibleChain(data, activeOnly === 'active'), [data, activeOnly])
  const orphanOpps = orphanOpportunities(visible)
  // A gate is drawn through the allocation that carries it, so one nothing
  // carries would not be drawn at all — and it is still in the rulebook.
  const looseGates = orphanGates(data)
  /**
   * The strategy service intermittently answers HTTP 200 with an empty list,
   * and the same call seconds later returns the lot (measured 2026-09-18 on DEV,
   * on both `/instances` and `/win-rate`). An empty 200 is indistinguishable
   * from an empty book — so when the rulebook has opportunities but the service
   * returned no instance at all, the page says the service answered empty
   * instead of printing "0 open · 0 closed" over a book with eighty-seven.
   */
  const instancesEmpty = data.opportunities.length > 0 && data.instances.length === 0
  // The detail is the record, so it keeps the closed history the filter hides —
  // and names the active count wherever the two numbers differ.
  const detail = useMemo(() => detailOf(sel, data, visible, daemon), [sel, data, visible, daemon])

  /**
   * The picked thing's instances, as records — the chain reads them as
   * `InstanceReading`, the list needs the server's own rows.
   */
  const scopedInstances = useMemo(() => {
    const ids = new Set((detail?.rows ?? []).map((r) => r.id))
    return rawInstances.filter((i) => ids.has(i.strategy_instance_id))
  }, [detail?.rows, rawInstances])

  const book = useInstanceBook({
    instances: scopedInstances,
    opportunities: data.opportunities,
    values: instanceFilters,
  })

  /**
   * What the selected thing can have done to it. A gate has no column of its
   * own, so editing it hangs off the allocation that applies it — which is
   * where its scope lives (design DECISIONS 2026-09-18).
   */
  const detailActions = (kind: ChainSelection['kind']) => {
    // A whole column has no single thing to act on — the actions belong to a
    // card, and the list below is the answer for the column.
    if (sel == null || sel.id == null) return []
    const id = sel.id
    if (kind === 'structure') {
      return [
        { label: 'Edit', onClick: () => setSheet({ kind: 'structure', mode: { kind: 'edit', id } }) },
        { label: 'Duplicate', onClick: () => setSheet({ kind: 'structure', mode: { kind: 'copy', id } }) },
      ]
    }
    if (kind === 'opportunity') {
      const initial = data.opportunities.find((o) => o.strategy_opportunity_id === id)
      return [
        { label: 'Edit', onClick: () => setSheet({ kind: 'opportunity', initial }) },
        {
          label: duplicating ? 'Copying…' : 'Duplicate',
          onClick: () => void duplicateOpportunity(id),
          disabled: duplicating,
          title: 'Open a new opportunity prefilled from this one — structure, gate, scope and conditions',
        },
      ]
    }
    if (kind === 'allocation') {
      const gateId = data.allocations.find((a) => a.strategy_allocation_id === id)?.gate_safety_strategy_id
      const isDaemons = daemon.allocationId === id
      return [
        // The one active switch the design keeps. It edits the daemon's config,
        // not the allocation's own on-the-books flag, and it is a separate act
        // from saving the definition (design DECISIONS 2026-09-18).
        {
          label: isDaemons ? 'Clear active' : 'Set active',
          onClick: () => setSetActiveFor(isDaemons ? null : id),
          title: isDaemons
            ? 'The daemon is on this one — clearing leaves it with no allocation to load'
            : 'Write this allocation into the config the daemon loads on its next start',
        },
        { label: 'Edit', onClick: () => setSheet({ kind: 'allocation', mode: 'edit', editId: id }) },
        ...(gateId == null
          ? []
          : [
              { label: 'Edit gate', onClick: () => setSheet({ kind: 'gate', mode: { kind: 'edit' as const, id: gateId } }) },
              {
                label: 'Copy gate',
                onClick: () => setSheet({ kind: 'gate', mode: { kind: 'copy' as const, id: gateId } }),
                title: 'Start a new gate from this one — the sixteen fields, under a new name',
              },
            ]),
        { label: '＋ New gate', onClick: () => setSheet({ kind: 'gate', mode: { kind: 'create' as const } }) },
        { label: 'Breaches → Risk Limits', to: '/risk/limits' },
      ]
    }
    if (kind === 'instance') {
      const reading = data.instances.find((r) => r.id === id)
      const record = rawInstances.find((r) => r.strategy_instance_id === id)
      if (record == null) return []
      // The guard the design asks for, and the honest form of it: an instance
      // the fills have claimed cannot be deleted, and the reason is on the
      // action rather than behind it.
      const blocked = (reading?.fills ?? 0) > 0
      return [
        // The shared sheet (Positions) — its Overview, PnL, executions and
        // chart. Addressable by id, so a closed instance has an entrance too.
        { label: 'Open sheet →', to: `/portfolio/positions?instance=${id}` },
        {
          label: blocked ? `Delete — ${reading?.fills} fills linked` : 'Delete…',
          onClick: () => {
            if (!blocked) setSheet({ kind: 'instanceDelete', instance: record })
          },
          disabled: blocked,
          title: blocked
            ? 'Unlink its fills on the Trade Ledger first — deleting an instance under them would orphan the fills'
            : undefined,
        },
      ]
    }
    return []
  }

  const pick = (next: ChainSelection) => {
    const same = sel != null && sel.kind === next.kind && sel.id === next.id
    setParams(same ? {} : { pick: formatPick(next) }, { replace: true })
  }

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
              {/* The snapshot is what the reader is looking at, not the whole
                  rulebook: the chain plus whatever the selection narrows it to,
                  so the chat starts where the eye is. */}
              <AskCopilotButton
                originPage="trade-rules"
                originLabel="Trade Rules"
                size="dense"
                snapshot={compactSnapshot({
                  structures: data.structures.length,
                  opportunities: data.opportunities.length,
                  opportunities_in_no_allocation: orphanOpps || undefined,
                  allocations: data.allocations.length,
                  gates: data.gates.length,
                  gates_carried_by_no_allocation: looseGates.length || undefined,
                  instances_open: data.instances.filter((i) => !i.closed).length,
                  instances_closed: data.instances.filter((i) => i.closed).length,
                  daemon_allocation_id: daemon.allocationId ?? undefined,
                  selected: sel == null ? undefined : `${sel.kind}:${sel.id}`,
                  instances_in_view: scopedInstances.length || undefined,
                })}
                suggestedPrompt="这条规则链目前的结构合理吗？哪些机会没有被配置覆盖，哪些闸门形同虚设？"
              />
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
            <button type="button" className={cn(positionsUi.link, 'ml-auto')} onClick={() => setParams({}, { replace: true })}>
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
            {instancesEmpty ? (
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-warning/40 bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                <span className="font-semibold text-warning">The strategy service returned no instances.</span>
                The rulebook has {data.opportunities.length} opportunities, so this is the service answering empty
                rather than a chain with nothing running — it does that now and then and answers in full a moment
                later.
                <button type="button" className={positionsUi.btn} onClick={refetch}>
                  Ask again
                </button>
              </p>
            ) : null}

            {orphanOpps > 0 ? (
              <p className="m-0 rounded-md border border-warning/40 bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                <span className="font-semibold text-warning">
                  {orphanOpps} of {visible.opportunities.length} opportunities sit in no allocation.
                </span>{' '}
                Nothing tells the daemon to run them, and an instance opened under one inherits no gate — which is
                what &ldquo;ran outside rules&rdquo; means on the instance detail below.
              </p>
            ) : null}

            {looseGates.length > 0 ? (
              <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-border bg-[var(--sk-raised)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                <span className="font-semibold text-secondary-foreground">
                  {looseGates.length} {looseGates.length === 1 ? 'gate is' : 'gates are'} carried by no allocation.
                </span>
                A gate’s scope is an allocation, so these bound nothing — they are listed because they are still in the
                rulebook and nothing else on this page would draw them.
                {looseGates.map((g) => (
                  <button
                    key={g.gate_safety_strategy_id}
                    type="button"
                    className={positionsUi.btn}
                    onClick={() => setSheet({ kind: 'gate', mode: { kind: 'edit', id: g.gate_safety_strategy_id } })}
                  >
                    {g.name} · v{g.version}
                  </button>
                ))}
              </p>
            ) : null}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18.75rem),1fr))] items-start gap-3">
              {columns.map((column) => (
                <ChainColumnList
                  key={column.key}
                  column={column}
                  expanded={Boolean(expanded[column.key])}
                  onExpand={() => setExpanded((e) => ({ ...e, [column.key]: true }))}
                  onPick={pick}
                  onNew={() => setSheet(NEW_SHEET[column.key])}
                  onPickAll={
                    column.key === 'instance' ? () => pick({ kind: 'instance', id: null }) : undefined
                  }
                />
              ))}
            </div>

            {detail ? (
              <ChainDetailPanel
                detail={detail}
                actions={detailActions(detail.kind)}
                rows={
                  scopedInstances.length === 0 ? null : (
                    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
                      <InstanceListFilters
                        options={book.filterOptions}
                        values={instanceFilters}
                        sinceRangeText={book.sinceRangeText}
                        filteredCount={book.filtered.length}
                        totalCount={scopedInstances.length}
                        onChange={(patch) => setInstanceFilters((prev) => ({ ...prev, ...patch }))}
                        onClear={() =>
                          setInstanceFilters({ status: '', structure: '', symbol: '', right: '', expiry: '', since: '' })
                        }
                        onExpandAll={() =>
                          setCollapsedGroups((prev) =>
                            createCollapsedGroupsState(book.groups, 'multi', prev, 'expandAll'),
                          )
                        }
                        onCollapseAll={() =>
                          setCollapsedGroups((prev) =>
                            createCollapsedGroupsState(book.groups, 'multi', prev, 'collapseAll'),
                          )
                        }
                        showGroupToolbar={book.groups.length > 0}
                      />
                      <InstancesGroupedTable
                        groups={book.groups}
                        metricsMap={book.metricsMap}
                        detailViewMode="multi"
                        collapsedGroups={collapsedGroups}
                        onToggleGroup={(key) =>
                          setCollapsedGroups((prev) =>
                            createCollapsedGroupsState(book.groups, 'multi', prev, 'toggle', key),
                          )
                        }
                        onViewDetail={(inst) =>
                          navigate(`/portfolio/positions?instance=${inst.strategy_instance_id}`)
                        }
                        onCompare={(inst) => {
                          const id = inst.strategy_instance_id
                          if (compareWith == null || compareWith === id) {
                            setCompareWith(compareWith === id ? null : id)
                            return
                          }
                          navigate(`/portfolio/positions?instance=${compareWith}&vs=${id}`)
                        }}
                        activeDetailId={sel?.kind === 'instance' ? sel.id : null}
                        compareId={compareWith}
                        compareAnywhere
                      />
                      {compareWith != null ? (
                        <p className="m-0 flex flex-wrap items-center gap-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
                          <span className="font-semibold text-secondary-foreground">
                            #{compareWith} is held for comparison.
                          </span>
                          Pick a second instance’s ⇄ to open the two side by side in the shared sheet.
                          <button type="button" className={positionsUi.btn} onClick={() => setCompareWith(null)}>
                            Drop it
                          </button>
                        </p>
                      ) : null}
                    </div>
                  )
                }
              />
            ) : null}

            <RulesSheets sheet={sheet} onClose={() => setSheet(NO_SHEET)} status={status.data} />

            <SetActiveDialog
              open={setActiveFor !== undefined}
              data={data}
              allocationId={setActiveFor ?? null}
              currentStructureId={status.data?.strategy?.active?.structure?.id ?? null}
              onClose={() => setSetActiveFor(undefined)}
            />

            <p className="m-0 rounded-md border border-border bg-[var(--sk-raised2)] px-3 py-2 text-dense-meta leading-normal text-muted-foreground text-pretty">
              <span className="font-semibold text-secondary-foreground">Boundary.</span> Nothing writes from a card
              click. Editing opens the Strategy pages&rsquo; own forms, so a rule changed here and one changed there
              are the same write with the same validation. Activating an allocation is what the daemon reads on its
              next start, which is why it sits behind a form with a confirm. An instance the fills have claimed
              cannot be deleted at all — unlink them on the Trade Ledger first, or the fills are orphaned. None of
              this is an order: D10 governs the desk, not the rulebook.
            </p>
          </>
        )}
      </section>
    </PageShell>
  )
}
