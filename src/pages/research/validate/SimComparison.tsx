/**
 * Compared with (design Rev .161): one panel, one page per comparison, above
 * "This run".
 *
 * - Premium rules only — a run with the Pine exit beside the same run managed
 *   by premium rules only (research 0.178.0). Research stores it in the run's
 *   summary, so a stored run has it: same entries and strikes, only the exit
 *   differs, and the paired line is over the entries both opened.
 * - Schedule entry — a signal run beside the same configuration opened on the
 *   schedule. This page runs it as a second simulation, so it exists only for
 *   a fresh run; a stored signal run says so (Rev .160 Q3).
 *
 * Differences read green when better for the seller, red when worse — a
 * smaller drawdown is better — and not at all on a sample under five.
 */
import { useState } from 'react'
import { SegmentControl } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { mono, panel, panelHead, td, th } from '@/components/research/labFaceUi'
import type { PineExitComparison, SimSummary } from '@/api/research/backtestSim'
import { diffLabel, pairedLine, pineExitRows, scheduleRows, type CompareRow } from './simRuns'

type Page = 'exit' | 'schedule'

export interface SimComparisonProps {
  /** The run's stored Pine-exit comparison, when it ran with a Pine exit. */
  exit?: PineExitComparison
  /** A signal run: the schedule page applies (fresh or stored). */
  signalRun: boolean
  /** The schedule twin this page ran for a fresh signal run, if it did. */
  schedule?: { signal: Partial<SimSummary>; baseline: Partial<SimSummary>; events?: number } | null
}

function Table({ rows, a, b, few }: { rows: CompareRow[]; a: string; b: string; few: boolean }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <th className={cn(th, 'text-left')}>Reading</th>
          <th className={th}>{a}</th>
          <th className={th}>{b}</th>
          <th className={th}>Difference</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.k}>
            <td className={cn(td, 'text-left font-sans')}>{r.k}</td>
            <td className={td}>{r.a}</td>
            <td className={cn(td, 'text-muted-foreground')}>{r.b}</td>
            <td className={cn(td, r.colored && !few && r.diff != null ? pnlColorClass(r.diff) : '')}>{diffLabel(r)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SimComparison({ exit, signalRun, schedule }: SimComparisonProps) {
  const pages: { value: Page; label: string }[] = [
    ...(exit ? [{ value: 'exit' as const, label: 'Premium rules only' }] : []),
    ...(signalRun ? [{ value: 'schedule' as const, label: 'Schedule entry' }] : []),
  ]
  const [picked, setPicked] = useState<Page | null>(null)
  if (pages.length === 0) return null
  const page: Page = pages.some((p) => p.value === picked) ? (picked as Page) : pages[0].value
  const s = schedule?.signal
  const sNote = s?.sample_note
  const note =
    page === 'exit'
      ? 'stored with the run · same entries, only the exit differs'
      : schedule && s
        ? sNote && sNote !== 'ok'
          ? `${s.n_trades} trades (${sNote}) — read the difference as a lead, not a result`
          : `${schedule.events != null ? `${schedule.events} signals · ` : ''}same structure, window and exits — only the entry differs`
        : ''
  return (
    <section className={panel} aria-label="Compared with">
      <header className={panelHead}>
        <span className="text-dense-body font-semibold">Compared with</span>
        {pages.length > 1 ? (
          <SegmentControl
            ariaLabel="Compared with"
            size="xs"
            options={pages}
            value={page}
            onChange={(v) => setPicked(v as Page)}
          />
        ) : (
          <span className="text-dense-caption text-[var(--sk-soft)]">{pages[0].label}</span>
        )}
        <span className="ml-auto text-dense-caption text-muted-foreground">{note}</span>
      </header>
      {page === 'exit' && exit ? (
        <>
          <Table rows={pineExitRows(exit)} a="With Pine exit" b="Premium rules only" few={exit.paired.n < 5} />
          <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
            <div className={cn(mono, 'text-dense-caption text-[var(--sk-soft)]')}>{pairedLine(exit.paired)}</div>
            <div className="text-dense-caption text-muted-foreground">
              A Pine exit closes the position on the first session after the exit is known, at that session’s fill
              price. Profit take, stop and DTE are read at each close; whichever comes first closes the position.
            </div>
          </div>
        </>
      ) : null}
      {page === 'schedule' ? (
        schedule && s ? (
          <Table rows={scheduleRows(s, schedule.baseline)} a="Signal" b="Schedule" few={(s.n_trades ?? 0) < 5} />
        ) : (
          <p className="m-0 px-3 py-2 text-dense-caption text-muted-foreground">
            Signal entry vs schedule is not stored with a run. Run this configuration again with Compare with the
            schedule on to see it.
          </p>
        )
      ) : null}
    </section>
  )
}
