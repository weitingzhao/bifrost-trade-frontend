import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { denseTable, denseTableCellPadding } from './denseTableClasses'
import { DenseTag } from './DenseTag'

const thBase = cn(
  denseTableCellPadding,
  'max-w-0 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  'border-b border-border bg-secondary/40 whitespace-nowrap overflow-hidden',
)
const tdBase = cn(
  denseTableCellPadding,
  'max-w-0 text-[length:var(--text-dense)] border-b border-border/60 align-middle overflow-hidden',
)

export function DenseDataTable({
  children,
  wrapClassName,
  tableClassName,
}: {
  children: ReactNode
  wrapClassName?: string
  tableClassName?: string
}) {
  return (
    <div className={cn('dense-scroll-x rounded-lg border border-border', wrapClassName)}>
      <table className={cn(denseTable.table, tableClassName)}>
        {children}
      </table>
    </div>
  )
}

export function DenseTableHeader({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <thead className={className}>{children}</thead>
}

export function DenseTableBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <tbody className={className}>{children}</tbody>
}

export function DenseTableHeadRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>
}

export function DenseTableRow({
  children,
  className,
  ...rest
}: {
  children: ReactNode
  className?: string
} & ComponentProps<'tr'>) {
  return (
    <tr className={cn('hover:bg-secondary/30 transition-colors', className)} {...rest}>
      {children}
    </tr>
  )
}

export function DenseTableHead({
  children,
  className,
  align,
  title,
  role,
  tabIndex,
  rowSpan,
  colSpan,
  scope,
  'aria-sort': ariaSort,
  'aria-label': ariaLabel,
  onClick,
  onKeyDown,
}: {
  children?: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
  title?: string
  role?: string
  tabIndex?: number
  rowSpan?: number
  colSpan?: number
  scope?: string
  'aria-sort'?: 'ascending' | 'descending' | 'none' | undefined
  'aria-label'?: string
  onClick?: (e: React.MouseEvent) => void
  onKeyDown?: (e: KeyboardEvent) => void
}) {
  return (
    <th
      className={cn(
        thBase,
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      title={title}
      role={role}
      tabIndex={tabIndex}
      rowSpan={rowSpan}
      colSpan={colSpan}
      scope={scope}
      aria-sort={ariaSort}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </th>
  )
}

export function DenseTableCell({
  children,
  className,
  title,
  colSpan,
}: {
  children?: ReactNode
  className?: string
  title?: string
  colSpan?: number
}) {
  return (
    <td className={cn(tdBase, className)} title={title} colSpan={colSpan}>
      {children}
    </td>
  )
}

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
  const content = isCategory ? (
    <DenseTag variant="category" size="pill">
      {label}
    </DenseTag>
  ) : (
    label
  )

  return (
    <tr className={cn('bg-secondary/50', onClick && 'hover:bg-secondary/70')}>
      <td
        colSpan={colSpan}
        className={cn(
          'px-[var(--table-cell-px)] py-1 text-xs font-semibold text-muted-foreground',
          onClick && 'cursor-pointer',
        )}
      >
        {onClick ? (
          <button
            type="button"
            className="w-full text-left hover:text-foreground transition-colors"
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
        className={cn('italic text-muted-foreground text-[length:var(--text-dense-meta)]')}
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
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-md border border-border bg-secondary/20 p-2', className)}>
      <DenseDataTable wrapClassName="border-0 rounded-none">{children}</DenseDataTable>
    </div>
  )
}

const numCell = 'text-right font-mono tabular-nums'

export function DenseTableSubheadRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DenseTableRow className={cn('bg-secondary/30 hover:bg-secondary/30 text-[length:var(--text-dense-meta)]', className)}>
      {children}
    </DenseTableRow>
  )
}

export function DenseTableDetailRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <DenseTableRow
      className={cn(
        'bg-secondary/15 text-[length:var(--text-dense-meta)] hover:bg-secondary/25 border-border/40',
        className,
      )}
    >
      {children}
    </DenseTableRow>
  )
}

export { numCell as denseTableNumCell }
