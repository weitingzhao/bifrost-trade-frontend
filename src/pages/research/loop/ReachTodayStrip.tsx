/**
 * Universe reach, the design's way (Research Autopilot Console.dc.html,
 * Rev 2026-09-18.2): today's widest run as a funnel — universe → screened →
 * proposed → drafts. The warehouse-coverage strip answers what the loop
 * *could* see; this one answers what it *did* see today, and the funnel
 * behind any run is one click away in its pipeline.
 */
import { fmtInt } from '@/lib/format'
import { parseHarnessTrace, traceFunnel, funnelReach } from '@/lib/harness/harnessTrace'
import type { ObjectiveRun } from '@/api/research/harness'

export interface ReachToday {
  universe: number
  screened: number | null
  proposed: number
  drafts: number | null
}

/** The widest run of the day, read off its own funnel. Null when none ran. */
export function reachToday(runs: readonly ObjectiveRun[], pendingDrafts: number | null, todayKey: string): ReachToday | null {
  let best: ReachToday | null = null
  for (const run of runs) {
    if ((run.started_at ?? '').slice(0, 10) !== todayKey) continue
    const trace = parseHarnessTrace(run.trace_json)
    const reach = funnelReach(trace)
    if (!reach) continue
    if (best && reach.considered <= best.universe) continue
    const steps = traceFunnel(trace)
    best = {
      universe: reach.considered,
      screened: steps[0] && Number.isFinite(steps[0].out_count) ? steps[0].out_count : null,
      proposed: reach.proposed,
      drafts: pendingDrafts,
    }
  }
  return best
}

export function ReachTodayStrip({ reach }: { reach: ReachToday | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border px-3 py-2 mat-card">
      <span className="mr-1.5 text-dense-meta font-semibold text-muted-foreground">
        Universe reach
      </span>
      {reach ? (
        <>
          <Cell n={fmtInt(reach.universe)} label="universe" />
          <Arrow />
          <Cell n={reach.screened != null ? fmtInt(reach.screened) : '—'} label="screened" />
          <Arrow />
          <Cell n={fmtInt(reach.proposed)} label="proposed" accent />
          <Arrow />
          <Cell n={reach.drafts != null ? fmtInt(reach.drafts) : '—'} label="drafts" warn={(reach.drafts ?? 0) > 0} />
        </>
      ) : (
        <span className="text-dense-meta text-muted-foreground">no run today yet — the last funnels are in the runs below</span>
      )}
      <span className="ml-auto text-dense-caption text-muted-foreground">
        today's widest run · the funnel behind any run is in its pipeline
      </span>
    </div>
  )
}

function Cell({ n, label, accent, warn }: { n: string; label: string; accent?: boolean; warn?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={
          'font-mono text-dense-body font-semibold tabular-nums ' +
          (warn ? 'text-warning' : accent ? 'text-primary' : 'text-foreground')
        }
      >
        {n}
      </span>
      <span className="text-dense-micro text-muted-foreground">{label}</span>
    </span>
  )
}

function Arrow() {
  return <span className="text-dense-meta text-muted-foreground/60">→</span>
}
