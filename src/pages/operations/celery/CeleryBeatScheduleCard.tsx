import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTable,
} from '@/components/data-display'
import { CELERY_BEAT_SCHEDULE_COL_WIDTHS } from './celeryUi'
import { useMassiveCeleryBeat } from '@/hooks/useOpsData'

function fmtCrontab(c: Record<string, string | number>): string {
  const h = c.hour
  const m = c.minute ?? 0
  return `hour=${String(h)} minute=${String(m)}`
}

export function CeleryBeatScheduleCard() {
  const { data, isLoading, isError, error } = useMassiveCeleryBeat()

  const tz = data?.timezone?.trim() || 'UTC'
  const entries = data?.entries ?? []

  return (
    <Card variant="elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            Scheduled Celery Beat
            <InfoTooltip text="Cron-style beat entries from Research API. Distinct from capabilities beat_tasks on the Scheduled Jobs tab." />
          </span>
          <span className="text-xs font-normal text-muted-foreground shrink-0">Timezone: {tz}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-2">
            <Skeleton className="h-6 rounded" />
            <Skeleton className="h-6 rounded" />
            <Skeleton className="h-6 rounded" />
          </div>
        ) : isError ? (
          <div className="px-4 pb-4">
            <Alert variant="destructive">
              <AlertDescription>{(error as Error).message}</AlertDescription>
            </Alert>
          </div>
        ) : entries.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">
            No Beat schedule returned from Research API.
          </p>
        ) : (
          <DenseDataTable wrapClassName="rounded-none border-0">
            <colgroup>
              <col style={{ width: CELERY_BEAT_SCHEDULE_COL_WIDTHS.label }} />
              <col style={{ width: CELERY_BEAT_SCHEDULE_COL_WIDTHS.schedule }} />
              <col style={{ width: CELERY_BEAT_SCHEDULE_COL_WIDTHS.task }} />
            </colgroup>
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Label</DenseTableHead>
                <DenseTableHead>Schedule (UTC)</DenseTableHead>
                <DenseTableHead>Task</DenseTableHead>
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {entries.map(e => (
                <DenseTableRow key={e.name}>
                  <DenseTableCell>{e.label}</DenseTableCell>
                  <DenseTableCell className="font-mono">{fmtCrontab(e.crontab)}</DenseTableCell>
                  <DenseTableCell className={denseTable.mutedMeta}>{e.task}</DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
        )}
      </CardContent>
    </Card>
  )
}
