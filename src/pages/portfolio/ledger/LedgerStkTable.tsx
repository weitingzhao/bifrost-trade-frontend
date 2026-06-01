import { FileText, Pencil, Trash2 } from 'lucide-react'
import type { Execution } from '@/types/positions'
import { stkContractKey } from '@/utils/ledger/stkBuckets'
import {
  getExecCategory,
  stkAccountContractKey,
  stkSideLabel,
} from '@/utils/ledger/stkDisplay'
import { fmtUsd } from '@/lib/format'
import { ExecSourceBadge } from './ExecSourceBadge'
import {
  LedgerStkGroupBasisPct,
  LedgerStkGroupPositionSnap,
  LedgerStkNotionalCell,
  LedgerStkRowRealizedCell,
  LedgerStkSortableTh,
  LedgerStkTimeCells,
  LedgerStkUrPnlGroupInline,
} from './LedgerStkCells'
import { PAGE_SIZE } from './ledgerConstants'
import type { MainTab, StkPositionGroup, StkSortCol } from './ledgerTypes'
import styles from './ledgerStyles'

function sortPositionGroups(
  groups: StkPositionGroup[],
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' },
): StkPositionGroup[] {
  const mult = stkSort.dir === 'asc' ? 1 : -1
  return [...groups].sort((a, b) => {
    if (stkSort.col === 'realized_pnl') {
      return mult * (a.realized - b.realized)
    }
    const latestA = Math.max(...a.fills.map(e => e.time ?? 0), 0)
    const latestB = Math.max(...b.fills.map(e => e.time ?? 0), 0)
    if (latestA !== latestB) return mult * (latestA - latestB)
    return a.symbol.localeCompare(b.symbol) || a.accountId.localeCompare(b.accountId)
  })
}

function StkRowActions({
  ex,
  onEdit,
  onDelete,
}: {
  ex: Execution
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  if (ex.account_executions_id == null) return <td>—</td>
  return (
    <td>
      <span className={styles.execRowActions}>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => onEdit(ex)}
          title="Edit"
          aria-label="Edit execution"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
          onClick={() => onDelete(ex)}
          title="Delete"
          aria-label="Delete execution"
        >
          <Trash2 className="size-4" />
        </button>
      </span>
    </td>
  )
}

function StkFillRow({
  ex,
  showSymbolCol,
  showPills,
  catMap,
  onEdit,
  onDelete,
}: {
  ex: Execution
  showSymbolCol: boolean
  showPills: boolean
  catMap: Map<string, string>
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
}) {
  const category = getExecCategory(ex, catMap)
  return (
    <tr>
      <LedgerStkTimeCells ex={ex} />
      {showSymbolCol && (
        <td>
          {showPills ? (
            <span className={styles.stkCellSymbol}>{ex.symbol ?? '—'}</span>
          ) : (
            (ex.symbol ?? '—')
          )}
        </td>
      )}
      <td>{ex.account_id ?? '—'}</td>
      <td>
        {showPills ? (
          <span className={styles.stkCellCategory}>{category}</span>
        ) : (
          category
        )}
      </td>
      <td>{stkSideLabel(ex)}</td>
      <td>{ex.quantity != null ? Number(ex.quantity ?? ex.qty) : '—'}</td>
      <td>{fmtUsd(ex.price)}</td>
      <LedgerStkNotionalCell ex={ex} />
      <LedgerStkRowRealizedCell realized={Number(ex.realized_pnl) || 0} />
      <td>{fmtUsd(ex.commission ?? 0)}</td>
      <td>
        <ExecSourceBadge source={ex.source} />
      </td>
      <StkRowActions ex={ex} onEdit={onEdit} onDelete={onDelete} />
    </tr>
  )
}

function StkTableHead({
  showSymbolCol,
  stkSort,
  toggleStkSort,
}: {
  showSymbolCol: boolean
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
}) {
  return (
    <thead>
      <tr>
        <th>Time</th>
        <LedgerStkSortableTh
          label="Trade date"
          active={stkSort.col === 'trade_date'}
          dir={stkSort.dir}
          onClick={() => toggleStkSort('trade_date')}
        />
        {showSymbolCol ? <th>Symbol</th> : null}
        <th>Account</th>
        <th>Category</th>
        <th>Side</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Notional</th>
        <LedgerStkSortableTh
          label="Realized"
          active={stkSort.col === 'realized_pnl'}
          dir={stkSort.dir}
          onClick={() => toggleStkSort('realized_pnl')}
          tooltip="Realized on this fill (IB commission report). Zero shows as dash. Unrealized is position-level: see Group U/R PnL when grouped, or Total U in the summary."
        />
        <th>Comm.</th>
        <th>Source</th>
        <th>Actions</th>
      </tr>
    </thead>
  )
}

