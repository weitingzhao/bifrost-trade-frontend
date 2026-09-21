import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHeader, PageShell } from '@/components/layout'
import {
  CollapsibleChevron,
  CollapsibleGroupBody,
  CollapsibleGroupHeader,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  ExpandToggleCell,
  type DenseTagVariant,
} from '@/components/data-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ADOPTION_SECTIONS,
  adoptionByGroup,
  adoptionGroupOf,
  adoptionCounts,
  adoptionRows,
  DESIGN_REV,
  type AdoptionRow,
  type AdoptionState,
} from '@/lib/design/adoption'

/**
 * How much of `design/trade` the app has taken on, page by page.
 *
 * The Owner's instrument for walking the design one page at a time: a list per
 * state, and the work is done when the four "to" lists are empty. Both sides
 * are generated — the design's route table from its own `shell-registry.js`,
 * the app's from `routeRegistry.ts` — so nothing here is a checklist that can
 * quietly go out of date.
 *
 * The notes are long on purpose (they are the record of each walk), which made
 * the page unreadable when every one of them was printed inline: 96 rows, the
 * tallest of them 956px. A note now opens under its row, and the two panels
 * above answer the questions that used to need a scroll — the whole shape, and
 * how far one group has to go.
 *
 * Even with the notes folded the page ran to a hundred rows in eight lists,
 * which is a scroll nobody reads. So each state now **collapses**, and the
 * rows inside one are **grouped again by page group** — because the question
 * asked of a list is almost never "show me all 27", it is "what is left in
 * Research". A closed section still answers that: its header carries the
 * per-group split, so the shape of the work is readable without opening
 * anything.
 *
 * Sections start closed and remember what you opened, per browser. That is a
 * convenience and nothing depends on it — a viewer with storage blocked gets
 * every section closed and the page still works.
 */

/** Reserve the lamp colours for state; a count is not a fault. */
const TAG: Record<AdoptionState, DenseTagVariant> = {
  aligned: 'success',
  reviewing: 'info',
  stale: 'warning',
  pending: 'neutral',
  unbuilt: 'neutral',
  moving: 'info',
  staging: 'warning',
  backlog: 'neutral',
}

/** The bar's inks, in the order the sections are listed. */
const BAR: Record<AdoptionState, string> = {
  aligned: 'bg-lamp-green',
  reviewing: 'bg-info',
  stale: 'bg-warning',
  pending: 'bg-[var(--sk-line2)]',
  unbuilt: 'bg-[var(--sk-surface)]',
  moving: 'bg-info/45',
  staging: 'bg-warning/45',
  backlog: 'bg-[var(--sk-raised2)]',
}

function trail(row: AdoptionRow): string {
  return [...row.crumbs, row.label].join(' / ')
}

/** One stacked bar over the eight states — the whole readout at a glance. */
function ShapeBar({ byState, total }: { byState: Record<AdoptionState, number>; total: number }) {
  if (total <= 0) return null
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-sm bg-[var(--sk-surface)]">
      {ADOPTION_SECTIONS.map((s) =>
        byState[s.state] > 0 ? (
          <span
            key={s.state}
            className={cn('block h-full', BAR[s.state])}
            style={{ width: `${(byState[s.state] / total) * 100}%` }}
            title={`${byState[s.state]} ${s.state}`}
          />
        ) : null,
      )}
    </span>
  )
}

/** What is left in a group, named rather than summed into one number. */
function leftLabel(byState: Record<AdoptionState, number>): string {
  const parts = ADOPTION_SECTIONS.filter((s) => s.state !== 'aligned' && s.state !== 'backlog')
    .filter((s) => byState[s.state] > 0)
    .map((s) => `${byState[s.state]} ${s.title.toLowerCase()}`)
  return parts.length === 0 ? 'nothing left' : parts.join(' · ')
}

