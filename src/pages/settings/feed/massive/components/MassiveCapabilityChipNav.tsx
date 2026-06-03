import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CapabilityStatusDot } from '@/pages/settings/feed/massive/components/CapabilityStatusDot'
import {
  CAPABILITY_GROUP_LABELS,
  type CapabilityGroup,
  type ChecklistRow,
  type EffectiveServiceStatus,
} from '@/pages/settings/feed/massive/checklist/types'
import { shortServiceLabel } from '@/pages/settings/feed/massive/checklist/displayHelpers'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function MassiveCapabilityChipNav({
  groupedRows,
  rowEffective,
  onChipClick,
  queueSummary,
}: {
  groupedRows: { group: CapabilityGroup; rows: ChecklistRow[] }[]
  rowEffective: (row: ChecklistRow) => EffectiveServiceStatus
  onChipClick: (rowId: string) => void
  queueSummary?: ReactNode
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<CapabilityGroup, boolean>>({
    rest: true,
    ws: true,
    flat: true,
    project: true,
  })

  const toggleGroup = (g: CapabilityGroup) => {
    setExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }))
  }

  return (
    <Card variant="elevated" className="sticky top-0 z-10">
      <CardContent className="space-y-3 px-4 py-3">
        {queueSummary ? <div className="text-xs text-muted-foreground">{queueSummary}</div> : null}
        <p className="text-xs text-muted-foreground">
          Capabilities grouped by delivery channel. Click a group header to show or hide chips; click a chip to jump
          and expand that section.
        </p>
        {groupedRows.map(({ group, rows }) => (
          <div key={group} className="space-y-2">
            <button
              type="button"
              className="flex w-full items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              onClick={() => toggleGroup(group)}
              aria-expanded={expandedGroups[group]}
            >
              <ChevronDown
                className={cn('size-3.5 transition-transform', expandedGroups[group] && 'rotate-180')}
                aria-hidden
              />
              {CAPABILITY_GROUP_LABELS[group]}
            </button>
            {expandedGroups[group] ? (
              <div className="flex flex-wrap gap-1.5">
                {rows.map(row => (
                  <Button
                    key={row.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs font-normal"
                    onClick={() => onChipClick(row.id)}
                  >
                    <CapabilityStatusDot status={rowEffective(row)} />
                    {shortServiceLabel(row)}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function MassiveQueueSummaryLine({
  workerCount,
  activeJobCount,
}: {
  workerCount: number
  activeJobCount: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="font-medium text-foreground">Queue</span>
      <span>
        Workers: <strong>{workerCount}</strong>
      </span>
      {activeJobCount > 0 ? (
        <span>
          Active jobs: <strong>{activeJobCount > 99 ? '99+' : activeJobCount}</strong>
        </span>
      ) : null}
      <Link to="/operations/celery" className="text-primary hover:underline">
        Celery queue details
      </Link>
      {workerCount === 0 ? (
        <span className="text-amber-700 dark:text-amber-400">
          No workers — start a worker with -Q options_massive (or default queues including options_massive*)
        </span>
      ) : null}
    </div>
  )
}
