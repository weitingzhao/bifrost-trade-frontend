import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fmtTradeDate, fmtUsd } from '@/lib/format'
import type { Execution } from '@/types/positions'
import type { OptionStockLink } from '@/types/trading'
import {
  createOptionStockLink,
  deleteOptionStockLink,
  fetchOptionStockLinks,
  fetchStockLinkCandidates,
} from '@/api/trading'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  denseTableNumCell,
} from '@/components/data-display'
import { LedgerWriteCommitButton } from './LedgerWriteCommitButton'
import {
  LEDGER_CONFIRM_LINKS,
  LEDGER_WRITE_FOOTER_LINKS,
} from './ledgerWriteConfirm'

async function loadLinks(accountId: string, optId: number) {
  const [linksRes, candRes] = await Promise.all([
    fetchOptionStockLinks(accountId, optId),
    fetchStockLinkCandidates({
      account_id: accountId,
      option_account_executions_id: optId,
      limit: 200,
    }),
  ])
  return {
    links: linksRes.links,
    slippageTotal: linksRes.slippage_total ?? null,
    candidates: candRes.executions,
    underlying: candRes.underlying_symbol ?? null,
    from: candRes.trade_date_from,
    to: candRes.trade_date_to,
    error: linksRes.error || candRes.error || null,
  }
}

function stockFillLabel(row: OptionStockLink): string {
  const sym = row.stock_symbol ?? '—'
  const side = row.stock_side ?? row.side ?? ''
  const qty = row.stock_quantity ?? row.quantity
  const px = row.stock_price ?? row.price
  const id = row.stock_account_executions_id ?? row.stock_execution_id
  return `${sym} · ${side} ${qty ?? '—'} @ ${px ?? '—'}`.trim() + (id != null ? ` · #${id}` : '')
}

