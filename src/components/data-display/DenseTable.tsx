import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { denseTableCellPadding } from './denseTableClasses'

const thBase = cn(
  denseTableCellPadding,
  'text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
  'border-b border-border bg-secondary/40 whitespace-nowrap',
)
const tdBase = cn(
  denseTableCellPadding,
  'text-[length:var(--text-dense)] border-b border-border/60 align-middle',
)

export function DenseDataTable({
  children,
  wrapClassName,
}: {
  children: ReactNode
  wrapClassName?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', wrapClassName)}>
      <table className="w-full min-w-[320px] border-collapse text-[length:var(--text-dense)]">
        {children}
      </table>
    </div>
  )
}

export function DenseTableHeader({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

export function DenseTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
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
}: {
  colSpan: number
  label: ReactNode
}) {
  return (
    <tr className="bg-secondary/50">
      <td
        colSpan={colSpan}
        className="px-[var(--table-cell-px)] py-1 text-xs font-semibold text-muted-foreground"
      >
        {label}
      </td>
    </tr>
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
