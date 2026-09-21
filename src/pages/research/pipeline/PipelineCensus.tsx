/**
 * The Pipeline layer reading, for the top of `/research/workbench`.
 *
 * Shell Spec §5a.6 asks for a layer page here, on the same argument that gave
 * Risk, Portfolio and The Book theirs: a dual row promises a destination, and
 * Pipeline was the last one answering with something less than a page. On
 * this side the page already existed — a bench directory and today's work —
 * so this is the layer's own reading placed above it rather than a
 * replacement for it.
 *
 * The design's reading is *where is my hand-run pipeline stuck*: every
 * artifact made today on one scale, most stuck first. This side cannot make
 * that reading, and `pipelineModel.ts` says exactly why, page by page. The
 * census keeps the design's rows and columns and marks the numbers — a table
 * that says *this station records nothing, and here is what it would have to
 * record* answers a real question, where a table of zeroes would answer a
 * false one: that nothing was made today.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { SectionPanel } from '@/components/layout'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeadRow,
  DenseTableHeader,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { fetchBacktestRuns } from '@/api/research/backtestEvent'
import { useRowLink } from '@/hooks/useRowLink'
import { cn } from '@/lib/utils'
import { censusReach, stationCensus, stationRollup } from './pipelineModel'

export function PipelineCensus() {
  const rowLink = useRowLink()

  // The one store on this side that keeps a timestamped artifact from a
  // station page. Everything else the census names is recomputed on request.
  const runsQ = useQuery({
    queryKey: ['research', 'backtest', 'runs', 'pipeline-census'],
    queryFn: () => fetchBacktestRuns({ limit: 200 }),
    staleTime: 5 * 60_000,
  })

  const runs = runsQ.data?.rows ?? []
  const rows = useMemo(() => stationCensus(runsQ.isSuccess ? runs.length : null), [runs, runsQ.isSuccess])
  const stations = useMemo(() => stationRollup(rows), [rows])
  const reach = censusReach(rows)
  const newestRun = useMemo(() => {
    const stamps = runs.map((r) => r.created_at ?? '').filter(Boolean).sort()
    return stamps.length > 0 ? stamps[stamps.length - 1] : null
  }, [runs])

  return (
    <div className="space-y-3">
      {runsQ.isError ? <QueryErrorAlert error={runsQ.error} /> : null}

      <SectionPanel
        cap="Stops here"
        tone="warning"
        title={`${reach.recorded} of ${reach.total} stations report anything`}
        note="the design ranks stations by what is stuck at them"
      >
        <p className="px-3 py-2 text-dense-meta leading-relaxed text-muted-foreground">
          The design puts each station on one scale — what you made there today, and how much of
          it never moved on — and puts the most stuck first. That ranking cannot be made here,
          and not because a number is missing: <span className="text-foreground/80">no station
          page records what it made</span>. Ratings and Vol ratings are model outputs the server
          recomputes daily; a Symbol verdict and a decay check are generated on request rather
          than stored; nothing saves a screen. Backtest is the single exception. So the panel
          ranks what is true instead — how much of each station can be measured at all.
        </p>
        <div className="flex flex-col gap-1.5 px-3 pb-3">
          {stations.map((s) => (
            <div key={s.station} className="grid grid-cols-[5rem_minmax(0,1fr)_4rem] items-center gap-2.5">
              <span className="text-dense-label font-semibold">{s.label}</span>
              <span className="relative block h-1.5 rounded-sm bg-secondary">
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-sm',
                    s.recorded > 0 ? 'bg-[var(--color-profit)]/60' : 'bg-destructive/50',
                  )}
                  style={{ width: `${Math.max(3, (s.recorded / Math.max(1, s.pages)) * 100)}%` }}
                />
              </span>
              <span className={cn('text-right font-mono text-dense-label tabular-nums', s.recorded === 0 && 'text-muted-foreground')}>
                {s.recorded}/{s.pages}
              </span>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        cap="Backlog"
        title="Every station page on one scale"
        note={
          newestRun
            ? `the one recorded store's newest artifact is ${newestRun.slice(0, 10)}`
            : 'nothing recorded'
        }
      >
        {runsQ.isLoading ? (
          <Skeleton className="m-3 h-48 rounded-md" />
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0 overflow-x-auto" tableClassName="min-w-[48rem]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead className="w-44 max-w-none">Page</DenseTableHead>
                <DenseTableHead className="w-20 max-w-none">Station</DenseTableHead>
                <DenseTableHead className="w-16 max-w-none text-right">Made</DenseTableHead>
                <DenseTableHead
                  className="w-20 max-w-none text-right"
                  title="Artifacts that were distilled and so left the station. Distill is the only verb that writes, and nothing on this side records one — the six-verb row is deferred by the Owner's ruling of 2026-09-21."
                >
                  Moved on
                </DenseTableHead>
                <DenseTableHead>Why not</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {rows.map((r) => (
                <DenseTableRow
                  key={r.to}
                  {...rowLink(r.to, r.missing != null ? 'opacity-75' : undefined)}
                >
                  <DenseTableCell className="max-w-none whitespace-nowrap">
                    <Link
                      to={r.to}
                      onClick={(e) => e.stopPropagation()}
                      className="text-dense-label text-entity-symbol hover:underline"
                    >
                      {r.label}
                    </Link>
                    <span className="block font-mono text-dense-caption text-muted-foreground">
                      {r.writes}
                    </span>
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none text-dense-meta text-muted-foreground">
                    {r.stationLabel}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'max-w-none')}>
                    {r.made ?? <span className="text-muted-foreground">—</span>}
                  </DenseTableCell>
                  <DenseTableCell className={cn(denseTableNumCell, 'max-w-none text-muted-foreground')}>
                    —
                  </DenseTableCell>
                  <DenseTableCell className="max-w-none whitespace-normal text-dense-meta text-muted-foreground">
                    {r.missing ?? 'recorded — this is the only station store that keeps one'}
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
        <p className="border-t border-border/60 px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
          <span className="text-foreground/80">Made</span> counts artifacts the page kept. Only
          Backtest keeps any, and its count is every run it holds rather than today’s — the newest
          is weeks old, so a “today” column would read zero for a reason about the record.{' '}
          <span className="text-foreground/80">Moved on</span> needs a Distill to be written down,
          and the six verbs are deferred until what each one writes is settled. The design’s three
          states rest on the same record — and <span className="font-mono">cold</span>, produced
          and nobody opened it, would additionally need a page-read log, which nothing in this app
          keeps. The design’s <span className="text-foreground/80">Oldest untouched</span> panel
          and its <span className="text-foreground/80">Lineage</span> block are absent for those
          two reasons rather than drawn empty: one needs an artifact with an age, the other needs
          fork records, which the Journal established are kept nowhere.
        </p>
      </SectionPanel>
    </div>
  )
}
