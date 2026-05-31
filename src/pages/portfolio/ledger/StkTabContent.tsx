import type { Execution } from '@/types/positions'
import { LedgerStkTable } from './LedgerStkTable'
import type { MainTab, StkPositionGroup, StkSortCol } from './ledgerTypes'

export function StkTabContent({
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
  return (
    <LedgerStkTable
      executions={executions}
      positionGroups={positionGroups}
      groupByPosition={groupByPosition}
      stkSort={stkSort}
      toggleStkSort={toggleStkSort}
      page={page}
      setPage={setPage}
      activeTab={activeTab}
      catMap={catMap}
      stkUnrealizedByKey={stkUnrealizedByKey}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddJournal={onAddJournal}
    />
  )
}
