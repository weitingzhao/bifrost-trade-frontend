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
  const { rows, stations, totals, oldest, worst, loading, error, hypothesisCount } =
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
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/60 bg-secondary/60 px-3 py-1.5">
                    <span className={SECTION_CAP_CLASS}>{mine[0].stationLabel}</span>
                    <span className="text-dense-caption text-muted-foreground">
                      {mine.length} page{mine.length === 1 ? '' : 's'}
                    </span>
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
          hypothesis, promotion or pin whose origin is that page — so a row can carry one without
          the other, and a page that owes a store shows the numerator with no base.{' '}
          <span className="text-foreground/80">It reads zero everywhere today for a reason worth
          fixing</span>: every Save-as-Hypothesis button on the discovery list stamps{' '}
          <span className="font-mono">research-home</span>, the page the list is rendered on,
          rather than the station that produced the hit — so all {hypothesisCount}{' '}
          hypotheses name a container page and none names a station. The join works; what this
          side writes into it does not. Owing a store is not the same as owing a method face: a
          page owes one when its product is an object you name again later — you fork a screen and
          cite a verdict, so both are owed; Compare only assembles and History recomputes a
          denominator, so neither is. That is also why the fork lineage cannot be drawn.
        </p>
      </SectionPanel>
    </div>
  )
}

function CensusRowView({
  row,
  open,
  onToggle,
}: {
  row: CensusRow
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
                'block font-mono text-dense-caption',
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
        <div className="border-t border-border/40 bg-background px-3 py-2 pl-10">
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
        </div>
      ) : null}
    </div>
  )
}
