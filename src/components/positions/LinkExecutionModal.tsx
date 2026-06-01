import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/ui/badge'
import { updateExecution } from '@/api/trading'
import { fetchStrategyInstances, createStrategyInstance } from '@/api/strategy'
import {
  bubbleButtonClass,
  bubbleGroupClass,
  POSITIONS_BUBBLE_SIZE,
} from '@/components/positions/charts/bubbleSwitchStyles'
import {
  defaultOpenedAtFromExecution,
  executionQtyLabel,
  filterOpportunitiesBySymbol,
  formatInstanceOpenedDate,
  getUnderlyingSymbolFromExecution,
} from '@/components/positions/linkExecutionModalHelpers'
import type { PeerInstancePick } from '@/utils/ledger/ledgerOptHelpers'
import { fmtDate, fmtUsd } from '@/utils/positions'
import { cn } from '@/lib/utils'
import type { Execution, StrategyOpportunity } from '@/types/positions'

export interface LinkExecutionContext {
  account_executions_id: number
  execution?: Execution | null
  peer_instance_picks?: PeerInstancePick[]
}

interface Props {
  open: boolean
  context: LinkExecutionContext | null
  opportunities: StrategyOpportunity[]
  onClose: () => void
  onSuccess: () => void
}

function ExecSourceBadge({ source }: { source?: string | null }) {
  const s = (source ?? '').trim()
  if (!s) return <span className="text-muted-foreground">—</span>
  const norm = s.toLowerCase()
  let cls = 'bg-muted text-muted-foreground'
  let label = s
  if (norm === 'flex' || norm === 'flex_trades') {
    cls = 'bg-emerald-500/15 text-emerald-500'
    label = 'flex'
  } else if (norm === 'tws_event' || norm === 'tws_client') {
    cls = 'bg-sky-500/15 text-sky-400'
    label = 'tws-client'
  } else if (norm === 'journal_closed') {
    cls = 'bg-amber-500/15 text-amber-500'
    label = 'journal'
  }
  return (
    <span className={cn('inline-flex rounded px-1.5 py-0 text-[10px] font-medium uppercase', cls)} title={s}>
      {label}
    </span>
  )
}

function initLinkForm(context: LinkExecutionContext | null) {
  const ex = context?.execution
  const picks = context?.peer_instance_picks
  const preOpp = ex?.strategy_opportunity_id != null ? String(ex.strategy_opportunity_id) : ''
  const preInst = ex?.strategy_instance_id != null ? String(ex.strategy_instance_id) : ''
  let peerShortcut = ''
  if (picks?.length && preOpp && preInst) {
    const hit = picks.find(
      (p) => String(p.strategy_opportunity_id) === preOpp && String(p.strategy_instance_id) === preInst,
    )
    peerShortcut = hit ? `${hit.strategy_opportunity_id}::${hit.strategy_instance_id}` : ''
  }
  return {
    oppId: preOpp,
    instanceId: preInst,
    instanceMode: 'existing' as const,
    newOpenedAt: defaultOpenedAtFromExecution(ex),
    newLabel: '',
    peerShortcut,
  }
}

