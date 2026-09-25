import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { PageHead, PageShell } from '@/components/layout'
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
  designOnly: 'neutral',
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
  designOnly: 'bg-[var(--sk-raised2)]',
}

/** A raised panel on the canvas, as the design draws each block of this page. */
const PANEL = 'border mat-card'

/**
 * The five lists that are this side's work. `stale` is not one of them here —
 * a moved rev is worth a second look, not a rebuild — and `staging` is,
 * because a page with no home in the design is a question to ask before
 * anything moves (§15).
 */
const TO_LISTS: readonly AdoptionState[] = ['reviewing', 'pending', 'unbuilt', 'moving', 'staging']

function trail(row: AdoptionRow): string {
  return [...row.crumbs, row.label].join(' / ')
}

/** One stacked bar over the eight states — the whole readout at a glance. */
function ShapeBar({
  byState,
  total,
  tall,
}: {
  byState: Record<AdoptionState, number>
  total: number
  /** The page's own bar reads a size up from a group's. */
  tall?: boolean
}) {
  if (total <= 0) return null
  return (
    <span className={cn('flex w-full overflow-hidden rounded-sm bg-background', tall ? 'h-2' : 'h-1.5')}>
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
  const parts = ADOPTION_SECTIONS.filter(
    (s) => s.state !== 'aligned' && s.state !== 'backlog' && s.state !== 'designOnly',
  )
    .filter((s) => byState[s.state] > 0)
    .map((s) => `${byState[s.state]} ${s.title.toLowerCase()}`)
  return parts.length === 0 ? 'nothing left' : parts.join(' · ')
}

/**
 * Fold the design rows one parametrized page answers into a single row.
 *
 * The design's registry cannot hold `:id`, so it seeds a concrete row per
 * fixture — four objectives, so its own menu and crumbs resolve. This side
 * answers all four with one page. Listed one per fixture they read as four
 * things to confirm that all open the same URL, which is what the Owner found
 * on 2026-09-23 ("why are five listed?"): five design rows, two pages.
 *
 * The fold is display only. The counts above are taken over the design's rows,
 * because the denominator is the design's route table and folding there would
 * quietly shrink it.
 */
function foldParamRows(rows: AdoptionRow[]): { row: AdoptionRow; standsFor: number }[] {
  const out: { row: AdoptionRow; standsFor: number }[] = []
  const at = new Map<string, number>()
  for (const row of rows) {
    if (!row.via) {
      out.push({ row, standsFor: 1 })
      continue
    }
    const seen = at.get(row.via)
    if (seen == null) {
      at.set(row.via, out.length)
      out.push({ row, standsFor: 1 })
      continue
    }
    out[seen].standsFor += 1
  }
  return out
}

function Rows({ rows, state }: { rows: AdoptionRow[]; state: AdoptionState }) {
  const [open, setOpen] = useState<string | null>(null)
  // `unbuilt` shows the prototype file rather than a walk note, because there
  // is no walk. It can still carry a recommendation about whether this app
  // should have the page at all, and when it does, that is the thing to read —
  // the file name is in the page label already.
  const isUnbuilt = state === 'unbuilt' || state === 'designOnly'
  const hasNotes = state !== 'backlog'
  const showsApp = state === 'backlog'
  /** `unbuilt` has no walk and therefore no rev to stamp. */
  const showsRev = hasNotes && !isUnbuilt
  return (
    <DenseDataTable>
      {/* The table lays out fixed, so the narrow columns are sized here and the
          note cell takes whatever is left of the row. */}
      <colgroup>
        {hasNotes ? <col style={{ width: 34 }} /> : null}
        <col style={{ width: 260 }} />
        <col style={{ width: 240 }} />
        {showsRev ? <col style={{ width: 96 }} /> : null}
        <col />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          {hasNotes ? <DenseTableHead aria-label="Open the walk note" /> : null}
          <DenseTableHead className="whitespace-nowrap">Page</DenseTableHead>
          <DenseTableHead className="whitespace-nowrap">Route</DenseTableHead>
          {showsRev ? <DenseTableHead className="whitespace-nowrap">Rev</DenseTableHead> : null}
          <DenseTableHead>
            {showsApp ? 'App' : isUnbuilt ? 'Prototype · recommendation' : 'Note'}
          </DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {foldParamRows(rows).map(({ row: r, standsFor }) => {
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
                    /* A `via` row's own path is the design's fixture id, which
                       does not open here; the link goes to where the real ones
                       are picked. A folded row takes the answering page's own
                       name, because it is no longer one fixture. */
                    <Link
                      to={r.openAt ?? r.path}
                      className="text-[var(--sk-accent)] hover:underline"
                      title={r.openWhy}
                    >
                      {standsFor > 1 ? [...r.crumbs, r.viaLabel ?? r.label].join(' / ') : trail(r)}
                    </Link>
                  ) : (
                    trail(r)
                  )}
                  {standsFor > 1 ? (
                    <span className="ml-1.5 text-dense-caption text-muted-foreground">
                      {standsFor} design rows, one page
                    </span>
                  ) : null}
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
                <div className="truncate font-mono text-dense-caption text-muted-foreground">
                  {/* A folded row is the answering route; an unfolded one is
                      the design's path, with the route that answers it beside. */}
                  {standsFor > 1 ? (
                    r.via
                  ) : (
                    <>
                      {r.path}
                      {r.via ? <span className="text-muted-foreground/60"> → {r.via}</span> : null}
                    </>
                  )}
                </div>
                {r.aliasOf?.length ? (
                  <div className="text-dense-caption text-muted-foreground">
                    also answers {r.aliasOf.join(', ')}
                  </div>
                ) : null}
              </DenseTableCell>
              {showsRev ? (
                <DenseTableCell className="whitespace-nowrap font-mono text-dense-caption text-muted-foreground">
                  {r.rev ?? '—'}
                </DenseTableCell>
              ) : null}
              {/* `max-w-0` with `w-full` is what lets a truncating cell stop
                  contributing its full text to an auto table's column widths. */}
              <DenseTableCell className="max-w-0 text-muted-foreground">
                {isUnbuilt && !r.note ? (
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
                <DenseTableCell colSpan={showsRev ? 5 : 4} className="bg-[var(--sk-raised2)]">
                  <p className="m-0 max-w-[110ch] py-1 text-dense-label leading-[1.6] text-[var(--sk-soft)] text-pretty">
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
    // Nothing kept yet: open on the list waiting for the Owner, as the design does.
    return new Set(raw ? (JSON.parse(raw) as AdoptionState[]) : ['reviewing'])
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
  const adoptable = rows.filter((r) => r.state !== 'backlog' && r.state !== 'designOnly').length

  // The app's five "to" lists: everything that is work here and not yet done.
  const toCount = TO_LISTS.reduce((n, st) => n + counts.byState[st], 0)

  return (
    <PageShell padding="compact">
      <PageHead
        title="Design Adoption"
        info="Every page of the design package and where the app stands on it. Both sides are generated — the design's route table from shell-registry.js, the app's from routeRegistry.ts. The work is done when the five “to” lists are empty."
        meta={`design Rev ${DESIGN_REV}`}
      />

      <div className="mt-3 flex flex-col gap-3">
      <section className={cn(PANEL, 'flex flex-col gap-2.5 px-3.5 py-3')}>
        <div className="flex flex-wrap items-baseline gap-3.5">
          <span className="flex-none whitespace-nowrap font-mono type-page-title font-semibold tabular-nums">
            {counts.aligned}
            <span className="text-sm text-muted-foreground"> / {counts.designed}</span>
          </span>
          <span className="text-dense-label text-[var(--sk-mute2)]">design pages in place</span>
          <span className="text-dense-label text-[var(--sk-mute2)]">·</span>
          <span className="font-mono text-dense-body tabular-nums">{toCount}</span>
          <span className="text-dense-label text-[var(--sk-mute2)]">left in the five “to” lists</span>
        </div>
        <ShapeBar byState={counts.byState} total={adoptable} tall />
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ADOPTION_SECTIONS.map((s) => (
            <span key={s.state} className="inline-flex items-center gap-1.5 text-dense-meta">
              <span className={cn('inline-block h-2 w-2 rounded-[2px]', BAR[s.state])} aria-hidden />
              <span className="text-[var(--sk-mute2)]">{s.title}</span>
              <span className="font-mono tabular-nums text-foreground">{counts.byState[s.state]}</span>
            </span>
          ))}
        </div>
        <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
          The denominator is the {counts.designed} design routes that have a prototype, not the
          app’s page count: {counts.byState.unbuilt} of them have no page here at all, so counting
          against the app would read near complete with much of the design unbuilt. It leaves out
          the {counts.byState.designOnly} design documents the Owner kept in the design. The bar is
          wider than that — it counts every row on this page except the design’s own {counts.stubs}{' '}
          stubs and those documents, so the {counts.byState.staging} app pages the design has no
          home for are visible as work rather than invisible.
        </p>
      </section>

      <section className={cn(PANEL, 'overflow-hidden')}>
        <header className="flex flex-wrap items-baseline gap-2.5 border-b border-[var(--sk-line0)] px-3.5 py-2.5">
          <span className="text-dense-body font-semibold">By group</span>
          <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
            {groups.filter((g) => g.left === 0).length} of {groups.length} done
          </span>
          <span className="text-dense-label text-[var(--sk-mute2)]">
            Closest to done first. A group reads finished only when nothing is left in it — not when
            the pages someone happens to have walked are all aligned.
          </span>
        </header>
        <div data-sr-hscroll="" className="overflow-x-auto">
          <table data-sr-table="" className="min-w-[720px]">
            <thead>
              <tr>
                <th data-sr-col="text">Group</th>
                <th data-sr-col="num">In place</th>
                <th data-sr-col="text" className="w-[180px]">
                  Progress
                </th>
                <th data-sr-col="text">What is left</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.group}>
                  <td data-sr-col="text" className="font-semibold">
                    {g.group}
                  </td>
                  <td data-sr-col="num">
                    <span className={g.left === 0 ? 'text-lamp-green' : 'text-foreground'}>{g.aligned}</span>
                    <span className="text-muted-foreground"> / {g.total}</span>
                  </td>
                  <td data-sr-col="text">
                    <ShapeBar byState={g.byState} total={g.total} />
                  </td>
                  <td data-sr-col="wrap" className="text-[var(--sk-mute2)]">
                    {leftLabel(g.byState)}
                    {g.byState.backlog > 0 ? ` · ${g.byState.backlog} in the design’s own backlog` : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {ADOPTION_SECTIONS.map((s) => {
        const list = byState.get(s.state) ?? []
        const expanded = open.has(s.state)
        const perGroup = byPageGroup(list)
        return (
          <section key={s.state} className={cn(PANEL, 'overflow-hidden')}>
            <CollapsibleGroupHeader
              expanded={expanded}
              onToggle={() => toggle(s.state)}
              className="w-full px-3.5 py-2.5"
              aria-label={`${s.title} — ${list.length} pages`}
            >
              <CollapsibleChevron expanded={expanded} />
              <DenseTag variant={TAG[s.state]} size="cell">
                {s.state}
              </DenseTag>
              <span className="text-dense-body font-semibold">{s.title}</span>
              <span className="font-mono text-dense-label tabular-nums text-muted-foreground">
                {list.length}
              </span>
              {/* The split, on the closed header. "What is left in Research" is
                  the question this page is actually asked, and a section that
                  has to be opened to answer it is a section that gets opened
                  every time. */}
              <span className="ml-auto flex min-w-0 flex-wrap justify-end gap-x-3 gap-y-0.5">
                {perGroup.map((g) => (
                  <span key={g.group} className="text-dense-meta whitespace-nowrap">
                    <span className="text-[var(--sk-mute2)]">{g.group}</span>{' '}
                    <span className="font-mono tabular-nums text-foreground/80">{g.rows.length}</span>
                  </span>
                ))}
              </span>
            </CollapsibleGroupHeader>
            {expanded ? (
              <CollapsibleGroupBody className="px-3.5 pb-3">
                <p className="mb-2.5 text-dense-label text-[var(--sk-mute2)]">{s.blurb}</p>
                {list.length === 0 ? (
                  <EmptyState title="Nothing in this list" description="Every page has left this state." />
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
          </section>
        )
      })}
      </div>
    </PageShell>
  )
}
