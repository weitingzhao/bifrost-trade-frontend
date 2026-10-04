import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableRow,
  DenseTableCell,
  denseTable,
} from '@bifrost/ui'

export {
  DenseDataTable,
  DenseTableHeader,
  DenseTableBody,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTableHead,
  DenseTableCell,
  DenseTableSubheadRow,
  DenseTableDetailRow,
} from '@bifrost/ui'

export function GroupHeaderRow({
  colSpan,
  label,
  onClick,
  variant = 'default',
  title,
  trailing,
}: {
  colSpan: number
  label: ReactNode
  onClick?: () => void
  variant?: 'default' | 'category'
  title?: string
  /**
   * Cells after the label, for a group header that carries its own totals
   * under the columns they sum. The caller narrows `colSpan` by as many cells
   * as it adds here, so the row still spans the table.
   */
  trailing?: ReactNode
}) {
  const isCategory = variant === 'category'

  const categoryLabel = (
    <span className="text-xs font-semibold text-entity-category">{label}</span>
  )

  const content = isCategory ? categoryLabel : label

  return (
    <tr className={cn(!isCategory && 'bg-secondary/50', onClick && !isCategory && 'hover:bg-secondary/70')}>
      <td
        colSpan={colSpan}
        className={cn(
          'px-[var(--table-cell-px)]',
          isCategory
            ? 'border-y border-border bg-secondary/60 py-1.5'
            : 'py-1.5 text-xs font-semibold text-muted-foreground',
          onClick && 'cursor-pointer',
          onClick && isCategory && 'hover:bg-secondary/80',
        )}
      >
        {onClick ? (
          <button
            type="button"
            className="w-full text-left transition-colors hover:text-foreground"
            onClick={onClick}
            title={title}
          >
            {content}
          </button>
        ) : (
          content
        )}
      </td>
      {trailing}
    </tr>
  )
}

export function GroupSubtotalRow({
  labelColSpan,
  label,
  children,
  className,
}: {
  labelColSpan: number
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <DenseTableRow
      className={cn(
        'border-t border-dashed border-border/60 bg-secondary/20 hover:bg-secondary/20',
        className,
      )}
    >
      <DenseTableCell
        colSpan={labelColSpan}
        className={cn('italic text-muted-foreground text-dense-meta')}
      >
        {label}
      </DenseTableCell>
      {children}
    </DenseTableRow>
  )
}

export function GrandTotalRow({
  labelColSpan,
  label,
  children,
  className,
}: {
  labelColSpan: number
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <DenseTableRow
      className={cn(
        'border-t-2 border-border bg-secondary/30 hover:bg-secondary/30 font-semibold',
        className,
      )}
    >
      <DenseTableCell colSpan={labelColSpan}>{label}</DenseTableCell>
      {children}
    </DenseTableRow>
  )
}

export function NestedDenseTable({
  children,
  className,
  tableClassName,
  hscroll = false,
}: {
  children: ReactNode
  className?: string
  tableClassName?: string
  /**
   * A wide sub-table as the design draws it (Rev .153, Positions L529): one
   * group (ink 4%, radius 12) that is itself the sideways scroller
   * (`data-sr-hscroll`), the table straight inside it — no card in a card. The
   * first column stays put; in a list scope it is clear at rest and turns glass
   * with its divider once the box scrolls (`data-sx`).
   */
  hscroll?: boolean
}) {
  if (hscroll) {
    return (
      <div data-sr-hscroll="" className={cn('dense-scroll-x min-w-0 border mat-card', className)}>
        <table className={cn(denseTable.table, tableClassName)}>{children}</table>
      </div>
    )
  }
  return (
    <div className={cn('border p-2 mat-card', className)}>
      <DenseDataTable wrapClassName="border-0 rounded-none" tableClassName={tableClassName}>
        {children}
      </DenseDataTable>
    </div>
  )
}
