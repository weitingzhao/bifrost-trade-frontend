/**
 * Journal — `/research/journal`
 *
 * Built from nothing 2026-09-21 against `Research Journal.dc.html`
 * (rev 2026-09-19.2). The design's sentence: *"history — every artifact,
 * whoever wrote it, with its branches and what it settled to. Append-only;
 * nothing here is deleted."*
 *
 * There is no artifact store on this side, so the page is a join across the
 * five that exist — see `journalModel.ts` for every edge and how well each
 * one resolves. Three of the design's readings have no data at all (forks,
 * threads, per-lens attribution of an outcome); they keep their rows and name
 * what is missing, because a zero there would read as "the loop tried
 * nothing" rather than "nobody writes it down".
 *
 * The day is the page's scope. It defaults to the newest day that holds a
 * run, not to today — on a quiet day, landing on an empty page says the
 * machine is broken when it is only Sunday.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, PageShell, SectionPanel, SECTION_CAP_CLASS } from '@/components/layout'
import { SegmentControl } from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { positionsUi } from '@/components/positions/positionsUi'
import { cn } from '@/lib/utils'
import { candidateSketch } from '@/pages/research/loop/objectiveLapModel'
import {
  buildJournalTrees,
  journalCounts,
  journalDayTrees,
  journalDays,
  journalDefaultDay,
  journalNodes,
  journalStation,
  journalTypeLabel,
  type JournalNode,
  type JournalOperator,
} from './journalModel'
import { JournalNodeRow } from './JournalTree'
import { SelectedArtifact } from './SelectedArtifact'
import { OPERATOR_LABEL, STATION_LABEL, TYPE_TAG } from './journalUi'
import { DenseTag } from '@/components/data-display'
import {
  useJournalCandidates,
  useJournalDrafts,
  useJournalHypotheses,
  useJournalOutcomes,
  useJournalRuns,
} from './useJournalData'

const LEAD =
  'History — every artifact, whoever wrote it, and what it settled to. Append-only: nothing on this page is deleted, and a dismissed draft is still a thing that happened.'

/** The window the candidate query asks for; the day picker lives inside it. */
const CANDIDATE_DAYS = 30

const OPERATOR_SEGMENTS = [
  { value: 'all', label: 'All', title: 'Every author' },
  { value: 'loop', label: 'loop', title: 'The unattended machine: runs and what they wrote' },
  { value: 'copilot', label: 'copilot', title: 'The machine you asked' },
  { value: 'hand', label: 'hand', title: 'Written by you, from a page' },
]

