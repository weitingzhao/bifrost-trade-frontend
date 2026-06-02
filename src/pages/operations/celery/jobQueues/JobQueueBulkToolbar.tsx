import { Input } from '@/components/ui/input'
import { CeleryQueueIconButton } from '../CeleryQueueIconButton'
import type { ConfirmState, StatusFilter } from './jobQueueTypes'

export interface JobQueueBulkToolbarProps {
  statusFilter: StatusFilter
  opDisabled: boolean
  loading: boolean
  onRefresh: () => void
  onConfirm: (state: ConfirmState) => void
  keepLast: string
  onKeepLastChange: (v: string) => void
  trimPending: boolean
  onTrim: () => void
  bulkActions: {
    deletePending?: () => Promise<void>
    deleteRunning?: () => Promise<void>
    deleteDone?: () => Promise<void>
    deleteFailed?: () => Promise<void>
    retryFailed?: () => Promise<void>
  }
  trimLabel?: string
}

export function JobQueueBulkToolbar({
  statusFilter,
  opDisabled,
  loading,
  onRefresh,
  onConfirm,
  keepLast,
  onKeepLastChange,
  trimPending,
  onTrim,
  bulkActions,
  trimLabel = 'Trim jobs',
}: JobQueueBulkToolbarProps) {
  const show = (s: StatusFilter) => statusFilter === 'all' || statusFilter === s

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CeleryQueueIconButton
        variant="refresh"
        title="Refresh job list"
        aria-label="Refresh job list"
        disabled={loading}
        refreshing={loading}
        onClick={onRefresh}
      />
      <div className="flex-1" />
      {show('pending') && bulkActions.deletePending && (
        <CeleryQueueIconButton
          variant="delete-pending"
          title="Delete all jobs with status pending in this queue slice"
          aria-label="Delete all jobs with status pending in this queue slice"
          disabled={opDisabled}
          onClick={() => onConfirm({
            title: 'Delete pending jobs',
            message: 'Permanently delete all pending rows. Cannot be undone.',
            action: bulkActions.deletePending!,
          })}
        />
      )}
      {show('running') && bulkActions.deleteRunning && (
        <CeleryQueueIconButton
          variant="delete-running"
          title="Delete all jobs with status running in this queue slice"
          aria-label="Delete all jobs with status running in this queue slice"
          disabled={opDisabled}
          onClick={() => onConfirm({
            title: 'Delete running jobs',
            message: 'Removes PostgreSQL rows only. Worker may still execute.',
            action: bulkActions.deleteRunning!,
          })}
        />
      )}
      {show('done') && bulkActions.deleteDone && (
        <CeleryQueueIconButton
          variant="delete-done"
          title="Delete all jobs with status done in this queue slice"
          aria-label="Delete all jobs with status done in this queue slice"
          disabled={opDisabled}
          onClick={() => onConfirm({
            title: 'Delete done jobs',
            message: 'Permanently delete all done rows. Cannot be undone.',
            action: bulkActions.deleteDone!,
          })}
        />
      )}
      {show('failed') && bulkActions.deleteFailed && (
        <CeleryQueueIconButton
          variant="delete-failed"
          title="Delete all jobs with status failed in this queue slice"
          aria-label="Delete all jobs with status failed in this queue slice"
          disabled={opDisabled}
          onClick={() => onConfirm({
            title: 'Delete failed jobs',
            message: 'Permanently delete all failed rows. Cannot be undone.',
            action: bulkActions.deleteFailed!,
          })}
        />
      )}
      {show('failed') && bulkActions.retryFailed && (
        <CeleryQueueIconButton
          variant="refresh"
          title="Reset up to 500 oldest failed jobs to pending and re-queue Celery"
          aria-label="Reset failed jobs to pending and re-queue"
          disabled={opDisabled}
          onClick={() => onConfirm({
            title: 'Retry failed jobs',
            message: 'Reset up to 500 oldest failed jobs to pending and re-queue Celery.',
            confirmLabel: 'Retry',
            action: bulkActions.retryFailed!,
          })}
        />
      )}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Keep last</span>
        <Input
          type="number"
          className="h-7 w-20 text-xs"
          min={1}
          max={50000}
          value={keepLast}
          onChange={e => onKeepLastChange(e.target.value)}
          aria-label="Keep last N jobs when trimming"
        />
        <CeleryQueueIconButton
          variant="trim"
          title={trimLabel}
          aria-label={trimLabel}
          disabled={trimPending || opDisabled}
          onClick={onTrim}
        />
      </div>
    </div>
  )
}
