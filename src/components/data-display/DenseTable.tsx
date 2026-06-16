import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  DenseDataTable,
  DenseTableRow,
  DenseTableCell,
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
}: {
  colSpan: number
  label: ReactNode
  onClick?: () => void
  variant?: 'default' | 'category'
  title?: string
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
}: {
  children: ReactNode
  className?: string
  tableClassName?: string
}) {
  return (
    <div className={cn('rounded-md border border-border bg-secondary/20 p-2', className)}>
      <DenseDataTable wrapClassName="border-0 rounded-none" tableClassName={tableClassName}>
        {children}
      </DenseDataTable>
    </div>
  )
}