export default function JournalPage() {
  const [params, setParams] = useSearchParams()
  const runs = useJournalRuns()
  const candidates = useJournalCandidates(CANDIDATE_DAYS)
  const hypotheses = useJournalHypotheses()
  const drafts = useJournalDrafts()
  const outcomes = useJournalOutcomes()

  const error =
    runs.error ?? candidates.error ?? hypotheses.error ?? drafts.error ?? outcomes.error ?? null
  const isLoading =
    runs.isLoading ||
    candidates.isLoading ||
    hypotheses.isLoading ||
    drafts.isLoading ||
    outcomes.isLoading

  const nodes = useMemo(
    () =>
      journalNodes(
        {
          runs: runs.data?.items ?? [],
          candidates: candidates.data?.items ?? [],
          hypotheses: hypotheses.data?.rows ?? [],
          drafts: drafts.data ?? [],
          outcomes: outcomes.data ?? [],
        },
        candidateSketch,
      ),
    [runs.data, candidates.data, hypotheses.data, drafts.data, outcomes.data],
  )

  const days = useMemo(() => journalDays(nodes), [nodes])
  const operator = params.get('op') ?? 'all'
  const selectedId = params.get('sel')
  // An explicit `?day=` wins — that is the picker.
  const day = params.get('day') ?? journalDefaultDay(nodes, selectedId)

  const dayNodes = useMemo(() => nodes.filter((n) => n.day === day), [nodes, day])
  // Built once over everything, then cut to the day. A day's artifact keeps
  // the lineage it grew from even when that lineage is a fortnight old.
  const allTrees = useMemo(() => buildJournalTrees(nodes), [nodes])
  const trees = useMemo(
    () => journalDayTrees(allTrees, day, operator as JournalOperator | 'all'),
    [allTrees, day, operator],
  )
  const settled = useMemo(() => dayNodes.filter((n) => n.type === 'settlement'), [dayNodes])
  const counts = useMemo(() => journalCounts(dayNodes, settled), [dayNodes, settled])
  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )
  // Every id the Journal can answer for, so a provenance value becomes a way
  // into the chain only when there is something at the other end.
  const knownIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes])

  /**
   * Walking the chain takes the day with it.
   *
   * A parent is usually older than the artifact that names it — a candidate
   * proposed on the 11th, settled on the 18th — so landing on it while the
   * tree list still shows the day you came from puts the answer in the right
   * panel and nothing on the left. Dropping the explicit day lets it fall
   * back to the selection's own; a walk inside one day resolves to that same
   * day, so nothing moves when nothing should.
   */
  const walkTo = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('sel', id)
    next.delete('day')
    setParams(next, { replace: true })
  }
  /**
   * What a settled candidate cited when it was nominated. The settlement node
   * carries the return; the evidence lives on the candidate above it, which
   * is the only half of the design's Right/Wrong columns the store can fill.
   */
  const citedBy = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    return (n: JournalNode): string => {
      const parent = n.parentId != null ? byId.get(n.parentId) : undefined
      if (parent == null) return 'the candidate is outside this window'
      return parent.summary
    }
  }, [nodes])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">Research · The Book</p>}
        title="Journal"
        description={LEAD}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className={SECTION_CAP_CLASS}>operator</span>
            <SegmentControl
              size="xs"
              ariaLabel="Operator"
              value={operator}
              onChange={(v) => setParam('op', v === 'all' ? '' : v)}
              options={OPERATOR_SEGMENTS}
            />
            <span className={cn(SECTION_CAP_CLASS, 'ml-2')}>day</span>
            <select
              aria-label="Day"
              className={cn(positionsUi.input, 'h-6')}
              value={day}
              onChange={(e) => setParam('day', e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error ? <QueryErrorAlert error={error} /> : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
        {counts.map((k) => (
          <div
            key={k.label}
            className="flex flex-col gap-0.5 border px-3 py-2 mat-card"
          >
            <span className={SECTION_CAP_CLASS}>{k.label}</span>
            <span className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'font-mono text-base font-semibold tabular-nums',
                  k.value == null && 'text-muted-foreground',
                )}
              >
                {k.value ?? '—'}
              </span>
              <span className="text-dense-micro text-muted-foreground">{k.detail}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-3 @4xl/page:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          {isLoading ? <Skeleton className="h-64 w-full" /> : null}
          {!isLoading && trees.length === 0 ? (
            <SectionPanel cap="Trees" title="Nothing on this day">
              <p className="px-3 py-3 text-dense-meta text-muted-foreground">
                {dayNodes.length === 0
                  ? 'No artifact carries this date. The picker lists only the days the window reaches.'
                  : `${dayNodes.length} artifact${dayNodes.length === 1 ? '' : 's'} on this day, none written by ${OPERATOR_LABEL[operator as JournalOperator] ?? operator}.`}
              </p>
            </SectionPanel>
          ) : null}
          {trees.map((tree) => (
            <SectionPanel
              key={tree.root.id}
              // The design caps a tree with the station, not the kind at its
              // root. A digest and a playbook note belong to no station — they
              // are written about a day rather than at a point in its lap — so
              // those fall back to the kind and the title says why.
              cap={
                journalStation(tree.root.type)
                  ? STATION_LABEL[journalStation(tree.root.type)!]
                  : journalTypeLabel(tree.root.type)
              }
              title={
                <span className="flex flex-wrap items-baseline gap-2">
                  {tree.root.title}
                  <span className="font-mono text-dense-micro font-normal text-muted-foreground">
                    {tree.root.id}
                  </span>
                </span>
              }
              note={
                tree.contextIds.size
                  ? `${tree.nodes.length - tree.contextIds.size} on this day · ${tree.contextIds.size} earlier, for the lineage`
                  : `${tree.nodes.length} artifact${tree.nodes.length === 1 ? '' : 's'} · ${tree.root.operatorRaw}`
              }
            >
              <div className="flex flex-col px-2 py-1.5">
                {tree.nodes.map((n) => (
                  <JournalNodeRow
                    key={n.id}
                    node={n}
                    selected={n.id === selectedId}
                    context={tree.contextIds.has(n.id)}
                    onSelect={(id) => setParam('sel', id)}
                  />
                ))}
              </div>
            </SectionPanel>
          ))}

          <SettledPanel
            rows={settled}
            citedBy={citedBy}
            onSelect={(id) => setParam('sel', id)}
          />
        </div>

        <SectionPanel
          cap="Selected"
          title={
            selected ? (
              <span className="break-all font-mono text-dense-meta">{selected.id}</span>
            ) : (
              'Pick an artifact'
            )
          }
          className="@4xl/page:sticky @4xl/page:top-2"
        >
          <SelectedArtifact
            node={selected}
            known={knownIds}
            onSelect={walkTo}
          />
        </SectionPanel>
      </div>
    </PageShell>
  )
}

/**
 * Settled — what was right.
 *
 * The design gives this table a **Right** and a **Wrong** column: which lens,
 * which persona, which judge the outcome belongs to. The store settles
 * candidates against a benchmark and stops there — nothing joins an outcome
 * to the evidence the nomination cited. So the two columns become one,
 * **Cited**, which is what the candidate actually carried, and **Feeds** says
 * the attribution is missing rather than printing a lens that nothing
 * measured. That gap is the learning loop's input; naming it is the point.
 */
function SettledPanel({
  rows,
  citedBy,
  onSelect,
}: {
  rows: readonly JournalNode[]
  citedBy: (n: JournalNode) => string
  onSelect: (id: string) => void
}) {
  return (
    <SectionPanel
      cap="Settled"
      title={`${rows.length} outcome${rows.length === 1 ? '' : 's'} on this day`}
      note="against a benchmark, at the horizon the rule names"
    >
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-dense-meta text-muted-foreground">
          Nothing settled on this day. An outcome lands on its exit date, so the newest
          nominations settle days after they were written.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Artifact', 'Wrote it', 'Outcome', 'Cited', 'Feeds'].map((h) => (
                <th
                  key={h}
                  className={cn(
                    SECTION_CAP_CLASS,
                    'border-b border-border px-2.5 py-1 text-left',
                    h === 'Feeds' && 'text-right',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/55">
                <td className="px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className="font-mono text-dense-meta text-primary hover:underline"
                  >
                    {r.title}
                  </button>
                </td>
                <td className="px-2.5 py-1.5">
                  <DenseTag variant={TYPE_TAG.settlement} size="cell">
                    {r.operatorRaw}
                  </DenseTag>
                </td>
                <td
                  className={cn(
                    'px-2.5 py-1.5 font-mono text-dense-meta tabular-nums',
                    r.state.endsWith('right')
                      ? 'text-success'
                      : r.state.endsWith('wrong')
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  )}
                >
                  {r.state.replace('settled · ', '')} · {r.diff}
                </td>
                <td className="px-2.5 py-1.5 text-dense-meta text-muted-foreground">
                  {citedBy(r)}
                </td>
                <td className="px-2.5 py-1.5 text-right text-dense-micro text-muted-foreground/70">
                  attribution not recorded
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="px-3 py-2 text-dense-micro leading-relaxed text-muted-foreground">
        An outcome that attributes to nothing is marked unattributed, never forced onto a lens.
        Here every one of them is: the store settles a candidate against a benchmark and keeps no
        record of which evidence earned it. Until it does, the count of unattributed outcomes is
        itself the reading — what this book cannot yet explain.
      </p>
    </SectionPanel>
  )
}
