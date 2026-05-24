import { Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { StrategyInstance } from '@/types/positions'
import type { MetricsEntry } from '@/hooks/useInstanceMetrics'

interface Props {
  instances: StrategyInstance[]
  metricsMap: Map<number, MetricsEntry>
  onDelete: (instance: StrategyInstance) => void
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function holdDays(openedAt: string | null): string {
  if (!openedAt) return '—'
  const days = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000)
  return days <= 0 ? '<1d' : `${days}d`
}

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const formatted = abs >= 1000
    ? `$${(abs / 1000).toFixed(1)}k`
    : `$${abs.toFixed(0)}`
  return n < 0 ? `-${formatted}` : formatted
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function pnlClass(n: number | null | undefined): string {
  if (n == null) return 'text-muted-foreground'
  return n > 0.001 ? 'text-green-600 dark:text-green-400' : n < -0.001 ? 'text-red-500' : 'text-muted-foreground'
}

function structureColor(name: string | null): string {
  if (!name) return 'hsl(0 0% 60%)'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360
  return `hsl(${h} 65% 55%)`
}

function MetricCell({ entry, value, fmt, className }: {
  entry: MetricsEntry | undefined
  value: number | null | undefined
  fmt: (n: number | null) => string
  className?: string
}) {
  if (!entry || entry.status === 'loading') {
    return (
      <TableCell className="text-right">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
      </TableCell>
    )
  }
  if (entry.status === 'error') {
    return <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
  }
  return (
    <TableCell className={cn('text-right font-mono text-xs font-medium', className)}>
      {fmt(value ?? null)}
    </TableCell>
  )
}

export function InstancesTable({ instances, metricsMap, onDelete }: Props) {
  if (instances.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No instances found.</p>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead className="text-right">Hold</TableHead>
            <TableHead className="text-right">Execs</TableHead>
            <TableHead className="text-right">Net PnL</TableHead>
            <TableHead className="text-right">PnL/Day</TableHead>
            <TableHead className="text-right">Underlying</TableHead>
            <TableHead className="text-right">Return</TableHead>
            <TableHead className="text-right">Annual</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {instances.map((inst) => {
            const entry = metricsMap.get(inst.strategy_instance_id)
            const m = entry?.status === 'ready' ? entry.metrics : null

            return (
              <TableRow key={inst.strategy_instance_id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{inst.strategy_instance_id}
                </TableCell>

                <TableCell>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium leading-tight">
                      {inst.strategy_opportunity_name ?? '—'}
                    </div>
                    {inst.strategy_structure_name && (
                      <span
                        className="inline-block text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color: structureColor(inst.strategy_structure_name),
                          border: `1px solid ${structureColor(inst.strategy_structure_name)}`,
                          opacity: 0.85,
                        }}
                      >
                        {inst.strategy_structure_name}
                      </span>
                    )}
                    {inst.label && (
                      <div className="text-[11px] text-muted-foreground italic">{inst.label}</div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-mono text-xs">{inst.account_id}</TableCell>
                <TableCell className="text-xs">{fmtDate(inst.opened_at)}</TableCell>

                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                  {holdDays(inst.opened_at)}
                </TableCell>

                <TableCell className="text-right">
                  {inst.executions_count > 0 ? (
                    <Badge variant="secondary" className="text-xs">{inst.executions_count}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </TableCell>

                <MetricCell
                  entry={entry}
                  value={m?.netPnl}
                  fmt={fmtUsd}
                  className={pnlClass(m?.netPnl)}
                />
                <MetricCell
                  entry={entry}
                  value={m?.netPnlPerDay}
                  fmt={fmtUsd}
                  className={pnlClass(m?.netPnlPerDay)}
                />
                <MetricCell
                  entry={entry}
                  value={m?.underlyingCost}
                  fmt={fmtUsd}
                  className="text-muted-foreground"
                />
                <MetricCell
                  entry={entry}
                  value={m?.returnPct}
                  fmt={fmtPct}
                  className={pnlClass(m?.returnPct)}
                />
                <MetricCell
                  entry={entry}
                  value={m?.annualPct}
                  fmt={fmtPct}
                  className={pnlClass(m?.annualPct)}
                />
                <MetricCell
                  entry={entry}
                  value={m?.commission != null ? -m.commission : null}
                  fmt={fmtUsd}
                  className="text-muted-foreground"
                />

                <TableCell className="p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(inst)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
