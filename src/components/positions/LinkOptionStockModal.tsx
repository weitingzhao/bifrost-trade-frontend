import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { fmtTradeDate, fmtUsd } from '@/lib/format'
import { pnlColorClass } from '@/utils/dailyChange'
import type { Execution } from '@/types/positions'
import type { OptionStockLink } from '@/types/trading'
import {
  createOptionStockLink,
  deleteOptionStockLink,
  fetchOptionStockLinks,
  fetchStockLinkCandidates,
} from '@/api/trading'
import { DeleteConfirmDialog } from '@/components/positions/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

type LinkRole = '' | 'exercise' | 'assignment'

type StockCandidate = Execution & { close_price?: number | null; slippage_vs_close?: number | null }

async function loadLinkOptionStockData(accountId: string, optId: number) {
  const [linksRes, candRes] = await Promise.all([
    fetchOptionStockLinks(accountId, optId),
    fetchStockLinkCandidates({
      account_id: accountId,
      option_account_executions_id: optId,
      limit: 200,
    }),
  ])
  const dateWindow =
    candRes.trade_date_from && candRes.trade_date_to
      ? `${candRes.trade_date_from} — ${candRes.trade_date_to}`
      : null
  const err = linksRes.error || candRes.error
  return {
    links: linksRes.links,
    slippageTotal: linksRes.slippage_total ?? null,
    candidates: candRes.executions as StockCandidate[],
    underlyingHint: candRes.underlying_symbol ?? null,
    dateWindow,
    loadError: err ?? null,
  }
}

