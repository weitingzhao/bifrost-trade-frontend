import { useState } from 'react'
import { Link2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { IconActionButton } from '@/components/data-display'
import { LEDGER_CONFIRM_SYNC, LEDGER_WRITE_DONE } from './ledgerWriteConfirm'

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
  error,
}: {
  onEdit?: () => void
  onLink?: () => void
  onLinkStock?: () => void
  onDelete?: () => void
  onSync?: () => void | Promise<void>
  syncDisabled?: boolean
  syncSpinning?: boolean
  error?: string | null
}) {
  const [syncStep, setSyncStep] = useState<'idle' | 'confirm' | 'done'>('idle')

  async function runSync() {
    if (!onSync) return
    if (syncStep === 'idle') {
      setSyncStep('confirm')
      return
    }
    if (syncStep === 'confirm') {
      try {
        await onSync()
        setSyncStep('done')
      } catch {
        setSyncStep('idle')
      }
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
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
          onClick={() => void runSync()}
          title={
            syncStep === 'confirm'
              ? `${LEDGER_CONFIRM_SYNC.title} ${LEDGER_CONFIRM_SYNC.body}`
              : syncStep === 'done'
                ? LEDGER_WRITE_DONE
                : 'Apply strategy opportunity and instance from the opposite-side fill with the same quantity in this group'
          }
          ariaLabel={
            syncStep === 'confirm'
              ? 'Confirm sync attribution from opposite leg'
              : 'Sync attribution from opposite leg'
          }
          size="dense"
          disabled={syncDisabled || syncStep === 'done'}
          className="text-link hover:text-link-hover"
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
      {syncStep === 'confirm' ? (
        <span className="max-w-[14rem] text-left text-dense-caption text-muted-foreground">
          {LEDGER_CONFIRM_SYNC.title} Click again to confirm.
        </span>
      ) : null}
      {syncStep === 'done' && !error ? (
        <span className="max-w-[14rem] text-left text-dense-caption text-[var(--color-success)]" role="status">
          {LEDGER_WRITE_DONE}
        </span>
      ) : null}
      {error ? (
        <span className="max-w-[14rem] text-left text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  )
}
