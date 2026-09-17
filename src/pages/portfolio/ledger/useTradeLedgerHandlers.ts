import type { Dispatch, SetStateAction } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { Execution } from '@/types/positions'
import { deleteExecution, updateExecution } from '@/api/trading'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { OptSortCol, StkSortCol } from '@/pages/portfolio/ledger/ledgerTypes'
import { syncOppositeLegAttribution } from '@/pages/portfolio/ledger/executionUpdateResult'
import type { LedgerInspectorState } from '@/pages/portfolio/ledger/ledgerInspectorState'

type Params = {
  accordionMode: boolean
  queryClient: QueryClient
  setExpandedGroups: Dispatch<SetStateAction<Set<string>>>
  setStrategyOppExpanded: Dispatch<SetStateAction<Set<string>>>
  setOuterStrategyExpanded: Dispatch<SetStateAction<Set<string>>>
  setOuterInstanceExpanded: Dispatch<SetStateAction<Set<string>>>
  setOptSort: Dispatch<SetStateAction<{ col: OptSortCol; dir: 'asc' | 'desc' }>>
  setStkSort: Dispatch<SetStateAction<{ col: StkSortCol; dir: 'asc' | 'desc' }>>
  setInspector: Dispatch<SetStateAction<LedgerInspectorState>>
  setEditExec: Dispatch<SetStateAction<Execution | null>>
  setCreateSource: Dispatch<SetStateAction<'manual' | 'journal_closed'>>
  accountFilter: string
  accounts: string[]
  deleteTarget: Execution | null
  setSyncingId: Dispatch<SetStateAction<number | null>>
  setSyncError: Dispatch<SetStateAction<{ id: number; message: string } | null>>
}

export function useTradeLedgerHandlers(p: Params) {
  function toggleExpanded(key: string, setter: Dispatch<SetStateAction<Set<string>>>) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (p.accordionMode) next.clear()
        next.add(key)
      }
      return next
    })
  }

  const toggleGroup = (key: string) => toggleExpanded(key, p.setExpandedGroups)
  const toggleStrategyOpp = (oppId: number | 'none') => toggleExpanded(String(oppId), p.setStrategyOppExpanded)
  const toggleOuterStrategy = (key: string) => toggleExpanded(key, p.setOuterStrategyExpanded)
  const toggleOuterInstance = (key: string) => toggleExpanded(key, p.setOuterInstanceExpanded)

  const toggleOptSort = (col: OptSortCol) => {
    p.setOptSort(prev =>
      prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' },
    )
  }

  const toggleStkSort = (col: StkSortCol) => {
    p.setStkSort(prev =>
      prev.col === col ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' },
    )
  }

  // A new journal row goes through the full execution form: instrument, expiry,
  // strike, right, commission and strategy are all needed to write a row the rest
  // of the page can group. The Journal face writes only for a contract it was
  // opened from. Account and symbol arrive filled from a Stocks group header.
  const openJournalForm = (accountId: string, symbol: string) => {
    p.setCreateSource('journal_closed')
    p.setEditExec({
      account_executions_id: undefined as unknown as number,
      account_id: accountId,
      symbol,
      sec_type: 'STK',
      side: 'Buy',
      qty: 0,
      quantity: 0,
      price: 0,
      time: null,
    } as unknown as Execution)
  }

  const handleAddJournal = (accountId: string, symbol: string) => openJournalForm(accountId, symbol)

  const handleHeaderAddJournal = () =>
    openJournalForm(p.accountFilter !== 'all' ? p.accountFilter : (p.accounts[0] ?? ''), '')

  const handleCloseEditModal = () => {
    p.setEditExec(null)
  }

  const handleDelete = async () => {
    if (!p.deleteTarget?.account_executions_id) return
    await deleteExecution(p.deleteTarget.account_executions_id)
    void p.queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void p.queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    void p.queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.optStockLinks })
  }

  const handleSyncOppositeLeg = async (
    ex: Execution,
    source: { opportunity_id: number; instance_id: number },
  ) => {
    const id = ex.account_executions_id
    if (id == null) return
    p.setSyncingId(id)
    p.setSyncError(null)
    try {
      const result = await syncOppositeLegAttribution(updateExecution, id, source)
      if (!result.ok) {
        p.setSyncError({ id, message: result.error })
        throw new Error(result.error)
      }
      void p.queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
      void p.queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    } finally {
      p.setSyncingId(null)
    }
  }

  return {
    toggleGroup,
    toggleStrategyOpp,
    toggleOuterStrategy,
    toggleOuterInstance,
    toggleOptSort,
    toggleStkSort,
    handleAddJournal,
    handleHeaderAddJournal,
    handleCloseEditModal,
    handleDelete,
    handleSyncOppositeLeg,
  }
}