export function LedgerLinksFace({
  execution,
  onLinked,
}: {
  execution?: Execution | null
  onLinked: () => void | Promise<void>
}) {
  const accountId = (execution?.account_id ?? '').trim()
  const optId = execution?.account_executions_id
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [unlinkId, setUnlinkId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ledgerLinksFace', accountId, optId],
    queryFn: () => loadLinks(accountId, optId!),
    enabled: optId != null && accountId.length > 0,
  })

  const from = data?.from
  const to = data?.to
  const windowLabel =
    from && to
      ? `same underlying, trade date ±7 days · ${fmtTradeDate(from)} → ${fmtTradeDate(to)}`
      : 'same underlying, trade date ±7 days'

  if (!execution || optId == null) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2.5">
        <span className="text-dense-body font-bold">Option ↔ stock links</span>
        <p className="text-dense-meta text-muted-foreground leading-relaxed">
          Click an option fill (or the link action) to load this face. An unlinked leg has no slippage
          reading — that is not $0.00.
        </p>
      </div>
    )
  }

  const links = data?.links ?? []
  const has = links.length > 0
  const candidates = data?.candidates ?? []
  const subject = `${execution.symbol ?? ''} #${optId}`.trim()

  async function linkSelected() {
    if (!accountId || optId == null || selected.size === 0) return
    setFormError(null)
    for (const sid of selected) {
      const res = await createOptionStockLink({
        account_id: accountId,
        option_account_executions_id: optId,
        stock_account_executions_id: sid,
      })
      if (!res.ok) throw new Error(res.error ?? 'Link failed')
    }
    setSelected(new Set())
    await refetch()
    await onLinked()
  }

  async function confirmUnlink() {
    if (unlinkId == null || !accountId) return
    const res = await deleteOptionStockLink(unlinkId, accountId)
    if (!res.ok) throw new Error(res.error ?? 'Remove link failed')
    await refetch()
    await onLinked()
  }

  return (
    <div className="flex flex-col gap-2.5 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-dense-body font-bold">Option ↔ stock links</span>
        <span className="font-mono text-dense-meta text-muted-foreground">{subject}</span>
      </div>
      <p className="text-dense-meta text-muted-foreground leading-relaxed">
        An assigned put and the shares it produced are one economic event. Linking them is what makes
        a covered call's cost basis and the slippage between strike and fill computable.
      </p>

      {formError || data?.error ? (
        <p className="text-dense-meta text-destructive" role="alert">
          {formError ?? data?.error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-dense-meta text-muted-foreground">Loading…</p>
      ) : has ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <DenseDataTable tableClassName="min-w-[360px]">
            <DenseTableHeader>
              <DenseTableHeadRow>
                <DenseTableHead>Stock fill</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
                <DenseTableHead className={denseTableNumCell}>Slippage</DenseTableHead>
                <DenseTableHead className="w-16" />
              </DenseTableHeadRow>
            </DenseTableHeader>
            <DenseTableBody>
              {links.map(row => (
                <DenseTableRow key={row.link_id ?? row.stock_account_executions_id}>
                  <DenseTableCell className="text-dense-meta text-foreground">
                    {stockFillLabel(row)}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {row.stock_quantity ?? row.quantity ?? '—'}
                  </DenseTableCell>
                  <DenseTableCell className={denseTableNumCell}>
                    {row.slippage_vs_close != null || row.slippage != null
                      ? fmtUsd(row.slippage_vs_close ?? row.slippage)
                      : '—'}
                  </DenseTableCell>
                  <DenseTableCell>
                    <button
                      type="button"
                      className="text-dense-meta text-destructive hover:underline"
                      onClick={() => row.link_id != null && setUnlinkId(row.link_id)}
                    >
                      Remove
                    </button>
                  </DenseTableCell>
                </DenseTableRow>
              ))}
            </DenseTableBody>
          </DenseDataTable>
          {data?.slippageTotal != null ? (
            <p className="border-t border-border px-2 py-1 font-mono text-dense-meta">
              Group slippage {fmtUsd(data.slippageTotal)}
            </p>
          ) : null}
        </div>
      ) : (
        <span className="flex items-start gap-1.5 text-dense-meta text-foreground leading-relaxed">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-500" />
          <span>
            Not linked. Grey, not zero — an unlinked leg has <strong>no</strong> slippage reading,
            which is a different statement from &quot;slippage is $0.00&quot;.
          </span>
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-dense-caption font-semibold uppercase tracking-wide text-muted-foreground">
          Candidates <span className="font-normal normal-case tracking-normal">{windowLabel}</span>
        </span>
        {candidates.length === 0 && !isLoading ? (
          <p className="text-dense-meta text-muted-foreground">No matching stock fills in this window.</p>
        ) : (
          candidates.map(c => {
            const sid = c.account_executions_id
            if (sid == null) return null
            const on = selected.has(sid)
            return (
              <label
                key={sid}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5"
              >
                <Checkbox checked={on} onCheckedChange={() => {
                  setSelected(prev => {
                    const next = new Set(prev)
                    if (next.has(sid)) next.delete(sid)
                    else next.add(sid)
                    return next
                  })
                }} />
                <span className={cn('min-w-0 flex-1 font-mono text-dense-meta text-foreground')}>
                  {c.symbol} · {c.side} {c.quantity ?? c.qty} @ {c.price}
                </span>
                <span className="font-mono text-dense-meta text-muted-foreground">#{sid}</span>
              </label>
            )
          })
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <LedgerWriteCommitButton
          idleLabel="Link selected"
          confirmTitle={LEDGER_CONFIRM_LINKS.title}
          confirmBody={LEDGER_CONFIRM_LINKS.body}
          disabled={selected.size === 0 || isLoading}
          onCommit={linkSelected}
        />
      </div>
      <p className="border-t border-border/60 pt-2 text-dense-caption text-muted-foreground leading-relaxed">
        {LEDGER_WRITE_FOOTER_LINKS}
      </p>

      <DeleteConfirmDialog
        open={unlinkId != null}
        title="Remove stock link"
        message="This removes the association between this option fill and the selected stock execution. It does not delete any execution rows."
        onClose={() => setUnlinkId(null)}
        onConfirm={confirmUnlink}
      />
    </div>
  )
}
