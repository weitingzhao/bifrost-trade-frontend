import { FileText } from 'lucide-react'
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
import { LedgerOptActionButtons } from './LedgerOptActionButtons'
import { ledgerPagination } from './ledgerPaginationClasses'
import {
  StkColgroup,
  stkActionsCell,
  stkActionsHead,
  stkHeadPrimary,
  stkMetaCell,
  stkTableClass,
  stkTimeCell,
  stkTradeDateCell,
} from './ledgerStockUi'
import type { MainTab, StkPositionGroup, StkSortCol } from './ledgerTypes'
import {
  denseTable,
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  DenseTag,
  IconActionButton,
  denseTableNumCell,
} from '@/components/data-display'

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
  if (ex.account_executions_id == null) {
    return <DenseTableCell>—</DenseTableCell>
  }
  return (
    <DenseTableCell className={stkActionsCell}>
      <LedgerOptActionButtons onEdit={() => onEdit(ex)} onDelete={() => onDelete(ex)} />
    </DenseTableCell>
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
    <DenseTableRow>
      <LedgerStkTimeCells
        ex={ex}
        timeClassName={stkTimeCell}
        tradeDateClassName={stkTradeDateCell}
      />
      {showSymbolCol && (
        <DenseTableCell className={stkMetaCell}>
          {showPills ? (
            <DenseTag variant="symbol" size="cell">
              {ex.symbol ?? '—'}
            </DenseTag>
          ) : (
            (ex.symbol ?? '—')
          )}
        </DenseTableCell>
      )}
      <DenseTableCell className={stkMetaCell}>{ex.account_id ?? '—'}</DenseTableCell>
      <DenseTableCell className={stkMetaCell}>
        {showPills ? (
          <DenseTag variant="category" size="cell">
            {category}
          </DenseTag>
        ) : (
          category
        )}
      </DenseTableCell>
      <DenseTableCell className={stkMetaCell}>{stkSideLabel(ex)}</DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>
        {ex.quantity != null ? Number(ex.quantity ?? ex.qty) : '—'}
      </DenseTableCell>
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(ex.price)}</DenseTableCell>
      <LedgerStkNotionalCell ex={ex} />
      <LedgerStkRowRealizedCell realized={Number(ex.realized_pnl) || 0} />
      <DenseTableCell className={denseTableNumCell}>{fmtUsd(ex.commission ?? 0)}</DenseTableCell>
      <DenseTableCell className={stkMetaCell}>
        <ExecSourceBadge source={ex.source} />
      </DenseTableCell>
      <StkRowActions ex={ex} onEdit={onEdit} onDelete={onDelete} />
    </DenseTableRow>
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
    <DenseTableHeader>
      <DenseTableHeadRow>
        <DenseTableHead className={stkHeadPrimary}>Time</DenseTableHead>
        <LedgerStkSortableTh
          label="Trade date"
          active={stkSort.col === 'trade_date'}
          dir={stkSort.dir}
          onClick={() => toggleStkSort('trade_date')}
          className={stkHeadPrimary}
        />
        {showSymbolCol ? <DenseTableHead className={stkHeadPrimary}>Symbol</DenseTableHead> : null}
        <DenseTableHead className={stkHeadPrimary}>Account</DenseTableHead>
        <DenseTableHead className={stkHeadPrimary}>Category</DenseTableHead>
        <DenseTableHead className={stkHeadPrimary}>Side</DenseTableHead>
        <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
        <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
        <DenseTableHead className={denseTableNumCell}>Notional</DenseTableHead>
        <LedgerStkSortableTh
          label="Realized"
          active={stkSort.col === 'realized_pnl'}
          dir={stkSort.dir}
          onClick={() => toggleStkSort('realized_pnl')}
          tooltip="Realized on this fill (IB commission report). Zero shows as dash. Unrealized is position-level: see Group U/R PnL when grouped, or Total U in the summary."
          className={stkHeadPrimary}
        />
        <DenseTableHead className={denseTableNumCell}>Comm.</DenseTableHead>
        <DenseTableHead className={stkHeadPrimary}>Source</DenseTableHead>
        <DenseTableHead className={stkActionsHead}>Actions</DenseTableHead>
      </DenseTableHeadRow>
    </DenseTableHeader>
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
    <div className={ledgerPagination.bar} role="navigation" aria-label="Stocks pagination">
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => setPage(0)}
        disabled={page === 0}
        aria-label="First page"
      >
        «
      </button>
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => setPage(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className={ledgerPagination.info}>
        {page + 1} / {totalPages}
        <span className={ledgerPagination.total}> ({totalItems})</span>
      </span>
      <button
        type="button"
        className={ledgerPagination.btn}
        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
      >
        ›
      </button>
      <button
        type="button"
        className={ledgerPagination.btn}
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
      return <p className={denseTable.emptyHint}>No executions found.</p>
    }

    return (
      <>
        <DenseDataTable tableClassName={stkTableClass}>
          <StkColgroup showSymbolCol={false} />
          <StkTableHead showSymbolCol={false} stkSort={stkSort} toggleStkSort={toggleStkSort} />
          <DenseTableBody>
            {pageGroups.map(pg => {
              const category = catMap.get(stkContractKey(pg.symbol, pg.accountId)) ?? '—'
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
          </DenseTableBody>
        </DenseDataTable>
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
    return <p className={denseTable.emptyHint}>No executions found.</p>
  }

  return (
    <>
      <DenseDataTable tableClassName={stkTableClass}>
        <StkColgroup showSymbolCol={showSymbolCol} />
        <StkTableHead showSymbolCol={showSymbolCol} stkSort={stkSort} toggleStkSort={toggleStkSort} />
        <DenseTableBody>
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
        </DenseTableBody>
      </DenseDataTable>
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
      <DenseTableRow className="bg-secondary/50 hover:bg-secondary/50">
        <DenseTableCell colSpan={12} className="py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-muted-foreground">
            {showPills ? (
              <DenseTag variant="symbol" size="pill">
                {pg.symbol || '—'}
              </DenseTag>
            ) : (
              <span className="font-bold text-foreground">{pg.symbol || '—'}</span>
            )}
            <span className="text-foreground">{pg.accountId || '—'}</span>
            {showPills ? (
              <DenseTag variant="category" size="pill">
                {category}
              </DenseTag>
            ) : (
              <span className="font-medium text-foreground">{category}</span>
            )}
            <LedgerStkGroupPositionSnap snap={pg.snap} />
            <LedgerStkGroupBasisPct
              snap={pg.snap}
              realized={pg.realized}
              unrealized={groupUnrealized}
            />
            <LedgerStkUrPnlGroupInline realized={pg.realized} unrealized={groupUnrealized} />
            {showJournal && (
              <IconActionButton
                onClick={() => onAddJournal(pg.accountId, pg.symbol)}
                title="Add journal"
                ariaLabel="Add journal"
                size="dense"
              >
                <FileText className="h-3.5 w-3.5" />
              </IconActionButton>
            )}
          </div>
        </DenseTableCell>
      </DenseTableRow>
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
