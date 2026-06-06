import { Link2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'

function LinkStockFillsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 18h6v-6H3v6zm9-12h6V3h-6v3zM3 8h6V3H3v5zm9 10h6v-6h-6v6z" />
      <path d="M14 9h2M9 14v2" />
    </svg>
  )
}

export function LedgerOptActionButtons({
  onEdit,
  onLink,
  onLinkStock,
  onDelete,
  onSync,
  syncDisabled,
  syncSpinning,
}: {
  onEdit?: () => void
  onLink?: () => void
  onLinkStock?: () => void
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
      {onLinkStock && (
        <IconActionButton
          onClick={() => onLinkStock()}
          title="Link underlying stock fills (exercise or assignment)"
          ariaLabel="Link stock fills"
          size="dense"
        >
          <LinkStockFillsIcon />
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
