/* eslint-disable react-hooks/set-state-in-effect -- clear stale instance when opportunity filter changes */
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fetchTrades, createTrade } from '@/api/strategy'
import { patchExecutionAttribution } from '@/api/trading'
import { ExecSourceBadge, SegmentControl } from '@/components/data-display'
import {
  assignAttributionPatch,
  defaultOpenedAtFromExecution,
  executionSplitCount,
  executionQtyLabel,
  filterTradesForOpportunity,
  filterOpportunitiesBySymbol,
  formatTradeOpenedDate,
  getUnderlyingSymbolFromExecution,
} from '@/components/positions/linkExecutionModalHelpers'
import {
  linkExecDialogFooterClass,
  linkExecHintClass,
  linkExecTradePanelClass,
  linkExecPillClass,
  linkExecPillSelectedClass,
  linkExecPillsClass,
  linkExecSectionClass,
  linkExecSectionLabelClass,
  linkExecSummaryClass,
  linkExecSymbolBadgeClass,
} from '@/components/positions/linkExecutionModalUi'
import type { PeerTradePick } from '@/utils/ledger/ledgerOptHelpers'
import { opportunityIsActive } from '@/utils/strategyFormUtils'
import { fmtDate, fmtUsd } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { Execution, StrategyOpportunity } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

export interface LinkExecutionContext {
  account_executions_id: number
  execution?: Execution | null
  peer_trade_picks?: PeerTradePick[]
}

interface Props {
  open: boolean
  context: LinkExecutionContext | null
  opportunities: StrategyOpportunity[]
  onClose: () => void
  onSuccess: () => void
}

function initLinkForm(context: LinkExecutionContext | null) {
  const ex = context?.execution
  const picks = context?.peer_trade_picks
  const preOpp = ex?.strategy_opportunity_id != null ? String(ex.strategy_opportunity_id) : ''
  const preInst = ex?.trade_id != null ? String(ex.trade_id) : ''
  let peerShortcut = ''
  if (picks?.length && preOpp && preInst) {
    const hit = picks.find(
      (p) => String(p.strategy_opportunity_id) === preOpp && String(p.trade_id) === preInst,
    )
    peerShortcut = hit ? `${hit.strategy_opportunity_id}::${hit.trade_id}` : ''
  }
  return {
    oppId: preOpp,
    tradeId: preInst,
    tradeMode: 'existing' as const,
    newOpenedAt: defaultOpenedAtFromExecution(ex),
    newLabel: '',
    peerShortcut,
  }
}

const TRADE_MODE_OPTIONS = [
  { value: 'existing', label: 'Use existing' },
  { value: 'new', label: '+ Create new' },
] as const