function Rows({ rows, state }: { rows: AdoptionRow[]; state: AdoptionState }) {
  const [open, setOpen] = useState<string | null>(null)
  const showsFile = state === 'unbuilt'
  const showsApp = state === 'backlog'
  const hasNotes = !showsFile && !showsApp
  return (
    <DenseDataTable>
      {/* The table lays out fixed, so the narrow columns are sized here and the
          note cell takes whatever is left of the row. */}
      <colgroup>
        {hasNotes ? <col style={{ width: 34 }} /> : null}
        <col style={{ width: 260 }} />
        <col style={{ width: 240 }} />
        {hasNotes ? <col style={{ width: 96 }} /> : null}
        <col />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          {hasNotes ? <DenseTableHead aria-label="Open the walk note" /> : null}
          <DenseTableHead className="whitespace-nowrap">Page</DenseTableHead>
          <DenseTableHead className="whitespace-nowrap">Route</DenseTableHead>
          {hasNotes ? <DenseTableHead className="whitespace-nowrap">Rev</DenseTableHead> : null}
          <DenseTableHead>{showsFile ? 'Prototype' : showsApp ? 'App' : 'Note'}</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r) => {
          const expanded = open === r.path
          return [
            <DenseTableRow key={r.path}>
              {hasNotes ? (
                <DenseTableCell>
                  {r.note ? (
                    <ExpandToggleCell
                      expanded={expanded}
                      onToggle={() => setOpen(expanded ? null : r.path)}
                      label={`Walk note for ${trail(r)}`}
                    />
                  ) : null}
                </DenseTableCell>
              ) : null}
              <DenseTableCell className="max-w-0 truncate whitespace-nowrap">
                <span className="mr-2">
                  {r.inApp ? (
                    <Link to={r.path} className="text-link hover:underline">
                      {trail(r)}
                    </Link>
                  ) : (
                    trail(r)
                  )}
                </span>
                {/* NEW is this round's work; OLD is an early round a later
                    contract may have overtaken, so aligning to it can align to
                    something already superseded. */}
                {r.design?.round ? (
                  <DenseTag variant={r.design.round === 'NEW' ? 'info' : 'neutral'}>
                    {r.design.round}
                  </DenseTag>
                ) : null}
              </DenseTableCell>
              <DenseTableCell className="max-w-0 truncate whitespace-nowrap">
                <div className="truncate font-mono text-dense-caption text-muted-foreground">{r.path}</div>
                {r.aliasOf?.length ? (
                  <div className="text-dense-caption text-muted-foreground">
                    also answers {r.aliasOf.join(', ')}
                  </div>
                ) : null}
              </DenseTableCell>
              {hasNotes ? (
                <DenseTableCell className="whitespace-nowrap font-mono text-dense-caption text-muted-foreground">
                  {r.rev ?? '—'}
                </DenseTableCell>
              ) : null}
              {/* `max-w-0` with `w-full` is what lets a truncating cell stop
                  contributing its full text to an auto table's column widths. */}
              <DenseTableCell className="max-w-0 text-muted-foreground">
                {showsFile ? (
                  <span className="font-mono text-dense-caption">{r.design?.file}</span>
                ) : showsApp ? (
                  <span className="text-dense-caption">{r.inApp ? 'page here' : 'no page here'}</span>
                ) : r.note ? (
                  // One line of the walk, with the rest a click away — the notes
                  // run to three thousand characters and are the record, not a
                  // caption.
                  <button
                    type="button"
                    className="block w-full cursor-pointer truncate text-left text-dense-caption hover:text-foreground"
                    onClick={() => setOpen(expanded ? null : r.path)}
                    title="Open the walk note"
                  >
                    {r.note}
                  </button>
                ) : (
                  <span className="text-dense-caption">{r.rev ? `walked against rev ${r.rev}` : ''}</span>
                )}
              </DenseTableCell>
            </DenseTableRow>,
            expanded && r.note ? (
              <DenseTableRow key={`${r.path}:note`}>
                <DenseTableCell colSpan={5} className="bg-[var(--sk-raised2)]">
                  <p className="m-0 max-w-[110ch] py-1 text-dense-caption leading-normal text-secondary-foreground text-pretty">
                    {r.note}
                  </p>
                </DenseTableCell>
              </DenseTableRow>
            ) : null,
          ]
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}

const OPEN_KEY = 'bifrost.design-adoption.open'

function readOpen(): Set<AdoptionState> {
  try {
    const raw = localStorage.getItem(OPEN_KEY)
    return new Set(raw ? (JSON.parse(raw) as AdoptionState[]) : [])
  } catch {
    // Private mode, blocked storage, or something else wrote nonsense here.
    return new Set()
  }
}

function writeOpen(open: Set<AdoptionState>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...open]))
  } catch {
    // The page is fully usable without it; the preference is just not kept.
  }
}