export function LinkOptionStockModal({
  open,
  execution,
  onClose,
  onSuccess,
}: {
  open: boolean
  execution: Execution | null
  onClose: () => void
  onSuccess: () => void | Promise<void>
}) {
  const [selectedStockIds, setSelectedStockIds] = useState<Set<number>>(new Set())
  const [linkRole, setLinkRole] = useState<LinkRole>('')
  const [linking, setLinking] = useState(false)
  const [unlinkLinkId, setUnlinkLinkId] = useState<number | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const accountId = (execution?.account_id ?? '').trim()
  const optId = execution?.account_executions_id

  const { data, isLoading, refetch, error: queryError } = useQuery({
    queryKey: ['linkOptionStock', accountId, optId],
    queryFn: () => loadLinkOptionStockData(accountId, optId!),
    enabled: open && optId != null && accountId.length > 0,
  })

  const links = data?.links ?? []
  const slippageTotal = data?.slippageTotal ?? null
  const candidates = data?.candidates ?? []
  const underlyingHint = data?.underlyingHint ?? null
  const dateWindow = data?.dateWindow ?? null
  const loadError = data?.loadError ?? (queryError instanceof Error ? queryError.message : null)

  const toggleSelect = (stockId: number) => {
    setSelectedStockIds(prev => {
      const next = new Set(prev)
      if (next.has(stockId)) next.delete(stockId)
      else next.add(stockId)
      return next
    })
  }

  const handleLinkSelected = async () => {
    if (!accountId || optId == null || selectedStockIds.size === 0) return
    setLinking(true)
    setFormError(null)
    const warnings: string[] = []
    try {
      for (const sid of selectedStockIds) {
        const res = await createOptionStockLink({
          account_id: accountId,
          option_account_executions_id: optId,
          stock_account_executions_id: sid,
          role: linkRole || undefined,
        })
        if (!res.ok) {
          setFormError(res.error ?? 'Link failed')
          return
        }
        if (res.warning) warnings.push(res.warning)
      }
      if (warnings.length > 0) setFormError(warnings.join(' '))
      setSelectedStockIds(new Set())
      setLinkRole('')
      await refetch()
      await onSuccess()
    } finally {
      setLinking(false)
    }
  }

  const confirmUnlink = async () => {
    if (unlinkLinkId == null || !accountId) return
    const res = await deleteOptionStockLink(unlinkLinkId, accountId)
    if (!res.ok) {
      setFormError(res.error ?? 'Remove link failed')
      return
    }
    await refetch()
    await onSuccess()
  }

  const symLabel = (execution?.symbol ?? execution?.contract_key ?? 'Option').trim() || 'Option'
  const displayError = formError ?? loadError

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={v => {
          if (!v && !linking) {
            setSelectedStockIds(new Set())
            setLinkRole('')
            setFormError(null)
            onClose()
          }
        }}
      >
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] sm:max-w-[720px] gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Link stock fills</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Option: <strong className="text-foreground">{symLabel}</strong>
            {optId != null ? (
              <span className="ml-1 font-mono text-muted-foreground/80">#{optId}</span>
            ) : null}
            {underlyingHint ? (
              <>
                {' '}
                · Underlying <strong className="text-foreground">{underlyingHint}</strong>
              </>
            ) : null}
            {dateWindow ? <> · Date window: {dateWindow}</> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            Tie underlying stock execution rows (performance book) to this option fill for exercise or
            assignment. Slippage vs Flex close is signed quantity × (price − close).
          </p>

          {displayError ? (
            <p className="text-xs text-destructive">{displayError}</p>
          ) : null}

          <div className="text-xs">
            <strong>Linked stock executions</strong>
            {slippageTotal != null && (
              <span className="ml-3 text-muted-foreground">
                Total slippage vs close:{' '}
                <strong className={cn('font-mono tabular-nums', pnlColorClass(slippageTotal))}>
                  {fmtUsd(slippageTotal)}
                </strong>
              </span>
            )}
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : links.length === 0 ? (
            <p className="text-xs text-muted-foreground">No stock legs linked yet.</p>
          ) : (
            <div className="max-h-[200px] overflow-auto rounded-md border">
              <DenseDataTable tableClassName="min-w-[560px]">
                <DenseTableHeader>
                  <DenseTableHeadRow>
                    <DenseTableHead>Stock id</DenseTableHead>
                    <DenseTableHead>Symbol</DenseTableHead>
                    <DenseTableHead>Trade date</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Close</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Slippage</DenseTableHead>
                    <DenseTableHead>Role</DenseTableHead>
                    <DenseTableHead className="w-16" />
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {links.map((row: OptionStockLink) => (
                    <DenseTableRow key={row.link_id}>
                      <DenseTableCell className="text-xs font-mono">#{row.stock_account_executions_id}</DenseTableCell>
                      <DenseTableCell className="text-xs">{row.stock_symbol ?? '—'}</DenseTableCell>
                      <DenseTableCell className="text-xs font-mono">
                        {row.stock_trade_date ? fmtTradeDate(row.stock_trade_date) : '—'}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                        {row.stock_quantity != null ? Number(row.stock_quantity) : '—'}
                      </DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{fmtUsd(row.stock_price)}</DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{fmtUsd(row.stock_close_price)}</DenseTableCell>
                      <DenseTableCell className={cn(denseTableNumCell, 'text-xs', pnlColorClass(row.slippage_vs_close ?? 0))}>
                        {row.slippage_vs_close != null ? fmtUsd(row.slippage_vs_close) : '—'}
                      </DenseTableCell>
                      <DenseTableCell className="text-xs">{row.role ?? '—'}</DenseTableCell>
                      <DenseTableCell className="text-xs">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-dense-meta"
                          onClick={() => row.link_id != null && setUnlinkLinkId(row.link_id)}
                        >
                          Remove
                        </Button>
                      </DenseTableCell>
                    </DenseTableRow>
                  ))}
                </DenseTableBody>
              </DenseDataTable>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Role for new links</span>
            <Select
              value={linkRole || '__none__'}
              onValueChange={v => setLinkRole(v === '__none__' ? '' : (v as LinkRole))}
            >
              <SelectTrigger className="h-7 w-[10rem] text-xs">
                <SelectValue placeholder="(unspecified)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">(unspecified)</SelectItem>
                <SelectItem value="exercise">exercise</SelectItem>
                <SelectItem value="assignment">assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs font-semibold">Candidates (not yet linked)</p>
          {isLoading ? null : candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No matching STK rows in this window (check Flex sync).</p>
          ) : (
            <div className="max-h-[240px] overflow-auto rounded-md border">
              <DenseDataTable tableClassName="min-w-[520px]">
                <DenseTableHeader>
                  <DenseTableHeadRow>
                    <DenseTableHead className="w-8" />
                    <DenseTableHead>Id</DenseTableHead>
                    <DenseTableHead>Symbol</DenseTableHead>
                    <DenseTableHead>Trade date</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Qty</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Price</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Close</DenseTableHead>
                    <DenseTableHead className={denseTableNumCell}>Slippage</DenseTableHead>
                  </DenseTableHeadRow>
                </DenseTableHeader>
                <DenseTableBody>
                  {candidates.map(c => {
                    const sid = c.account_executions_id
                    if (sid == null) return null
                    const slip = c.slippage_vs_close
                    return (
                      <DenseTableRow key={sid}>
                        <DenseTableCell>
                          <Checkbox
                            checked={selectedStockIds.has(sid)}
                            onCheckedChange={() => toggleSelect(sid)}
                            aria-label={`Select stock execution ${sid}`}
                          />
                        </DenseTableCell>
                        <DenseTableCell className="text-xs font-mono">#{sid}</DenseTableCell>
                        <DenseTableCell className="text-xs">{c.symbol ?? '—'}</DenseTableCell>
                        <DenseTableCell className="text-xs font-mono">
                          {c.trade_date ? fmtTradeDate(c.trade_date) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                          {c.quantity != null ? Number(c.quantity) : '—'}
                        </DenseTableCell>
                        <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{fmtUsd(c.price)}</DenseTableCell>
                        <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>{fmtUsd(c.close_price)}</DenseTableCell>
                        <DenseTableCell className={cn(denseTableNumCell, 'text-xs')}>
                          {slip != null ? fmtUsd(slip) : '—'}
                        </DenseTableCell>
                      </DenseTableRow>
                    )
                  })}
                </DenseTableBody>
              </DenseDataTable>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={linking}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleLinkSelected()}
              disabled={linking || selectedStockIds.size === 0 || isLoading}
            >
              {linking ? 'Linking…' : 'Link selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={unlinkLinkId != null}
        title="Remove stock link"
        message="This removes the association between this option fill and the selected stock execution. It does not delete any execution rows."
        onClose={() => setUnlinkLinkId(null)}
        onConfirm={confirmUnlink}
      />
    </>
  )
}
