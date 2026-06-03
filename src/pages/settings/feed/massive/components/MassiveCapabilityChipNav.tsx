import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CapabilityStatusDot } from '@/pages/settings/feed/massive/components/CapabilityStatusDot'
import {
  CAPABILITY_GROUP_LABELS,
  type CapabilityGroup,
  type ChecklistRow,
} from '@/pages/settings/feed/massive/checklist/types'
import { groupedStockChecklistRows } from '@/pages/settings/feed/massive/checklist/stockStatus'
import { shortServiceLabel } from '@/pages/settings/feed/massive/checklist/stockStatus'
import type { EffectiveServiceStatus } from '@/pages/settings/feed/massive/checklist/types'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function MassiveCapabilityChipNav({
  rowEffective,
  onChipClick,
}: {
  rowEffective: (row: ChecklistRow) => EffectiveServiceStatus
  onChipClick: (rowId: string) => void
}) {
  const grouped = groupedStockChecklistRows()
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
        <p className="text-xs text-muted-foreground">
          Capabilities grouped by delivery channel. Click a group header to show or hide chips; click a chip to jump
          and expand that section.
        </p>
        {grouped.map(({ group, rows }) => (
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
