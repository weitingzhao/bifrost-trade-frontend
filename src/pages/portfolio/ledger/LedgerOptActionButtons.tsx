import { Link2, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import styles from './ledgerStyles'

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
    <span className={styles.execRowActions}>
      {onEdit && (
        <button type="button" className={styles.iconBtn} onClick={onEdit} title="Edit" aria-label="Edit execution">
          <Pencil className="size-4" />
        </button>
      )}
      {onLink && (
        <button
          type="button"
          className={styles.iconBtn}
          onClick={onLink}
          title="Assign strategy opportunity and instance"
          aria-label="Link strategy"
        >
          <Link2 className="size-4" />
        </button>
      )}
      {onSync && (
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnSync}`}
          onClick={onSync}
          disabled={syncDisabled}
          title="Apply strategy opportunity and instance from the opposite-side fill with the same quantity in this group"
          aria-label="Sync attribution from opposite leg"
        >
          <RefreshCw className={`size-4 ${syncSpinning ? 'animate-spin' : ''}`} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          onClick={onDelete}
          title="Delete"
          aria-label="Delete execution"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </span>
  )
}

