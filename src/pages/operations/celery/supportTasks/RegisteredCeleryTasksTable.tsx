import { useMemo } from 'react'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
} from '@/components/data-display'
import { formatQueueLabel, brokerQueueKeyTitle } from '@/utils/celeryQueueLabels'
import type { CelerySupportedTaskRow } from '@/types/ops'
import { CELERY_REGISTERED_TASKS_COL_WIDTHS, celerySectionTitleClass } from '../celeryUi'

export function RegisteredCeleryTasksTable({ tasks }: { tasks: CelerySupportedTaskRow[] }) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name)),
    [tasks],
  )

  if (sorted.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className={celerySectionTitleClass}>Registered Celery tasks</h4>
      <DenseDataTable>
        <colgroup>
          <col style={{ width: CELERY_REGISTERED_TASKS_COL_WIDTHS.task }} />
          <col style={{ width: CELERY_REGISTERED_TASKS_COL_WIDTHS.queue }} />
        </colgroup>
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Task name</DenseTableHead>
            <DenseTableHead>Task route default queue</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {sorted.map(row => {
            const dq = row.task_route_default_queue ?? row.default_queue ?? '—'
            return (
              <DenseTableRow key={row.name}>
                <DenseTableCell>
                  <code className="font-mono text-dense-meta break-all">{row.name}</code>
                </DenseTableCell>
                <DenseTableCell>
                  {dq === '—' ? (
                    '—'
                  ) : (
                    <span title={brokerQueueKeyTitle(dq)}>{formatQueueLabel(dq)}</span>
                  )}
                </DenseTableCell>
              </DenseTableRow>
            )
          })}
        </DenseTableBody>
      </DenseDataTable>
    </div>
  )
}
