import { Link2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'

export function LedgerOptActionButtons({
  onEdit,
  onLink,
  onDelete,
  onSync,
  syncDisabled,
  syncSpinning,
}: {
  onEdit?: () => void
  onLink?: () => void
  onDelete?: () => void
  onSync?: () => void
  syncDisabled?: boolean
  syncSpinning?: boolean
}) {
  return (
    <span className="inline-flex items-center justify-end gap-0.5">
      {onEdit && (
        <IconActionButton
          onClick={() => onEdit()}
          title="Edit"
          ariaLabel="Edit execution"
          size="dense"
        >
          <Pencil className="h-3.5 w-3.5" />
        </IconActionButton>
      )}
      {onLink && (
        <IconActionButton
          onClick={() => onLink()}
          title="Assign strategy opportunity and instance"
          ariaLabel="Link strategy"
          size="dense"
        >
          <Link2 className="h-3.5 w-3.5" />
        </IconActionButton>
      )}
      {onSync && (
        <IconActionButton
          onClick={() => onSync()}
          title="Apply strategy opportunity and instance from the opposite-side fill with the same quantity in this group"
          ariaLabel="Sync attribution from opposite leg"
          size="dense"
          disabled={syncDisabled}
          className="text-blue-500 hover:text-blue-600"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncSpinning ? 'animate-spin' : ''}`} />
        </IconActionButton>
      )}
      {onDelete && (
        <IconActionButton
          onClick={() => onDelete()}
          title="Delete"
          ariaLabel="Delete execution"
          tone="danger"
          size="dense"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </IconActionButton>
      )}
    </span>
  )
}
