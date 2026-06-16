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
import type { BarsJob } from '@/types/ops'
import { CeleryQueueIconButton } from '../CeleryQueueIconButton'
import { CELERY_BARS_JOBS_COL_WIDTHS } from '../celeryUi'
import { fmtBarsResult, fmtTs, statusBadge } from './jobQueueFormat'

export interface BarsJobsTableProps {
  jobs: BarsJob[]
  opDisabled: boolean
  retryPending: boolean
  onRetry: (jobId: string) => void
}

export function BarsJobsTable({
  jobs,
  opDisabled,
  retryPending,
  onRetry,
}: BarsJobsTableProps) {
  if (jobs.length === 0) {
    return <p className={denseTable.emptyHint}>No jobs match the filter.</p>
  }

  return (
    <DenseDataTable>
      <colgroup>
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.id }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.symbol }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.period }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.status }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.result }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.updated }} />
        <col style={{ width: CELERY_BARS_JOBS_COL_WIDTHS.actions }} />
      </colgroup>
      <DenseTableHeader>
        <DenseTableHeadRow>
          <DenseTableHead>Job ID</DenseTableHead>
          <DenseTableHead>Symbol</DenseTableHead>
          <DenseTableHead>Period</DenseTableHead>
          <DenseTableHead>Status</DenseTableHead>
          <DenseTableHead className="max-w-40">Result</DenseTableHead>
          <DenseTableHead>Updated</DenseTableHead>
          <DenseTableHead className="w-20">Actions</DenseTableHead>
        </DenseTableHeadRow>
      </DenseTableHeader>
      <DenseTableBody>
        {jobs.map(row => (
          <DenseTableRow key={row.job_id}>
            <DenseTableCell className="font-mono text-dense-caption">{row.job_id}</DenseTableCell>
            <DenseTableCell className="font-medium">{row.symbol}</DenseTableCell>
            <DenseTableCell>{row.period}</DenseTableCell>
            <DenseTableCell>{statusBadge(row.status)}</DenseTableCell>
            <DenseTableCell className="max-w-40 truncate" title={fmtBarsResult(row)}>
              {fmtBarsResult(row)}
            </DenseTableCell>
            <DenseTableCell className={denseTable.mutedMeta}>{fmtTs(row.updated_ts)}</DenseTableCell>
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
        ))}
      </DenseTableBody>
    </DenseDataTable>
  )
}