function LinkExecutionModalBody({
  context,
  opportunities,
  onClose,
  onSuccess,
}: Omit<Props, 'open'>) {
  const init = initLinkForm(context)
  const [oppId, setOppId] = useState(init.oppId)
  const [tradeMode, setTradeMode] = useState<'existing' | 'new'>(init.tradeMode)
  const [tradeId, setTradeId] = useState(init.tradeId)
  const [newOpenedAt, setNewOpenedAt] = useState(init.newOpenedAt)
  const [newLabel, setNewLabel] = useState(init.newLabel)
  const [peerShortcut, setPeerShortcut] = useState(init.peerShortcut)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ex = context?.execution
  const execId = context?.account_executions_id
  const splitCount = executionSplitCount(ex)
  const peerPicks = context?.peer_trade_picks

  const activeOpportunities = useMemo(
    () => opportunities.filter((o) => opportunityIsActive(o.is_active)),
    [opportunities],
  )

  const oppIdNum = oppId.trim() ? Number(oppId) : null
  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.trades.list, 'link-modal', oppIdNum],
    queryFn: () => fetchTrades({ opportunityId: oppIdNum! }),
    enabled: oppIdNum != null && Number.isFinite(oppIdNum),
    staleTime: 30_000,
  })
  const trades = useMemo(
    () => filterTradesForOpportunity(tradesData?.items ?? [], oppIdNum),
    [tradesData?.items, oppIdNum],
  )

  const execSymbol = getUnderlyingSymbolFromExecution(ex)
  const filteredOpps = filterOpportunitiesBySymbol(activeOpportunities, execSymbol)
  const executionAccountId = (ex?.account_id ?? '').trim()

  // When exactly one opportunity matches the underlying, pre-select it.
  useEffect(() => {
    if (oppId) return
    if (filteredOpps.length !== 1) return
    setOppId(String(filteredOpps[0].strategy_opportunity_id))
  }, [filteredOpps, oppId])

  useEffect(() => {
    if (!tradeId || trades.length === 0) return
    const ok = trades.some((i) => String(i.trade_id) === tradeId)
    if (!ok) setTradeId('')
  }, [trades, tradeId, oppIdNum])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (execId == null) return
    setError(null)
    if (!oppId.trim() || !Number.isFinite(Number(oppId))) {
      setError('Select a strategy opportunity.')
      return
    }
    const opp = Number(oppId)

    setSubmitting(true)
    try {
      let finalTradeId: number
      if (tradeMode === 'new') {
        if (!executionAccountId) {
          throw new Error('This execution has no account; create trade is not available.')
        }
        const dateStr = newOpenedAt.trim()
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          throw new Error('Opened at (date) is required.')
        }
        const created = await createTrade({
          strategy_opportunity_id: opp,
          account_id: executionAccountId,
          opened_at: `${dateStr}T12:00:00.000Z`,
          label: newLabel.trim() || undefined,
        })
        finalTradeId = created.trade_id
      } else {
        const instRaw = tradeId.trim()
        // A fill belongs to a trade; its opportunity is the trade's (core 0.37.0).
        if (!instRaw || !Number.isFinite(Number(instRaw))) {
          throw new Error('Pick the trade this fill belongs to, or create one.')
        }
        finalTradeId = Number(instRaw)
      }

      const updateRes = await patchExecutionAttribution(execId, assignAttributionPatch(ex, opp, finalTradeId))
      if (!updateRes.ok) throw new Error(updateRes.error)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const eTs = ex?.time != null ? Number(ex.time) : null
  const useTradeBubbles = trades.length > 0 && trades.length <= 12

  return (
    <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="space-y-1 border-b border-border bg-secondary/40 px-5 py-4">
        <DialogTitle>Assign strategy</DialogTitle>
        {execId != null && (
          <p className="text-xs font-normal text-muted-foreground">
            Set strategy opportunity and trade for execution #{execId}. No new execution row is created.
          </p>
        )}
      </DialogHeader>

      {ex && (
        <p className={cn(linkExecSummaryClass, 'border-b border-border px-5 py-2')}>
          {execSymbol ? <span className="font-medium text-entity-symbol">{execSymbol} · </span> : null}
          {eTs != null && Number.isFinite(eTs) ? <span>{fmtDate(eTs)} · </span> : null}
          <span>
            {ex.side ?? '—'} {executionQtyLabel(ex)} @{' '}
            {ex.price != null ? fmtUsd(Number(ex.price)) : '—'}
          </span>
          <span> · </span>
          <ExecSourceBadge source={ex.source} />
        </p>
      )}

      <form id="link-exec-assign-form" onSubmit={handleSubmit} className="space-y-3 px-4 pb-1 pt-3">
        {peerPicks && peerPicks.length > 0 ? (
          <div className={linkExecSectionClass}>
            <span className={linkExecSectionLabelClass}>Reuse from this contract</span>
            <div className={linkExecPillsClass} role="radiogroup" aria-label="Reuse from this contract">
              {peerPicks.map((p) => {
                const key = `${p.strategy_opportunity_id}::${p.trade_id}`
                const isActive = peerShortcut === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={cn(linkExecPillClass, isActive && linkExecPillSelectedClass)}
                    title={p.label}
                    onClick={() => {
                      setPeerShortcut(key)
                      setOppId(String(p.strategy_opportunity_id))
                      setTradeId(String(p.trade_id))
                      setTradeMode('existing')
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <p className={linkExecHintClass}>
              Optional: apply strategy already used on another fill for this contract.
            </p>
          </div>
        ) : null}

        <div className={linkExecSectionClass}>
          <span className={linkExecSectionLabelClass}>
            Strategy opportunity
            {execSymbol ? (
              <span className={linkExecSymbolBadgeClass} title={`Filtered by underlying ${execSymbol}`}>
                {execSymbol}
              </span>
            ) : null}
          </span>
          {filteredOpps.length > 0 ? (
            <div className={linkExecPillsClass} role="radiogroup" aria-label="Strategy opportunity">
              {filteredOpps.map((o) => {
                const idStr = String(o.strategy_opportunity_id)
                const isActive = oppId === idStr
                const label = o.name?.trim() || `#${o.strategy_opportunity_id}`
                return (
                  <button
                    key={o.strategy_opportunity_id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={cn(linkExecPillClass, isActive && linkExecPillSelectedClass)}
                    title={label}
                    onClick={() => {
                      setOppId(idStr)
                      setTradeId('')
                      setPeerShortcut('')
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className={linkExecHintClass}>
              {execSymbol
                ? `No active opportunities match underlying ${execSymbol}. Create one under Strategy → Opportunity, or check scope symbols.`
                : 'No active strategy opportunities loaded.'}
            </p>
          )}
        </div>

        {oppId ? (
          <div className={linkExecTradePanelClass}>
            <SegmentControl
              size="sm"
              ariaLabel="Trade mode"
              value={tradeMode}
              onChange={(v) => {
                const mode = v as 'existing' | 'new'
                setTradeMode(mode)
                if (mode === 'new') setPeerShortcut('')
              }}
              options={TRADE_MODE_OPTIONS.map((o) => ({
                ...o,
                disabled: o.value === 'new' && !executionAccountId,
              }))}
            />

            {tradeMode === 'existing' ? (
              <div className="space-y-2">
                <span className={linkExecSectionLabelClass}>Trade</span>
                {tradesLoading ? (
                  <p className={linkExecHintClass}>Loading trades…</p>
                ) : trades.length === 0 ? (
                  <p className={linkExecHintClass}>
                    No trades for this opportunity. Switch to &quot;Create new&quot; to add one.
                  </p>
                ) : useTradeBubbles ? (
                  <div className={linkExecPillsClass} role="radiogroup" aria-label="Trade">
                    {trades.map((inst) => {
                      const idStr = String(inst.trade_id)
                      const isActive = tradeId === idStr
                      const label = formatTradeOpenedDate(inst)
                      return (
                        <button
                          key={inst.trade_id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          className={cn(linkExecPillClass, isActive && linkExecPillSelectedClass)}
                          title={label}
                          onClick={() => {
                            setTradeId(idStr)
                            setPeerShortcut('')
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Select
                    value={tradeId || undefined}
                    onValueChange={(v) => {
                      setTradeId(v)
                      setPeerShortcut('')
                    }}
                  >
                    <SelectTrigger id="link-strategy-inst" className="h-9 w-full text-sm">
                      <SelectValue placeholder="Pick a trade" />
                    </SelectTrigger>
                    <SelectContent>
                      {trades.map((inst) => (
                        <SelectItem
                          key={inst.trade_id}
                          value={String(inst.trade_id)}
                        >
                          {formatTradeOpenedDate(inst)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="link-new-inst-date" className="text-xs">
                    Opened at
                  </Label>
                  <Input
                    id="link-new-inst-date"
                    type="date"
                    value={newOpenedAt}
                    onChange={(e) => setNewOpenedAt(e.target.value)}
                    className="h-9 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className={linkExecSectionLabelClass}>Account</span>
                  <p className="font-mono text-sm">{executionAccountId || '—'}</p>
                  <p className={linkExecHintClass}>From this execution; not editable.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link-new-inst-label" className="text-xs">
                    Label <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="link-new-inst-label"
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Mar trade"
                    maxLength={80}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {splitCount > 0 ? (
          <p className={linkExecHintClass}>
            This fill is split across {splitCount} {splitCount === 1 ? 'trade' : 'trades'}. Saving assigns the whole
            fill here and removes that split.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>

      <DialogFooter className={linkExecDialogFooterClass}>
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          form="link-exec-assign-form"
          disabled={
            submitting ||
            !oppId ||
            (tradeMode === 'new' ? !executionAccountId : !tradeId)
          }
        >
          {submitting
            ? tradeMode === 'new'
              ? 'Creating…'
              : 'Saving…'
            : tradeMode === 'new'
              ? 'Create & assign'
              : 'Save'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

export function LinkExecutionModal({ open, context, opportunities, onClose, onSuccess }: Props) {
  const formKey = open ? String(context?.account_executions_id ?? 'closed') : 'closed'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      {open && context ? (
        <LinkExecutionModalBody
          key={formKey}
          context={context}
          opportunities={opportunities}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  )
}
