import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { MassiveStatusResponse } from '@/types/optionDiscovery'
import {
  CAPABILITY_GROUP_LABELS,
  type ChecklistRow,
  type CapabilityGroup,
  type EffectiveServiceStatus,
} from '../checklist/types'
import { CapabilityStatusDot } from './CapabilityStatusDot'

export interface MassiveOverviewColumnProps {
  title: string
  grouped: { group: CapabilityGroup; rows: ChecklistRow[] }[]
  openTo: string
  openLabel: string
  configured: boolean
  massiveStatus: MassiveStatusResponse | null | undefined
  tierOkForRow: (row: ChecklistRow, status: MassiveStatusResponse | null, configured: boolean) => boolean
  tradesOkForRow: (row: ChecklistRow, status: MassiveStatusResponse | null) => boolean
  effectiveStatus: (
    row: ChecklistRow,
    configured: boolean,
    tierOk: boolean,
    tradesOk: boolean,
  ) => EffectiveServiceStatus
  shortLabel: (row: ChecklistRow) => string
}

export function MassiveOverviewColumn({
  title,
  grouped,
  openTo,
  openLabel,
  configured,
  massiveStatus,
  tierOkForRow,
  tradesOkForRow,
  effectiveStatus,
  shortLabel,
}: MassiveOverviewColumnProps) {
  const rowCount = grouped.reduce((n, g) => n + g.rows.length, 0)

  return (
    <Card variant="elevated" className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {rowCount} capabilities across {grouped.length} channel group(s).
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 px-4 pt-0">
        <ul className="space-y-4">
          {grouped.map(({ group, rows }) => (
            <li key={group}>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CAPABILITY_GROUP_LABELS[group]}
              </div>
              <ul className="space-y-1">
                {rows.map(row => {
                  const tierOk = tierOkForRow(row, massiveStatus ?? null, configured)
                  const tradesOk = tradesOkForRow(row, massiveStatus ?? null)
                  const eff = effectiveStatus(row, configured, tierOk, tradesOk)
                  return (
                    <li key={row.id} className="flex items-center gap-2 text-sm">
                      <CapabilityStatusDot status={eff} />
                      <span className="min-w-0 truncate">{shortLabel(row)}</span>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t border-border px-4 py-3">
        <Button variant="outline" size="sm" asChild>
          <Link to={openTo}>{openLabel}</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
