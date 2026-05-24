import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Pencil, Link2, Trash2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtUsd } from '@/utils/positions'
import { updateExecution } from '@/api/trading'
import type { Execution } from '@/types/positions'

interface Props {
  finalExecs: Execution[]
  twsExecs: Execution[]
  onEdit: (exec: Execution) => void
  onLink: (exec: Execution) => void
  onDelete: (exec: Execution) => void
  onClose?: (exec: Execution) => void
  onRefresh: () => void
  showPoolOff?: boolean
}

function fmtTime(ts: number | null | undefined): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'medium' })
}

function findMatchingTws(final: Execution, twsList: Execution[]): Execution | null {
  const acc = final.account_id
  const eid = final.exec_id?.trim()
  if (eid) {
    const hit = twsList.find((t) => t.exec_id?.trim() === eid && t.account_id === acc)
    if (hit) return hit
  }
  const ft = final.time
  const ck = final.contract_key
  if (ft == null || !ck) return null
  return twsList.find((t) =>
    t.account_id === acc && t.contract_key === ck && t.time != null && Math.abs(t.time - ft) < 1.5
  ) ?? null
}

function needsSync(a: Execution, b: Execution): boolean {
  if (b.strategy_instance_id == null && b.strategy_opportunity_id == null) return false
  return a.strategy_instance_id !== b.strategy_instance_id ||
    a.strategy_opportunity_id !== b.strategy_opportunity_id
}

export function ExecutionRow({
  finalExecs,
  twsExecs,
  onEdit,
  onLink,
  onDelete,
  onClose,
  onRefresh,
  showPoolOff,
}: Props) {
  const [syncingId, setSyncingId] = useState<number | null>(null)

  if (finalExecs.length === 0 && twsExecs.length === 0) {
    return <p className="text-xs text-muted-foreground py-1">No execution records</p>
  }

  async function handleSync(targetId: number, sourceExec: Execution) {
    setSyncingId(targetId)
    try {
      await updateExecution(targetId, {
        strategy_opportunity_id: sourceExec.strategy_opportunity_id ?? null,
        strategy_instance_id: sourceExec.strategy_instance_id ?? null,
      })
      onRefresh()
    } finally {
      setSyncingId(null)
    }
  }

  function renderExecLine(exec: Execution, source: 'Final' | 'TWS', pairedExec: Execution | null) {
    const canSync = pairedExec != null && needsSync(exec, pairedExec)
    const id = exec.account_executions_id

    return (
      <div
        key={`${source}-${id}`}
        className="flex items-center gap-2 py-1 px-1 text-xs border-b border-dashed last:border-b-0"
      >
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {source}
        </Badge>
        <span className="font-mono text-muted-foreground w-36 truncate">{fmtTime(exec.time)}</span>
        <span className="font-mono w-8">{exec.side === 'Buy' ? 'B' : 'S'}</span>
        <span className="font-mono w-8 text-right">{Math.abs(exec.qty)}</span>
        <span className="font-mono w-14 text-right">{fmtUsd(exec.price)}</span>
        {exec.strategy_instance_label && (
          <span className="text-muted-foreground truncate max-w-[100px]">
            {exec.strategy_instance_label}
          </span>
        )}
        {!exec.strategy_instance_label && exec.strategy_opportunity_name && (
          <span className="text-muted-foreground truncate max-w-[100px]">
            {exec.strategy_opportunity_name}
          </span>
        )}

        <span className="ml-auto flex items-center gap-1">
          {canSync && id != null && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              title={`Sync strategy from ${source === 'Final' ? 'TWS' : 'Final'}`}
              disabled={syncingId === id}
              onClick={() => handleSync(id, pairedExec!)}
            >
              <RefreshCw className={cn('h-3 w-3', syncingId === id && 'animate-spin')} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Edit" onClick={() => onEdit(exec)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" title="Link strategy" onClick={() => onLink(exec)}>
            <Link2 className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" title="Delete" onClick={() => onDelete(exec)}>
            <Trash2 className="h-3 w-3" />
          </Button>
          {showPoolOff && onClose && (
            <Button variant="ghost" size="sm" className="h-5 text-xs px-1.5" onClick={() => onClose(exec)}>
              Close
            </Button>
          )}
        </span>
      </div>
    )
  }

  const renderedTwsIds = new Set<number>()

  return (
    <div className="space-y-0 rounded border bg-muted/20 p-2">
      {finalExecs.map((f) => {
        const paired = findMatchingTws(f, twsExecs)
        if (paired?.account_executions_id != null) renderedTwsIds.add(paired.account_executions_id)
        return (
          <div key={`final-group-${f.account_executions_id}`}>
            {renderExecLine(f, 'Final', paired)}
            {paired && renderExecLine(paired, 'TWS', f)}
          </div>
        )
      })}
      {twsExecs
        .filter((t) => t.account_executions_id != null && !renderedTwsIds.has(t.account_executions_id!))
        .map((t) => {
          const paired = finalExecs.find((f) => findMatchingTws(f, [t]) != null) ?? null
          return renderExecLine(t, 'TWS', paired)
        })}
    </div>
  )
}
