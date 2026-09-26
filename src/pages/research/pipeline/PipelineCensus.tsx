/**
 * The Pipeline layer reading, for the top of `/research/workbench`.
 *
 * Shell Spec §5a.6 at Rev 2026-09-21.5 — the scale this side asked for and
 * Design rewrote twice. Four blocks: **Stops here** (two readings, not one),
 * **Oldest untouched**, **Census** (eleven rows, sectioned, expandable) and
 * **Left the pipeline**.
 *
 * `pipelineModel.ts` carries what each row can and cannot say. The short
 * version: four stores exist and hold real rows, four pages owe one, two owe
 * none, and Alerts is not on this bench.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { SectionPanel, SECTION_CAP_CLASS } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { DiscoveryCapture, type DiscoveryTarget } from '@/components/research/DiscoveryCapture'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { cn } from '@/lib/utils'
import { fmtPct0 } from '@/utils/positions'
import { type CensusRow } from './pipelineModel'
import { usePipelineCensus } from './usePipelineCensus'

const STORE_TAG: Record<CensusRow['storeState'], { label: string; variant: 'success' | 'warning' | 'neutral' | 'info' }> = {
  'has-store': { label: 'store', variant: 'success' },
  'store-owed': { label: 'store owed', variant: 'warning' },
  'no-store-owed': { label: 'no store owed', variant: 'info' },
  'off-bench': { label: 'off bench', variant: 'neutral' },
}

/** `2026-09-19` from whatever stamp the store keeps. */
function day(stamp: string | null): string {
  return stamp == null ? '—' : stamp.slice(0, 10)
}