function LinkExecutionModalBody({
  context,
  opportunities,
  onClose,
  onSuccess,
}: Omit<Props, 'open'>) {
  const init = initLinkForm(context)
  const [oppId, setOppId] = useState(init.oppId)
  const [instanceMode, setInstanceMode] = useState<'existing' | 'new'>(init.instanceMode)
  const [instanceId, setInstanceId] = useState(init.instanceId)
  const [newOpenedAt, setNewOpenedAt] = useState(init.newOpenedAt)
  const [newLabel, setNewLabel] = useState(init.newLabel)
  const [peerShortcut, setPeerShortcut] = useState(init.peerShortcut)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ex = context?.execution
  const execId = context?.account_executions_id
  const peerPicks = context?.peer_instance_picks

  const oppIdNum = oppId.trim() ? Number(oppId) : null
  const { data: instancesData } = useQuery({
    queryKey: ['strategy', 'instances', 'link-modal', oppIdNum],
    queryFn: () => fetchStrategyInstances({ opportunityId: oppIdNum! }),
    enabled: oppIdNum != null && Number.isFinite(oppIdNum),
    staleTime: 30_000,
  })
  const instances = instancesData?.items ?? []

  const execSymbol = getUnderlyingSymbolFromExecution(ex)
  const filteredOpps = filterOpportunitiesBySymbol(opportunities, execSymbol)
  const symbolFiltered = !!execSymbol && filteredOpps.length < opportunities.length
  const executionAccountId = (ex?.account_id ?? '').trim()

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
      let finalInstanceId: number | null
      if (instanceMode === 'new') {
        if (!executionAccountId) {
          throw new Error('This execution has no account; create instance is not available.')
        }
        const dateStr = newOpenedAt.trim()
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          throw new Error('Opened at (date) is required.')
        }
        const res = await createStrategyInstance({
          strategy_opportunity_id: opp,
          account_id: executionAccountId,
          opened_at: `${dateStr}T12:00:00.000Z`,
          label: newLabel.trim() || undefined,
        })
        if (!res.ok) throw new Error(res.error ?? 'Failed to create instance')
        finalInstanceId = res.strategy_instance_id ?? null
      } else {
        const instRaw = instanceId.trim()
        finalInstanceId = instRaw && Number.isFinite(Number(instRaw)) ? Number(instRaw) : null
      }

      const updateRes = await updateExecution(execId, {
        strategy_opportunity_id: opp,
        strategy_instance_id: finalInstanceId,
      })
      if (!updateRes.ok) throw new Error(updateRes.error ?? 'Update failed')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const eTs = ex?.time != null ? Number(ex.time) : null

  return (
      <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2 space-y-1">
          <DialogTitle>Assign strategy</DialogTitle>
          {execId != null && (
            <p className="text-xs text-muted-foreground font-normal">
              Set strategy opportunity and instance for execution #{execId}. No new execution row is created.
            </p>
          )}
        </DialogHeader>

        {ex && (
          <p className="px-5 text-xs text-muted-foreground pb-2">
            {eTs != null && Number.isFinite(eTs) ? `${fmtDate(eTs)} · ` : ''}
            {ex.side ?? '—'} {executionQtyLabel(ex)} @ {ex.price != null ? fmtUsd(Number(ex.price)) : '—'} ·{' '}
            <ExecSourceBadge source={ex.source} />
          </p>
        )}

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {peerPicks && peerPicks.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Reuse from this contract</Label>
              <div className={cn(bubbleGroupClass(POSITIONS_BUBBLE_SIZE), 'flex-wrap')} role="radiogroup">
                {peerPicks.map((p) => {
                  const key = `${p.strategy_opportunity_id}::${p.strategy_instance_id}`
                  const isActive = peerShortcut === key
                  return (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={bubbleButtonClass(isActive, POSITIONS_BUBBLE_SIZE)}
                      title={p.label}
                      onClick={() => {
                        setPeerShortcut(key)
                        setOppId(String(p.strategy_opportunity_id))
                        setInstanceId(String(p.strategy_instance_id))
                        setInstanceMode('existing')
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Optional: apply strategy already used on another fill for this contract. You can still set them manually below.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              Strategy opportunity
              {symbolFiltered && execSymbol ? (
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                  {execSymbol}
                </Badge>
              ) : null}
            </Label>
            {filteredOpps.length > 0 ? (
              <div className={cn(bubbleGroupClass(POSITIONS_BUBBLE_SIZE), 'flex-wrap')} role="radiogroup">
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
                      className={bubbleButtonClass(isActive, POSITIONS_BUBBLE_SIZE)}
                      title={label}
                      onClick={() => {
                        setOppId(idStr)
                        setInstanceId('')
                        setPeerShortcut('')
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {symbolFiltered
                  ? `No opportunities match symbol ${execSymbol}. Check scope settings in Strategy / Opportunity.`
                  : 'No strategy opportunities loaded.'}
              </p>
            )}
          </div>

          {oppId ? (
            <div className="space-y-3 rounded-md border border-border/60 bg-muted/20 p-3">
              <div className={bubbleGroupClass(POSITIONS_BUBBLE_SIZE)} role="group" aria-label="Instance mode">
                <button
                  type="button"
                  className={cn(
                    bubbleButtonClass(instanceMode === 'existing', POSITIONS_BUBBLE_SIZE),
                  )}
                  onClick={() => setInstanceMode('existing')}
                >
                  Use existing
                </button>
                <button
                  type="button"
                  disabled={!executionAccountId}
                  title={!executionAccountId ? 'This execution has no account ID.' : undefined}
                  className={cn(
                    bubbleButtonClass(instanceMode === 'new', POSITIONS_BUBBLE_SIZE),
                    !executionAccountId && 'opacity-50 cursor-not-allowed',
                  )}
                  onClick={() => {
                    setInstanceMode('new')
                    setPeerShortcut('')
                  }}
                >
                  + Create new
                </button>
              </div>

              {instanceMode === 'existing' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="link-strategy-inst" className="text-xs">
                    Strategy instance
                  </Label>
                  <Select
                    value={instanceId || '__none__'}
                    onValueChange={(v) => {
                      setInstanceId(v === '__none__' ? '' : v)
                      setPeerShortcut('')
                    }}
                  >
                    <SelectTrigger id="link-strategy-inst" className="h-8 text-sm">
                      <SelectValue placeholder="— None —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {instances.map((inst) => (
                        <SelectItem
                          key={inst.strategy_instance_id}
                          value={String(inst.strategy_instance_id)}
                        >
                          {formatInstanceOpenedDate(inst)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {instances.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      No instances yet for this opportunity. Switch to &quot;Create new&quot; to add one.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="link-new-inst-date" className="text-xs">
                      Opened at
                    </Label>
                    <Input
                      id="link-new-inst-date"
                      type="date"
                      value={newOpenedAt}
                      onChange={(e) => setNewOpenedAt(e.target.value)}
                      className="h-8 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Account</span>
                    <p className="text-sm font-mono">{executionAccountId || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Uses this execution&apos;s account; not editable.
                    </p>
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
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {error ? (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !oppId || (instanceMode === 'new' && !executionAccountId)}
            >
              {submitting
                ? instanceMode === 'new'
                  ? 'Creating…'
                  : 'Saving…'
                : instanceMode === 'new'
                  ? 'Create & assign'
                  : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
  )
}

export function LinkExecutionModal({ open, context, opportunities, onClose, onSuccess }: Props) {
  const formKey = open
    ? String(context?.account_executions_id ?? 'closed')
    : 'closed'

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
