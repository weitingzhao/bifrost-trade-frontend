import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pnlColorClass } from '@/utils/dailyChange'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DenseDataTable({
  children,
  wrapClassName,
}: {
  children: ReactNode
  wrapClassName?: string
}) {
  return (
    <div className={cn('rounded-md border overflow-x-auto', wrapClassName)}>
      <Table className="text-xs [&_td]:py-1.5 [&_th]:h-8 [&_th]:py-1">{children}</Table>
    </div>
  )
}

export function DenseTableHeader(props: ComponentProps<typeof TableHeader>) {
  return <TableHeader {...props} />
}

export function DenseTableHeadRow(props: ComponentProps<typeof TableRow>) {
  return <TableRow {...props} />
}

export function DenseTableHead({
  align,
  className,
  ...props
}: ComponentProps<typeof TableHead> & { align?: 'left' | 'right' }) {
  return (
    <TableHead
      className={cn(align === 'right' && 'text-right', className)}
      {...props}
    />
  )
}

export function DenseTableBody(props: ComponentProps<typeof TableBody>) {
  return <TableBody {...props} />
}

export function DenseTableRow(props: ComponentProps<typeof TableRow>) {
  return <TableRow {...props} />
}

export function DenseTableCell({ className, ...props }: ComponentProps<typeof TableCell>) {
  return <TableCell className={cn('tabular-nums', className)} {...props} />
}

export function GroupHeaderRow({
  colSpan,
  label,
}: {
  colSpan: number
  label: ReactNode
}) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell colSpan={colSpan} className="py-1.5 text-xs font-semibold text-foreground">
        {label}
      </TableCell>
    </TableRow>
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
      className={cn(
        'font-semibold text-left hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm',
        variant === 'coverage' ? 'text-[var(--color-link)]' : 'text-primary',
      )}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {label}
    </button>
  )
}

export function PnlCell({
  dollar,
  pct,
  formatDollar,
  formatPct,
}: {
  dollar: number | null | undefined
  pct: number | null | undefined
  formatDollar: (n: number | null | undefined) => string
  formatPct: (n: number | null | undefined) => string
}) {
  return (
    <div className="flex flex-col items-end gap-0.5 leading-tight">
      <span className={cn('font-medium', pnlColorClass(dollar))}>{formatDollar(dollar)}</span>
      <span className={cn('text-[0.85em]', pnlColorClass(pct))}>{formatPct(pct)}</span>
    </div>
  )
}

export function InlinePnl({
  value,
  children,
}: {
  value: number | null | undefined
  children: ReactNode
}) {
  return <span className={cn('font-medium tabular-nums', pnlColorClass(value))}>{children}</span>
}