/** The rows of one state, split by page group, biggest group first. */
function byPageGroup(rows: readonly AdoptionRow[]): { group: string; rows: AdoptionRow[] }[] {
  const m = new Map<string, AdoptionRow[]>()
  for (const r of rows) {
    const g = adoptionGroupOf(r)
    m.set(g, [...(m.get(g) ?? []), r])
  }
  return [...m]
    .map(([group, list]) => ({ group, rows: list }))
    .sort((a, b) => b.rows.length - a.rows.length || a.group.localeCompare(b.group))
}

export default function DesignAdoptionPage() {
  const [open, setOpen] = useState<Set<AdoptionState>>(readOpen)
  const toggle = (state: AdoptionState) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(state)) next.delete(state)
      else next.add(state)
      writeOpen(next)
      return next
    })
  const rows = useMemo(() => adoptionRows(), [])
  const counts = useMemo(() => adoptionCounts(rows), [rows])
  const groups = useMemo(() => adoptionByGroup(rows), [rows])
  const byState = useMemo(() => {
    const m = new Map<AdoptionState, AdoptionRow[]>()
    for (const r of rows) m.set(r.state, [...(m.get(r.state) ?? []), r])
    for (const list of m.values()) list.sort((a, b) => trail(a).localeCompare(trail(b)))
    return m
  }, [rows])
  const adoptable = rows.filter((r) => r.state !== 'backlog').length

  return (
    <PageShell>
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">System / Reference</p>}
        title="Design Adoption"
        description="Every page of design/trade and where the app stands on it. The work is done when the five “to” lists are empty."
        actions={
          <div className="flex items-center gap-3">
            <span className="font-mono text-dense-caption uppercase tracking-wide text-muted-foreground">
              design rev {DESIGN_REV}
            </span>
            <span className="text-sm tabular-nums">
              <span className="font-semibold text-foreground">{counts.aligned}</span>
              <span className="text-muted-foreground"> / {counts.designed} in place</span>
              <span className="text-muted-foreground">
                {' · '}
                {counts.byState.reviewing} to confirm
              </span>
            </span>
          </div>
        }
      />

      <Card variant="elevated">
        <CardContent className="space-y-2 py-3">
          <ShapeBar byState={counts.byState} total={adoptable} />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ADOPTION_SECTIONS.map((s) => (
              <span key={s.state} className="inline-flex items-center gap-1.5 text-dense-caption">
                <span className={cn('inline-block h-2 w-2 rounded-[2px]', BAR[s.state])} aria-hidden />
                <span className="text-muted-foreground">{s.title}</span>
                <span className="font-mono tabular-nums text-foreground">{counts.byState[s.state]}</span>
              </span>
            ))}
          </div>
          <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
            The denominator in the header is the {counts.designed} design routes that have a
            prototype, not the app’s page count: {counts.byState.unbuilt} of them have no page here
            at all, so counting against the app would read near complete with much of the design
            unbuilt. The bar is wider than that — it counts every row on this page except the
            design’s own {counts.stubs} stubs, so the {counts.byState.staging} app pages the design
            has no home for are visible as work rather than invisible.
          </p>
        </CardContent>
      </Card>

      <Card variant="elevated">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>By group</span>
            <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
              {groups.filter((g) => g.left === 0).length} of {groups.length} done
            </span>
          </CardTitle>
          <p className="text-dense-caption text-muted-foreground">
            Closest to done first. A group reads finished only when nothing is left in it — not when
            the pages someone happens to have walked are all aligned.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div role="table" className="w-full">
            <div
              role="row"
              className="grid grid-cols-[minmax(7rem,12rem)_5rem_9rem_minmax(0,1fr)] gap-3 border-b border-border px-1 pb-1 text-dense-caption uppercase tracking-wide text-muted-foreground"
            >
              <span role="columnheader">Group</span>
              <span role="columnheader">In place</span>
              <span role="columnheader">Progress</span>
              <span role="columnheader">What is left</span>
            </div>
            {groups.map((g) => (
              <div
                key={g.group}
                role="row"
                className="grid grid-cols-[minmax(7rem,12rem)_5rem_9rem_minmax(0,1fr)] items-center gap-3 border-b border-border/55 px-1 py-1.5 last:border-b-0"
              >
                <span role="cell" className="truncate text-sm font-semibold text-foreground">
                  {g.group}
                </span>
                <span role="cell" className="font-mono text-dense-caption tabular-nums">
                  <span className={g.left === 0 ? 'text-lamp-green' : 'text-foreground'}>{g.aligned}</span>
                  <span className="text-muted-foreground"> / {g.total}</span>
                </span>
                <span role="cell">
                  <ShapeBar byState={g.byState} total={g.total} />
                </span>
                <span role="cell" className="min-w-0 text-dense-caption text-muted-foreground">
                  {leftLabel(g.byState)}
                  {g.byState.backlog > 0 ? (
                    <span className="text-muted-foreground">
                      {' · '}
                      {g.byState.backlog} in the design’s own backlog
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {ADOPTION_SECTIONS.map((s) => {
        const list = byState.get(s.state) ?? []
        const expanded = open.has(s.state)
        const perGroup = byPageGroup(list)
        return (
          <Card key={s.state} variant="elevated" className="overflow-hidden">
            <CollapsibleGroupHeader
              expanded={expanded}
              onToggle={() => toggle(s.state)}
              className="w-full px-4 py-3"
              aria-label={`${s.title} — ${list.length} pages`}
            >
              <CollapsibleChevron expanded={expanded} />
              <DenseTag variant={TAG[s.state]}>{s.state}</DenseTag>
              <span className="text-base font-semibold">{s.title}</span>
              <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
                {list.length}
              </span>
              {/* The split, on the closed header. "What is left in Research" is
                  the question this page is actually asked, and a section that
                  has to be opened to answer it is a section that gets opened
                  every time. */}
              <span className="ml-auto flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-0.5">
                {perGroup.map((g) => (
                  <span key={g.group} className="text-dense-caption whitespace-nowrap">
                    <span className="text-muted-foreground">{g.group}</span>{' '}
                    <span className="font-mono tabular-nums text-foreground/80">{g.rows.length}</span>
                  </span>
                ))}
              </span>
            </CollapsibleGroupHeader>
            {expanded ? (
              <CollapsibleGroupBody className="px-4 pb-3">
                <p className="mb-2 text-dense-caption text-muted-foreground">{s.blurb}</p>
                {list.length === 0 ? (
                  <EmptyState title="Nothing here" description="This list is empty." />
                ) : (
                  <div className="space-y-3">
                    {perGroup.map((g) => (
                      <div key={g.group} className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-dense-label font-semibold">{g.group}</span>
                          <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
                            {g.rows.length}
                          </span>
                        </div>
                        <Rows rows={g.rows} state={s.state} />
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleGroupBody>
            ) : null}
          </Card>
        )
      })}
    </PageShell>
  )
}
