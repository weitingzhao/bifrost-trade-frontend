/**
 * A Pine-exit run next to the same run managed by premium rules only (research
 * 0.178.0, ledger B4). Research runs both — same signals, same strike rule —
 * and stores the comparison in the run's summary, so a stored run shows it too.
 * `paired` is over the entries both runs opened: the P&L the Pine exit added or
 * cost on those positions, with a bootstrap interval when there are enough.
 */
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import { panel, panelHead, td, th } from '@/components/research/labFaceUi'
import type { PineExitComparison as Comparison, SimPineReport } from '@/api/research/backtestSim'
import { diffLabel, pineExitRows, simUsd } from './simRuns'

const MODE_LABEL: Record<string, string> = {
  strategy: 'the script’s strategy() closes',
  reverse_plot: 'the opposite plot',
}

function modeLabel(used: SimPineReport['exit_mode_used']): string {
  if (used == null) return 'the script’s exit'
  const list = Array.isArray(used) ? used : [used]
  return list.map((m) => MODE_LABEL[m] ?? m).join(' / ')
}

export function PineExitComparison({ comparison, pine }: { comparison: Comparison; pine?: SimPineReport }) {
  const rows = pineExitRows(comparison)
  const p = comparison.paired
  const ci = p.avg_pnl_diff_ci95
  const errors = Object.entries(pine?.errors ?? {})
  return (
    <section className={panel} aria-label="Pine exit vs premium rules">
      <header className={panelHead}>
        <span className="text-dense-body font-semibold">Pine exit vs premium rules</span>
        <DenseTag size="cell" variant="neutral">
          exit on {modeLabel(pine?.exit_mode_used)}
        </DenseTag>
        <span className="ml-auto text-dense-caption text-muted-foreground">
          same signals and strikes — only the exit differs
        </span>
      </header>
      <table className="w-full">
        <thead>
          <tr>
            <th className={cn(th, 'text-left')}>Reading</th>
            <th className={th}>With Pine exit</th>
            <th className={th}>Premium rules only</th>
            <th className={th}>Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td className={cn(td, 'text-left font-sans')}>{r.k}</td>
              <td className={td}>{r.pine}</td>
              <td className={cn(td, 'text-muted-foreground')}>{r.premium}</td>
              <td className={cn(td, r.diff != null && (r.money || r.points) ? pnlColorClass(r.diff) : '')}>
                {diffLabel(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-caption">
        <span className="font-semibold">Paired</span>{' '}
        <span className="text-muted-foreground">
          {p.n} entries in both runs · the Pine exit changed {p.exits_changed}
        </span>
        {p.avg_pnl_diff != null ? (
          <>
            {' · '}
            <span className={pnlColorClass(p.avg_pnl_diff)}>
              {p.avg_pnl_diff > 0 ? '+' : ''}
              {simUsd(p.avg_pnl_diff)} / trade
            </span>
            <span className="text-muted-foreground">
              {ci ? ` [95% ${simUsd(ci[0])} to ${simUsd(ci[1])}]` : ' (too few for an interval)'}
            </span>
          </>
        ) : null}
        {p.only_premium_only || p.only_with_pine_exit ? (
          <span className="text-muted-foreground">
            {' '}
            · unpaired: {p.only_with_pine_exit} only with the Pine exit (a slot freed earlier), {p.only_premium_only}{' '}
            only without
          </span>
        ) : null}
      </p>
      {errors.length ? (
        <p className="m-0 border-t border-border px-3 py-1.5 text-dense-caption text-warning">
          The pine-runner failed on {errors.map(([s]) => s).join(', ')}; those names were skipped, not run without
          their exits.
        </p>
      ) : null}
      <p className="m-0 border-t border-border px-3 py-1.5 text-dense-caption text-muted-foreground">
        A Pine exit closes the position on the first session that opens after it is known — the session after a plot, the
        fill session of a strategy close at the open, the session after a stop or limit filled inside a session — and wins
        a tie with a premium rule, which only fills on the close.
      </p>
    </section>
  )
}
