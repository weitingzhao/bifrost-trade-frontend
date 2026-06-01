import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { ExecutionFormModal } from '@/components/positions/ExecutionFormModal'
import {
  LinkExecutionModal,
  type LinkExecutionContext,
} from '@/components/positions/LinkExecutionModal'
import { QuickCloseModal } from '@/components/positions/QuickCloseModal'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import type { OptionStockLinkSummary } from '@/types/trading'
import { fmtCcy, fmtPrice, pnlClass } from '@/pages/portfolio/ledger/ledgerFormat'

type Props = {
  accounts: string[]
  opportunities: StrategyOpportunity[]
  linkByOptionId: Record<number, OptionStockLinkSummary>
  deleteTarget: Execution | null
  setDeleteTarget: (e: Execution | null) => void
  onDelete: () => Promise<void>
  editExec: Execution | null
  setEditExec: (e: Execution | null) => void
  linkStrategyTarget: Execution | null
  setLinkStrategyTarget: (e: Execution | null) => void
  expiredCloseTarget: Execution | null
  setExpiredCloseTarget: (e: Execution | null) => void
  viewLinksTarget: { title: string; oid: number } | null
  setViewLinksTarget: (v: { title: string; oid: number } | null) => void
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
  linkStrategyTarget,
  setLinkStrategyTarget,
  expiredCloseTarget,
  setExpiredCloseTarget,
  viewLinksTarget,
  setViewLinksTarget,
  createSource = 'manual',
}: Props) {
  const queryClient = useQueryClient()
  const invalidateExecutions = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trading.executionsBook })
  }

  const summary = viewLinksTarget ? linkByOptionId[viewLinksTarget.oid] : undefined
  const links = summary?.links ?? []

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
      {linkStrategyTarget?.account_executions_id != null && (
        <LinkExecutionModal
          open
          context={{
            account_executions_id: linkStrategyTarget.account_executions_id,
            execution: linkStrategyTarget,
          } satisfies LinkExecutionContext}
          opportunities={opportunities}
          onClose={() => setLinkStrategyTarget(null)}
          onSuccess={() => {
            setLinkStrategyTarget(null)
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
      {viewLinksTarget && (
        <Dialog open onOpenChange={v => { if (!v) setViewLinksTarget(null) }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm">{viewLinksTarget.title}</DialogTitle>
            </DialogHeader>
            <div className="text-xs space-y-3">
              {links.length === 0
                ? <p className="text-muted-foreground">No linked stock executions.</p>
                : (
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-7">Date</TableHead>
                          <TableHead className="h-7">Side</TableHead>
                          <TableHead className="h-7 text-right">Qty</TableHead>
                          <TableHead className="h-7 text-right">Price</TableHead>
                          <TableHead className="h-7 text-right">Slippage</TableHead>
                          <TableHead className="h-7 text-right">Close</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {links.map((lk, i) => {
                          const r = lk as unknown as Record<string, unknown>
                          return (
                            <TableRow key={i} className="text-xs">
                              <TableCell className="py-1 font-mono">{String(r.trade_date ?? r.time ?? '—')}</TableCell>
                              <TableCell className="py-1">{String(r.side ?? '—')}</TableCell>
                              <TableCell className="py-1 text-right font-mono">{String(r.quantity ?? r.qty ?? '—')}</TableCell>
                              <TableCell className="py-1 text-right font-mono">{r.price != null ? fmtPrice(Number(r.price)) : '—'}</TableCell>
                              <TableCell className={cn('py-1 text-right font-mono', pnlClass(Number(r.slippage ?? 0)))}>{r.slippage != null ? fmtCcy(Number(r.slippage)) : '—'}</TableCell>
                              <TableCell className="py-1 text-right font-mono">{r.close_price != null ? fmtPrice(Number(r.close_price)) : '—'}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              {summary?.slippage_total != null && (
                <div className="flex justify-end text-xs font-medium">
                  Total slippage: <span className={cn('ml-2 font-mono', pnlClass(summary.slippage_total))}>{fmtCcy(summary.slippage_total)}</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