function LedgerStkPagination({
  page,
  totalPages,
  totalItems,
  setPage,
}: {
  page: number
  totalPages: number
  totalItems: number
  setPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className={styles.stkPaginationBar} role="navigation" aria-label="Stocks pagination">
      <button
        type="button"
        className={styles.stkPaginationBtn}
        onClick={() => setPage(0)}
        disabled={page === 0}
        aria-label="First page"
      >
        «
      </button>
      <button
        type="button"
        className={styles.stkPaginationBtn}
        onClick={() => setPage(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className={styles.stkPaginationInfo}>
        {page + 1} / {totalPages}
        <span className={styles.stkPaginationTotal}> ({totalItems})</span>
      </span>
      <button
        type="button"
        className={styles.stkPaginationBtn}
        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
      >
        ›
      </button>
      <button
        type="button"
        className={styles.stkPaginationBtn}
        onClick={() => setPage(totalPages - 1)}
        disabled={page >= totalPages - 1}
        aria-label="Last page"
      >
        »
      </button>
    </div>
  )
}

export function LedgerStkTable({
  executions,
  positionGroups,
  groupByPosition,
  stkSort,
  toggleStkSort,
  page,
  setPage,
  activeTab,
  catMap,
  stkUnrealizedByKey,
  onEdit,
  onDelete,
  onAddJournal,
}: {
  executions: Execution[]
  positionGroups: StkPositionGroup[] | null
  groupByPosition: boolean
  stkSort: { col: StkSortCol; dir: 'asc' | 'desc' }
  toggleStkSort: (col: StkSortCol) => void
  page: number
  setPage: (p: number) => void
  activeTab: MainTab
  catMap: Map<string, string>
  stkUnrealizedByKey: Map<string, number | null>
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
}) {
  const showPills = activeTab === 'stocks'
  const showSymbolCol = !groupByPosition

  if (groupByPosition && positionGroups) {
    const sortedGroups = sortPositionGroups(positionGroups, stkSort)
    const totalPages = Math.max(1, Math.ceil(sortedGroups.length / PAGE_SIZE))
    const pageGroups = sortedGroups.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    if (sortedGroups.length === 0) {
      return <p className={styles.sectionHint}>No executions found.</p>
    }

    return (
      <>
        <div className={styles.stkTableWrap}>
          <table className={styles.stkTable}>
            <StkTableHead
              showSymbolCol={false}
              stkSort={stkSort}
              toggleStkSort={toggleStkSort}
            />
            <tbody>
              {pageGroups.map(pg => {
                const category =
                  catMap.get(stkContractKey(pg.symbol, pg.accountId)) ?? '—'
                const uKey = `${pg.accountId}|${pg.fills[0]?.contract_key?.trim() ?? `${pg.symbol}|STK|||`}`
                const groupUnrealized = stkUnrealizedByKey.get(uKey) ?? pg.unrealized

                return (
                  <GroupBlock
                    key={pg.key}
                    pg={pg}
                    category={category}
                    groupUnrealized={groupUnrealized}
                    showPills={showPills}
                    showJournal={showPills}
                    catMap={catMap}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddJournal={onAddJournal}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
        <LedgerStkPagination
          page={page}
          totalPages={totalPages}
          totalItems={sortedGroups.length}
          setPage={setPage}
        />
      </>
    )
  }

  const totalPages = Math.max(1, Math.ceil(executions.length / PAGE_SIZE))
  const pageExecs = executions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (executions.length === 0) {
    return <p className={styles.sectionHint}>No executions found.</p>
  }

  return (
    <>
      <div className={styles.stkTableWrap}>
        <table className={styles.stkTable}>
          <StkTableHead
            showSymbolCol={showSymbolCol}
            stkSort={stkSort}
            toggleStkSort={toggleStkSort}
          />
          <tbody>
            {pageExecs.map(ex => (
              <StkFillRow
                key={ex.account_executions_id ?? `${ex.time}-${stkAccountContractKey(ex)}`}
                ex={ex}
                showSymbolCol={showSymbolCol}
                showPills={showPills}
                catMap={catMap}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
      <LedgerStkPagination
        page={page}
        totalPages={totalPages}
        totalItems={executions.length}
        setPage={setPage}
      />
    </>
  )
}

function GroupBlock({
  pg,
  category,
  groupUnrealized,
  showPills,
  showJournal,
  catMap,
  onEdit,
  onDelete,
  onAddJournal,
}: {
  pg: StkPositionGroup
  category: string
  groupUnrealized: number | null | undefined
  showPills: boolean
  showJournal: boolean
  catMap: Map<string, string>
  onEdit: (e: Execution) => void
  onDelete: (e: Execution) => void
  onAddJournal: (accountId: string, symbol: string) => void
}) {
  return (
    <>
      <tr className={styles.stkGroupHeader}>
        <td colSpan={12}>
          <div className={styles.stkGroupHeaderInner}>
            <span
              className={`${styles.stkGroupSymbol}${showPills ? ` ${styles.stkPillSymbol}` : ''}`}
            >
              {pg.symbol || '—'}
            </span>
            <span className={styles.stkGroupAccount}>{pg.accountId || '—'}</span>
            <span
              className={`${styles.stkGroupCategory}${showPills ? ` ${styles.stkPillCategory}` : ''}`}
            >
              {category}
            </span>
            <LedgerStkGroupPositionSnap snap={pg.snap} />
            <LedgerStkGroupBasisPct
              snap={pg.snap}
              realized={pg.realized}
              unrealized={groupUnrealized}
            />
            <LedgerStkUrPnlGroupInline realized={pg.realized} unrealized={groupUnrealized} />
            {showJournal && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onAddJournal(pg.accountId, pg.symbol)}
                title="Add journal"
                aria-label="Add journal"
              >
                <FileText className="size-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {pg.fills.map(ex => (
        <StkFillRow
          key={ex.account_executions_id ?? `${ex.time}-${stkAccountContractKey(ex)}`}
          ex={ex}
          showSymbolCol={false}
          showPills={showPills}
          catMap={catMap}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}
