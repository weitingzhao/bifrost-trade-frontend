import type { TechConditionStat } from '@/types/stockScreener'
import { fmt } from '@/utils/stockDataReadiness/format'
import { cn } from '@/lib/utils'

export function CriteriaBar({ label, pass, fail }: { label: string; pass: number; fail: number }) {
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

export function CriteriaConditionList({
  conditions,
  labelForId,
}: {
  conditions: TechConditionStat[]
  labelForId?: (id: string, fallback?: string) => string
}) {
  if (!conditions.length) return null
  return (
    <div className="space-y-0.5">
      {conditions.map(c => (
        <CriteriaBar
          key={c.id}
          label={labelForId ? labelForId(c.id, c.label) : (c.label ?? c.id)}
          pass={c.pass}
          fail={c.fail}
        />
      ))}
    </div>
  )
}
