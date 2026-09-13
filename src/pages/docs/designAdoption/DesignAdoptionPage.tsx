import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  EmptyState,
  type DenseTagVariant,
} from '@/components/data-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ADOPTION_SECTIONS,
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
 */

/** Reserve the lamp colours for state; a count is not a fault. */
const TAG: Record<AdoptionState, DenseTagVariant> = {
  aligned: 'success',
  stale: 'warning',
  pending: 'neutral',
  unbuilt: 'neutral',
  moving: 'info',
  staging: 'warning',
}

function trail(row: AdoptionRow): string {
  return [...row.crumbs, row.label].join(' / ')
}

function Rows({ rows, state }: { rows: AdoptionRow[]; state: AdoptionState }) {
  const showsFile = state === 'unbuilt'
  return (
    <DenseDataTable>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Page</DenseTableHead>
          <DenseTableHead>Route</DenseTableHead>
          <DenseTableHead>{showsFile ? 'Prototype' : 'Note'}</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {rows.map((r) => (
          <DenseTableRow key={r.path}>
            <DenseTableCell>
              {state === 'unbuilt' ? (
                trail(r)
              ) : (
                <Link to={r.path} className="text-link hover:underline">
                  {trail(r)}
                </Link>
              )}
            </DenseTableCell>
            <DenseTableCell>
              <div className="font-mono text-dense-caption text-muted-foreground">{r.path}</div>
              {r.aliasOf?.length ? (
                <div className="text-dense-caption text-muted-foreground">
                  also answers {r.aliasOf.join(', ')}
                </div>
              ) : null}
            </DenseTableCell>
            <DenseTableCell className="text-muted-foreground">
              {showsFile ? (
                r.design?.designed ? (
                  <span className="font-mono text-dense-caption">{r.design.file}</span>
                ) : (
                  // The design's own backlog: in its menu, no prototype behind
                  // it. Not work this side can start.
                  <span className="text-dense-caption">no prototype in the design yet</span>
                )
              ) : (
                (r.note ?? (r.rev ? `walked against rev ${r.rev}` : ''))
              )}
            </DenseTableCell>
          </DenseTableRow>
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}

export default function DesignAdoptionPage() {
  const rows = useMemo(() => adoptionRows(), [])
  const counts = useMemo(() => adoptionCounts(rows), [rows])
  const byState = useMemo(() => {
    const m = new Map<AdoptionState, AdoptionRow[]>()
    for (const r of rows) m.set(r.state, [...(m.get(r.state) ?? []), r])
    for (const list of m.values()) list.sort((a, b) => trail(a).localeCompare(trail(b)))
    return m
  }, [rows])

  return (
    <PageShell>
      <PageHeader
        breadcrumb={<p className="text-xs font-medium text-primary/90">System / Reference</p>}
        title="Design Adoption"
        description="Every page of design/trade and where the app stands on it. The work is done when the four “to” lists are empty."
        actions={
          <div className="flex items-center gap-3">
            <span className="font-mono text-dense-caption uppercase tracking-wide text-muted-foreground">
              design rev {DESIGN_REV}
            </span>
            <span className="text-sm tabular-nums">
              <span className="font-semibold text-foreground">{counts.aligned}</span>
              <span className="text-muted-foreground"> / {counts.designed} walked</span>
            </span>
          </div>
        }
      />

      <Card variant="elevated">
        <CardContent className="py-3 text-dense-body text-muted-foreground">
          The denominator is the {counts.designed} design routes that have a prototype, not the
          app’s page count: {byState.get('unbuilt')?.length ?? 0} design routes have no page here at
          all, so counting against the app would read near complete with much of the design
          unbuilt. The design’s other {88 - counts.designed} routes are in its menu with no
          prototype behind them — its own backlog, and nothing this side can adopt.
        </CardContent>
      </Card>

      {ADOPTION_SECTIONS.map((s) => {
        const list = byState.get(s.state) ?? []
        return (
          <Card key={s.state} variant="elevated">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <DenseTag variant={TAG[s.state]}>{s.state}</DenseTag>
                <span>{s.title}</span>
                <span className="font-mono text-dense-caption tabular-nums text-muted-foreground">
                  {list.length}
                </span>
              </CardTitle>
              <p className="text-dense-caption text-muted-foreground">{s.blurb}</p>
            </CardHeader>
            <CardContent className="pt-0">
              {list.length === 0 ? (
                <EmptyState title="Nothing here" description="This list is empty." />
              ) : (
                <Rows rows={list} state={s.state} />
              )}
            </CardContent>
          </Card>
        )
      })}
    </PageShell>
  )
}