export function PipelineCensus() {
  const [open, setOpen] = useState<string | null>(null)
  const { rows, stations, totals, oldest, worst, hits, left, universeScanned, loading, error, hypothesisCount } =
    usePipelineCensus()

  return (
    <div className="space-y-3">
      {error ? <QueryErrorAlert error={error} /> : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SectionPanel
          cap="Stops here"
          tone="warning"
          title={
            worst?.stuck != null
              ? `${fmtPct0(worst.stuck)} ${worst.label} — most of what it wrote, nothing came out of`
              : 'nothing measurable yet'
          }
          note={`${totals.withStore} of ${totals.onBench} pages on this bench keep a store`}
        >
          <div className="flex flex-col gap-1.5 px-3 py-3">
            {stations.map((s) => (
              <div
                key={s.station}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem_5rem] items-center gap-2.5"
                title={
                  s.stuck == null
                    ? `${s.label}: no page here keeps a store, so nothing can be counted`
                    : `${s.label}: ${s.made} written, ${s.movedOn} came out`
                }
              >
                <span className="text-dense-label font-semibold">{s.label}</span>
                <span className="relative block h-1.5 rounded-sm bg-secondary">
                  {s.stuck != null ? (
                    <span
                      className="absolute inset-y-0 left-0 rounded-sm bg-warning/70"
                      style={{ width: `${Math.max(3, s.stuck * 100)}%` }}
                    />
                  ) : null}
                </span>
                <span className={cn('text-right font-mono text-dense-label tabular-nums', s.stuck == null && 'text-muted-foreground')}>
                  {fmtPct0(s.stuck)}
                </span>
                <span
                  className="text-right font-mono text-dense-caption text-muted-foreground"
                  title="Pages at this station that keep a store, over pages on the bench. Without it, 100% stuck reads as the worst station when it means only one page can be measured."
                >
                  {s.withStore}/{s.onBench} stores
                </span>
              </div>
            ))}
            <p className="mt-1 text-dense-caption leading-relaxed text-muted-foreground">
              Two readings, because one misleads: a station whose only measurable page is fully
              stuck shows 100%, which is not the same as being the worst. Coverage says how much
              of each station can be measured at all.
            </p>
          </div>
        </SectionPanel>

        <SectionPanel
          cap="Oldest untouched"
          title={oldest ? `${day(oldest.oldest)} · ${oldest.label}` : 'nothing to age'}
          note="by the engine's own stamp"
        >
          <div className="px-3 py-3">
            {oldest ? (
              <p className="text-dense-meta leading-relaxed text-muted-foreground">
                <span className="text-foreground/80">{oldest.made}</span> rows in{' '}
                <span className="font-mono">{oldest.store}</span> and nothing has come out of
                them. The age is the store's own newest stamp — no page-read log is needed, which
                is what the first scale was waiting on.
              </p>
            ) : (
              <p className="text-dense-meta leading-relaxed text-muted-foreground">
                Nothing carries an age: the pages that keep a store have had nothing leave them,
                and the pages that have had something leave keep no store to date it.
              </p>
            )}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        cap="Census"
        title="Every station store on one scale · most stuck first"
        note={`${totals.written} rows written · ${totals.left} had something come out · ${totals.stillHere} still sitting there`}
      >
        {loading ? (
          <Skeleton className="m-3 h-64 rounded-md" />
        ) : (
          <div>
            {(['discover', 'analyze', 'validate', 'off-bench'] as const).map((station) => {
              const mine = rows.filter((r) => r.station === station)
              if (mine.length === 0) return null
              const reading = stations.find((s) => s.station === station)
              return (
                <div key={station}>
                  {/* The bench card and the universe strip live here now: a
                      station's page count was a card of its own, and the
                      funnel was a strip above the page. Both are facts about
                      Discover, so they are in Discover's heading. */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 bg-secondary/60 px-3 py-1.5">
                    <span className={SECTION_CAP_CLASS}>{mine[0].stationLabel}</span>
                    <span className="text-dense-caption text-muted-foreground">
                      {mine.length} page{mine.length === 1 ? '' : 's'}
                    </span>
                    {station === 'discover' ? (
                      universeScanned != null ? (
                        <span
                          className="text-dense-caption text-muted-foreground"
                          title="The widest layer the universe funnel measured — what Discover is scanning over."
                        >
                          universe {universeScanned.toLocaleString()} scanned
                        </span>
                      ) : (
                        /* Marked, not omitted: all five layers of the funnel
                           answer `unavailable` on this side, so the strip this
                           folded in was reporting five not-measureds. Leaving
                           the figure out would read as "Discover scans
                           nothing" rather than "nobody counted". */
                        <span
                          className="text-dense-caption text-muted-foreground/60"
                          title="The universe funnel has five layers and every one answers `unavailable` — nothing counts what Discover scans over."
                        >
                          universe not measured
                        </span>
                      )
                    ) : null}
                    {reading ? (
                      <span className="text-dense-caption text-muted-foreground">
                        {reading.made} written · {reading.movedOn} left
                      </span>
                    ) : null}
                    {reading?.stuck != null ? (
                      <span className="ml-auto font-mono text-dense-caption text-warning">
                        {fmtPct0(reading.stuck)} stuck
                      </span>
                    ) : null}
                  </div>
                  {mine.map((r) => (
                    <CensusRowView
                      key={r.to}
                      row={r}
                      hits={hits.get(r.to) ?? []}
                      open={open === r.to}
                      onToggle={() => setOpen(open === r.to ? null : r.to)}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
        <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          <span className="text-foreground/80">Made</span> counts what the station’s engine wrote,
          not page visits. <span className="text-foreground/80">Moved on</span> counts a
          hypothesis whose origin is that page — so a row can carry one without the other, and a
          page that owes a store shows the numerator with no base. The Save buttons stamp short
          tokens and the shell stamps addresses; both are read through one table, so a save from
          any station page lands on its row. It reads {totals.left} of the {hypothesisCount}{' '}
          hypotheses on file
          {totals.left === 0
            ? ' because every one of those came out of the loop, the Copilot or a container page — not from a station'
            : '; the rest came out of the loop, the Copilot or a container page rather than a station'}
          , which the rows below name one by one. Owing a store is not the same as owing a method face: a
          page owes one when its product is an object you name again later — you fork a screen and
          cite a verdict, so both are owed; Compare only assembles and History recomputes a
          denominator, so neither is. That is also why the fork lineage cannot be drawn.
        </p>
      </SectionPanel>

      {/* The design's fourth block, and where the Active hypotheses cards
          went. A hypothesis has **left** the pipeline — its original is on the
          Hypothesis Board — so this page does not keep a second copy of it. It
          lists them by the page each came out of, which is the same reading as
          the Moved on column: the numerator, named. */}
      <SectionPanel
        cap="Left the pipeline"
        title={`What came out of the stations · ${left.length} shown`}
        note="every row is one unit of the Moved on column, and the page it came from"
        action={
          <Link to="/research/loop/hypotheses" className="text-dense-meta text-primary hover:underline">
            Hypothesis Board →
          </Link>
        }
      >
        {left.length === 0 ? (
          <p className="px-3 py-3 text-dense-meta leading-relaxed text-muted-foreground">
            Nothing has come out of the stations. Read with the Census above: the pages that keep
            a store have had nothing leave them, and nothing that left carries a station as its
            origin — see the footnote for why that is a stamping fault rather than an empty day.
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {left.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-1.5">
                <DenseTag variant="category" size="cell">
                  {row.kind}
                </DenseTag>
                {row.station && row.to ? (
                  <Link
                    to={row.to}
                    className="text-dense-caption text-muted-foreground hover:text-foreground hover:underline"
                    title={`Stamped ${row.stamp} — the station it came out of.`}
                  >
                    {row.station}
                  </Link>
                ) : (
                  <span
                    className="font-mono text-dense-caption text-muted-foreground/70"
                    title={
                      row.why
                        ? `${row.stamp} — ${row.why}, so it counts at no station.`
                        : `${row.stamp} — this census cannot place it, so it counts at no station.`
                    }
                  >
                    {row.stamp}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-dense-meta">{row.title}</span>
                <span className="font-mono text-dense-caption tabular-nums text-muted-foreground/70">
                  {row.at}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionPanel>
    </div>
  )
}

function CensusRowView({
  row,
  hits,
  open,
  onToggle,
}: {
  row: CensusRow
  /** What this page wrote today — the design's "a row opens into what it wrote". */
  hits: { label: string; line: string; target?: DiscoveryTarget }[]
  open: boolean
  onToggle: () => void
}) {
  const tag = STORE_TAG[row.storeState]
  const stuck = row.made != null && row.made > 0 ? (row.made - row.movedOn) / row.made : null
  return (
    <div className="border-b border-border/40">
      <div
        className={cn(
          'grid grid-cols-[1.5rem_minmax(0,1fr)_4rem_5rem_minmax(0,8rem)_3rem_6rem] items-center gap-2 px-3 py-1.5',
          row.storeState === 'off-bench' && 'opacity-60',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={open ? `Collapse ${row.label}` : `Expand ${row.label}`}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} />
        </button>
        <span className="min-w-0">
          {row.pageBuilt ? (
            <Link to={row.to} className="text-dense-label text-entity-symbol hover:underline">
              {row.label}
            </Link>
          ) : (
            <span className="text-dense-label text-muted-foreground" title="The design has this page; this side has not built it.">
              {row.label}
            </span>
          )}
          <span className="ml-1.5 font-mono text-dense-caption text-muted-foreground">
            {row.store ?? '—'}
          </span>
          {row.note ? (
            <span
              className={cn(
                'block text-dense-caption',
                row.storeState === 'store-owed' ? 'text-warning/80' : 'text-muted-foreground/70',
              )}
            >
              {row.note}
            </span>
          ) : null}
        </span>
        <span className="text-right font-mono text-dense-label tabular-nums">
          {row.made ?? <span className="text-muted-foreground">—</span>}
        </span>
        <span className="text-right font-mono text-dense-label tabular-nums text-muted-foreground">
          {row.movedOn}
        </span>
        <span className="relative block h-1.5 rounded-sm bg-secondary">
          {stuck != null ? (
            <span
              className="absolute inset-y-0 left-0 rounded-sm bg-warning/60"
              style={{ width: `${Math.max(3, stuck * 100)}%` }}
            />
          ) : null}
        </span>
        <span className={cn('text-right font-mono text-dense-caption tabular-nums', stuck == null && 'text-muted-foreground')}>
          {fmtPct0(stuck)}
        </span>
        <span className="text-right font-mono text-dense-caption tabular-nums text-muted-foreground">
          {day(row.oldest)}
        </span>
      </div>
      {open ? (
        <div className="space-y-1.5 border-t border-border/40 bg-background px-3 py-2 pl-10">
          <div className="flex flex-wrap items-center gap-2">
            <DenseTag variant={tag.variant} size="cell">
              {tag.label}
            </DenseTag>
            <span className="text-dense-caption text-muted-foreground">
              {row.storeState === 'has-store'
                ? `${row.made} rows in ${row.store}, newest ${day(row.oldest)}`
                : row.storeState === 'store-owed'
                  ? `nothing keeps what this page produces; ${row.store} is the store it owes`
                  : row.storeState === 'off-bench'
                    ? 'this lane belongs to Home › Alerts and stays out of every denominator'
                    : 'its product is not an object anybody names again, so it owes nothing'}
            </span>
          </div>
          {hits.length > 0 ? (
            <ul className="space-y-0.5">
              {hits.map((h) => (
                <li
                  key={`${h.label}-${h.line}`}
                  className="flex items-center gap-2.5 rounded-sm px-1 py-0.5 hover:bg-secondary/60"
                >
                  <span className="w-16 shrink-0 font-mono text-dense-caption font-bold text-entity-symbol">
                    {h.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-dense-caption text-muted-foreground">
                    {h.line}
                  </span>
                  {/* The verbs belong beside the thing they act on — the row
                      that opens into what a page made is where you pin it,
                      pool it or state a thesis about it. Same component as
                      the lane list, so the origin stamp is the same too. */}
                  {h.target ? <DiscoveryCapture target={h.target} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-dense-caption text-muted-foreground/70">
              Nothing to open — this page wrote nothing today that anything kept.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
