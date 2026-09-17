import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import {
  LinkExecutionModal,
  type LinkExecutionContext,
} from '@/components/positions/LinkExecutionModal'
import type { Execution, StrategyOpportunity } from '@/types/positions'

type Props = {
  accounts: string[]
  opportunities: StrategyOpportunity[]
  deleteTarget: Execution | null
  setDeleteTarget: (e: Execution | null) => void
  onDelete: () => Promise<void>
  editExec: Execution | null
  setEditExec: (e: Execution | null) => void
  linkContext: LinkExecutionContext | null
  setLinkContext: (ctx: LinkExecutionContext | null) => void
}

export function TradeLedgerModals({
  accounts,
  opportunities,
  deleteTarget,
  setDeleteTarget,
  onDelete,
  editExec,
  setEditExec,
  linkContext,
  setLinkContext,
}: Props) {
  const queryClient = useQueryClient()
  const invalidateExecutions = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.optStockLinks })
  }

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
          createSource="manual"
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
    </>
  )
}
