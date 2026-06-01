import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'

const thBase =
  'px-2 py-1.5 text-left text-xs font-semibold text-muted-foreground border-b border-border bg-secondary/40 whitespace-nowrap'
const tdBase =
  'px-2 py-1.5 text-xs border-b border-border/60 align-middle'

export function DenseDataTable({
  children,
  wrapClassName,
}: {
  children: ReactNode
  wrapClassName?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', wrapClassName)}>
      <table className="w-full min-w-[320px] border-collapse text-[0.8125rem]">{children}</table>
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

export function DenseTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <tr className={cn('hover:bg-secondary/30 transition-colors', className)}>{children}</tr>
  )
}

export function DenseTableHead({
  children,
  className,
  align,
  title,
  role,
  tabIndex,
  'aria-sort': ariaSort,
  onClick,
  onKeyDown,
}: {
  children: ReactNode
  className?: string
  align?: 'left' | 'right'
  title?: string
  role?: string
  tabIndex?: number
  'aria-sort'?: 'ascending' | 'descending' | 'none' | undefined
  onClick?: () => void
  onKeyDown?: (e: KeyboardEvent) => void
}) {
  return (
    <th
      className={cn(thBase, align === 'right' && 'text-right', className)}
      title={title}
      role={role}
      tabIndex={tabIndex}
      aria-sort={ariaSort}
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
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <td className={cn(tdBase, className)} title={title}>
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
      <td colSpan={colSpan} className="px-2 py-1 text-xs font-semibold text-muted-foreground">
        {label}
      </td>
    </tr>
  )
}

export function InlinePnl({
  value,
  children,
}: {
  value: number | null | undefined
  children: ReactNode
}) {
  return <span className={pnlColorClass(value)}>{children}</span>
}

export function PnlCell({
  dollar,
  pct,
  formatDollar,
  formatPct,
}: {
  dollar: number | null | undefined
  pct: number | null | undefined
  formatDollar: (v: number | null | undefined) => string
  formatPct: (v: number | null | undefined) => string
}) {
  return (
    <div className="text-right leading-snug">
      <div className={pnlColorClass(dollar)}>{formatDollar(dollar)}</div>
      <div className={cn('text-[0.72rem]', pnlColorClass(pct))}>{formatPct(pct)}</div>
    </div>
  )
}

export function SymbolLinkButton({
  label,
  onClick,
  ariaLabel,
  variant = 'stock',
}: {
  label: string
  onClick: () => void
  ariaLabel: string
  variant?: 'stock' | 'coverage'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'font-semibold text-left hover:underline',
        variant === 'coverage'
          ? 'text-sky-600 dark:text-sky-400'
          : 'text-primary',
      )}
    >
      {label}
    </button>
  )
}
