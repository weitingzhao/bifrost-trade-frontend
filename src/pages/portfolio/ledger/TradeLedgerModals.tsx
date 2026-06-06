import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import {
  LinkExecutionModal,
  type LinkExecutionContext,
} from '@/components/positions/LinkExecutionModal'
import { LinkOptionStockModal } from '@/components/positions/LinkOptionStockModal'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import type { ViewLinksPayload } from './LedgerOptContractCell'
import { ViewOptionStockLinksModal } from './ViewOptionStockLinksModal'

type Props = {
  accounts: string[]
  opportunities: StrategyOpportunity[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  deleteTarget: Execution | null
  setDeleteTarget: (e: Execution | null) => void
  onDelete: () => Promise<void>
  editExec: Execution | null
  setEditExec: (e: Execution | null) => void
  linkContext: LinkExecutionContext | null
  setLinkContext: (ctx: LinkExecutionContext | null) => void
  expiredCloseTarget: Execution | null
  setExpiredCloseTarget: (e: Execution | null) => void
  viewLinksTarget: ViewLinksPayload | null
  setViewLinksTarget: (v: ViewLinksPayload | null) => void
  linkStockTarget: Execution | null
  setLinkStockTarget: (e: Execution | null) => void
  createSource?: 'manual' | 'journal_closed'
}

export function TradeLedgerModals({
  accounts,
  opportunities,
  linkByOptionId,
  deleteTarget,
  setDeleteTarget,
  onDelete,
  editExec,
  setEditExec,
  linkContext,
  setLinkContext,
  expiredCloseTarget,
  setExpiredCloseTarget,
  viewLinksTarget,
  setViewLinksTarget,
  linkStockTarget,
  setLinkStockTarget,
  createSource = 'manual',
}: Props) {
  const queryClient = useQueryClient()
  const invalidateExecutions = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.optStockLinks })
  }

  const summary =
    viewLinksTarget?.oid != null ? linkByOptionId[viewLinksTarget.oid] : undefined
  const links = viewLinksTarget?.links ?? summary?.links ?? []
  const slippageTotal =
    viewLinksTarget?.slippageTotal ?? summary?.slippage_total ?? null

  return (
    <>
      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Delete execution"
        message={`Delete execution #${deleteTarget?.account_executions_id ?? ''} (${deleteTarget?.symbol ?? ''} ${deleteTarget?.side ?? ''})?`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={onDelete}
      />
      {editExec && (
        <ExecutionFormModal
          open
          exec={editExec}
          accountOptions={accounts.length > 0 ? accounts : [editExec.account_id]}
          createSource={createSource}
          onClose={() => setEditExec(null)}
          onSuccess={() => {
            setEditExec(null)
            invalidateExecutions()
          }}
        />
      )}
      {linkContext != null && (
        <LinkExecutionModal
          open
          context={linkContext}
          opportunities={opportunities}
          onClose={() => setLinkContext(null)}
          onSuccess={() => {
            setLinkContext(null)
            invalidateExecutions()
          }}
        />
      )}
      <QuickCloseModal
        exec={expiredCloseTarget}
        onClose={() => setExpiredCloseTarget(null)}
        onSuccess={() => {
          setExpiredCloseTarget(null)
          invalidateExecutions()
        }}
      />
      <ViewOptionStockLinksModal
        open={viewLinksTarget != null}
        title={viewLinksTarget?.title ?? ''}
        rows={links}
        slippageTotal={slippageTotal}
        onClose={() => setViewLinksTarget(null)}
      />
      <LinkOptionStockModal
        open={linkStockTarget != null}
        execution={linkStockTarget}
        onClose={() => setLinkStockTarget(null)}
        onSuccess={invalidateExecutions}
      />
    </>
  )
}
