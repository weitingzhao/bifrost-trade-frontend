import { cn } from '@/lib/utils'

export const ledgerPagination = {
  bar: 'flex items-center gap-1.5 px-1 pt-2 pb-0.5 text-[0.8rem]',
  btn: cn(
    'inline-flex h-[1.85rem] w-[1.85rem] items-center justify-center rounded',
    'border border-border bg-transparent text-muted-foreground',
    'text-[0.85rem] font-semibold leading-none',
    'hover:bg-muted/40 hover:text-foreground',
    'disabled:cursor-not-allowed disabled:opacity-30',
  ),
  info: 'min-w-14 px-1 text-center text-muted-foreground text-[0.8rem]',
  total: 'text-[0.75rem] opacity-70',
} as const

export function LedgerPaginationBar({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null
  return (
    <div className={ledgerPagination.bar} role="navigation" aria-label="Table pagination">
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => onPage(1)}
        disabled={page === 1}
        aria-label="First page"
      >
        «
      </button>
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className={ledgerPagination.info}>
        {page} / {totalPages}
        <span className={ledgerPagination.total}> ({total})</span>
      </span>
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => onPage(totalPages)}
        disabled={page === totalPages}
        aria-label="Last page"
      >
        »
      </button>
    </div>
  )
}
