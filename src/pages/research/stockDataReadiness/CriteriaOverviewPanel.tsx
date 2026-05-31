import type { SepaCriteriaStats } from '@/types/stockScreener'
import { fmt } from '@/utils/stockDataReadiness/format'
import { cn } from '@/lib/utils'

function CriteriaBar({ label, pass, fail }: { label: string; pass: number; fail: number }) {
  const denom = pass + fail
  const pct = denom > 0 ? Math.round((pass / denom) * 100) : 0
  const barColor =
    pct >= 60 ? 'bg-lamp-green' : pct >= 30 ? 'bg-lamp-yellow' : 'bg-lamp-red'
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_1fr_auto] gap-2 items-center text-xs py-1">
      <span className="truncate text-muted-foreground" title={label}>
        {label}
      </span>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono tabular-nums shrink-0">
        {fmt(pass)}/{fmt(denom)} <span className="text-muted-foreground">({pct}%)</span>
      </span>
    </div>
  )
}

export function CriteriaOverviewPanel({
  stats,
  detailed = false,
}: {
  stats: SepaCriteriaStats
  detailed?: boolean
}) {
  const fundConds = stats.fundamental.conditions.filter(c => !c.group || c.group === 'sepa_core')
  const techConds = stats.technical.conditions

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-2 text-sm">
          <strong>Fundamental</strong>
          <span className="text-xs text-muted-foreground">
            Evaluated {fmt(stats.fundamental.cached_count)} / {fmt(stats.universe_count)} · Pass all 8:{' '}
            {fmt(stats.fundamental.fund_pass_count)}
          </span>
        </div>
        <div className="space-y-0.5">
          {fundConds.map(c => (
            <CriteriaBar key={c.id} label={c.label} pass={c.pass} fail={c.fail} />
          ))}
        </div>
      </div>

      {detailed && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2 text-sm">
            <strong>Technical</strong>
            <span className="text-xs text-muted-foreground">
              Evaluated {fmt(stats.technical.tech_cached_count ?? 0)} / {fmt(stats.universe_count)} · Pass all
              11: {fmt(stats.technical.tech_pass_count ?? 0)}
            </span>
          </div>
          {techConds.length > 0 ? (
            <div className="space-y-0.5">
              {techConds.map(c => (
                <CriteriaBar key={c.id} label={c.label ?? c.id} pass={c.pass} fail={c.fail} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No technical snapshot yet.</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-1">
            <span>≥252 bars: {fmt(stats.technical.bars_ge_252)}</span>
            <span>≥240: {fmt(stats.technical.bars_ge_240)}</span>
            <span>≥200: {fmt(stats.technical.bars_ge_200)}</span>
            <span>&lt;200: {fmt(stats.technical.bars_lt_200)}</span>
            <span>no bars: {fmt(stats.technical.no_bars)}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground border-t border-border pt-3">
        price_ready + fund_cache today: <strong>{fmt(stats.technical.both_ready)}</strong> /{' '}
        {fmt(stats.universe_count)}
      </p>
    </div>
  )
}
