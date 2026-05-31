import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Execution } from '@/types/positions'
import { StkFlatTable } from './StkFlatTable'
import { fmtCcy, fmtPrice, pnlClass, PAGE_SIZE } from './types'
import type { StkPositionGroup, StkSortCol } from './types'

export function StkTabContent({
  executions, positionGroups, groupByPosition, stkSort, toggleStkSort,
  page, setPage, onEdit, onDelete, onAddJournal,
}: {
  executions: Execution[]
  positionGroups: StkPositionGroup[] | null
  groupByPosition: boolean
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
  page: number
  setPage: (p: number) => void
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
}) {
  const [posGroupExpanded, setPosGroupExpanded] = useState<Set<string>>(new Set())

  function togglePosGroup(key: string) {
    setPosGroupExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (groupByPosition && positionGroups) {
    return (
      <div className="space-y-2">
        {positionGroups.length === 0 && (
          <p className="text-xs text-muted-foreground">No executions found.</p>
        )}
        {positionGroups.map(pg => {
          const exp = posGroupExpanded.has(pg.key)
          const totalPnl = pg.realized + (pg.unrealized ?? 0)
          return (
            <div key={pg.key} className="rounded border">
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-xs"
                onClick={() => togglePosGroup(pg.key)}
              >
                {exp ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                <span className="font-medium w-16">{pg.symbol}</span>
                <span className="text-muted-foreground">{pg.accountId}</span>
                <span className="text-muted-foreground ml-2">{pg.fills.length} fills</span>
                {pg.snap && Math.abs(pg.snap.position) > 1e-9 && (
                  <span className="text-muted-foreground ml-2">
                    Pos: {pg.snap.position} @ {fmtPrice(pg.snap.avgCost)}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-3">
                  <span>R: <span className={cn('font-mono', pnlClass(pg.realized))}>{fmtCcy(pg.realized)}</span></span>
                  {pg.unrealized != null && (
                    <span>U: <span className={cn('font-mono', pnlClass(pg.unrealized))}>{fmtCcy(pg.unrealized)}</span></span>
                  )}
                  {pg.unrealized != null && (
                    <span className="font-semibold">T: <span className={cn('font-mono', pnlClass(totalPnl))}>{fmtCcy(totalPnl)}</span></span>
                  )}
                  <Button
                    variant="ghost" size="sm"
                    className="h-5 text-[10px] px-1 text-blue-500 ml-1"
                    onClick={ev => { ev.stopPropagation(); onAddJournal(pg.accountId, pg.symbol) }}
                  >+J</Button>
                </div>
              </div>
              {exp && (
                <div className="border-t">
                  <StkFlatTable executions={pg.fills} stkSort={stkSort} toggleStkSort={toggleStkSort} onEdit={onEdit} onDelete={onDelete} onAddJournal={onAddJournal} compact />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(executions.length / PAGE_SIZE))
  const pageExecs = executions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-2">
      <StkFlatTable executions={pageExecs} stkSort={stkSort} toggleStkSort={toggleStkSort} onEdit={onEdit} onDelete={onDelete} onAddJournal={onAddJournal} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{executions.length} executions</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
            <span className="px-2 leading-6">{page + 1} / {totalPages}</span>
            <Button size="sm" variant="outline" className="h-6 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
