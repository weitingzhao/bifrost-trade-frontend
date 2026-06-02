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
import type { MassiveJobApiRow } from '@/types/ops'
import { CeleryQueueIconButton } from '../CeleryQueueIconButton'
import { CELERY_MASSIVE_JOBS_COL_WIDTHS } from '../celeryUi'
import { fmtMassiveResult, fmtMassiveResultDetail, fmtTs, statusBadge } from './jobQueueFormat'

export interface MassiveJobsTableProps {
  jobs: MassiveJobApiRow[]
  opDisabled: boolean
  retryPending: boolean
  onRetry: (jobId: string) => void
}

export function MassiveJobsTable({
  jobs,
  opDisabled,
  retryPending,
  onRetry,
}: MassiveJobsTableProps) {
  if (jobs.length === 0) {
    return <p className={denseTable.emptyHint}>No jobs match the filter.</p>
  }

  return (
    <DenseDataTable>
      <colgroup>
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.id }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.kind }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.goal }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.status }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.created }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.result }} />
        <col style={{ width: CELERY_MASSIVE_JOBS_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>ID</DenseTableHead>
          <DenseTableHead>Kind</DenseTableHead>
          <DenseTableHead>Goal</DenseTableHead>
          <DenseTableHead>Status</DenseTableHead>
          <DenseTableHead>Created</DenseTableHead>
          <DenseTableHead>Result</DenseTableHead>
          <DenseTableHead className="w-20">Actions</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {jobs.map(row => {
          const primary = fmtMassiveResult(row)
          const detail = fmtMassiveResultDetail(row)
          return (
            <DenseTableRow key={row.job_id}>
              <DenseTableCell className="font-mono text-[10px]">{row.job_id}</DenseTableCell>
              <DenseTableCell>{row.kind ?? '—'}</DenseTableCell>
              <DenseTableCell className="max-w-48 truncate" title={row.goal ?? undefined}>
                {row.goal ?? '—'}
              </DenseTableCell>
              <DenseTableCell>{statusBadge(row.status)}</DenseTableCell>
              <DenseTableCell className={denseTable.mutedMeta}>{fmtTs(row.created_ts)}</DenseTableCell>
              <DenseTableCell className="max-w-52" title={detail ? `${primary}\n${detail}` : primary}>
                <div>{primary}</div>
                {detail && <div className={denseTable.mutedMeta}>{detail}</div>}
              </DenseTableCell>
              <DenseTableCell>
                {(row.status || '').toLowerCase() === 'failed' ? (
                  <CeleryQueueIconButton
                    variant="refresh"
                    title={`Retry job ${row.job_id}`}
                    aria-label={`Retry job ${row.job_id}`}
                    disabled={retryPending || opDisabled}
                    onClick={() => onRetry(row.job_id)}
                  />
                ) : (
                  <span className={denseTable.mutedMeta}>—</span>
                )}
              </DenseTableCell>
            </DenseTableRow>
          )
        })}
      </DenseTableBody>
    </DenseDataTable>
  )
}
