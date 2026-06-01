import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQueueLabel, brokerQueueKeyTitle } from '@/utils/celeryQueueLabels'
import type { CelerySupportedTaskRow } from '@/types/ops'

export function RegisteredCeleryTasksTable({ tasks }: { tasks: CelerySupportedTaskRow[] }) {
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.name.localeCompare(b.name)),
    [tasks],
  )

  if (sorted.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Registered Celery tasks</h4>
      <div className="overflow-x-auto rounded-md border">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Task name</TableHead>
              <TableHead>Task route default queue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(row => {
              const dq = row.task_route_default_queue ?? row.default_queue ?? '—'
              return (
                <TableRow key={row.name}>
                  <TableCell>
                    <code className="font-mono text-[11px] break-all">{row.name}</code>
                  </TableCell>
                  <TableCell>
                    {dq === '—' ? (
                      '—'
                    ) : (
                      <span title={brokerQueueKeyTitle(dq)}>{formatQueueLabel(dq)}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
