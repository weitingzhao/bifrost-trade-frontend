import { ledgerPagination } from './ledgerPaginationClasses'

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
