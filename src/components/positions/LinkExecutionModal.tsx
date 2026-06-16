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
import { fetchStrategyInstances, createStrategyInstance } from '@/api/strategy'
import { updateExecution } from '@/api/trading'
import { ExecSourceBadge, SegmentControl } from '@/components/data-display'
import {
  defaultOpenedAtFromExecution,
  executionQtyLabel,
  filterInstancesForOpportunity,
  filterOpportunitiesBySymbol,
  formatInstanceOpenedDate,
  getUnderlyingSymbolFromExecution,
} from '@/components/positions/linkExecutionModalHelpers'
import {
  linkExecDialogFooterClass,
  linkExecHintClass,
  linkExecInstancePanelClass,
  linkExecPillClass,
  linkExecPillSelectedClass,
  linkExecPillsClass,
  linkExecSectionClass,
  linkExecSectionLabelClass,
  linkExecSummaryClass,
  linkExecSymbolBadgeClass,
} from '@/components/positions/linkExecutionModalUi'
import type { PeerInstancePick } from '@/utils/ledger/ledgerOptHelpers'
import { opportunityIsActive } from '@/utils/strategyFormUtils'
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

const INSTANCE_MODE_OPTIONS = [
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

  const activeOpportunities = useMemo(
    () => opportunities.filter((o) => opportunityIsActive(o.is_active)),
    [opportunities],
  )

  const oppIdNum = oppId.trim() ? Number(oppId) : null
  const { data: instancesData, isLoading: instancesLoading } = useQuery({
    queryKey: ['strategy', 'instances', 'link-modal', oppIdNum],
    queryFn: () => fetchStrategyInstances({ opportunityId: oppIdNum! }),
    enabled: oppIdNum != null && Number.isFinite(oppIdNum),
    staleTime: 30_000,
  })
  const instances = useMemo(
    () => filterInstancesForOpportunity(instancesData?.items ?? [], oppIdNum),
    [instancesData?.items, oppIdNum],
  )

  const execSymbol = getUnderlyingSymbolFromExecution(ex)
  const filteredOpps = filterOpportunitiesBySymbol(activeOpportunities, execSymbol)
  const symbolFiltered = !!execSymbol && filteredOpps.length < activeOpportunities.length
  const executionAccountId = (ex?.account_id ?? '').trim()

  useEffect(() => {
    if (!instanceId || instances.length === 0) return
    const ok = instances.some((i) => String(i.strategy_instance_id) === instanceId)
    if (!ok) setInstanceId('')
  }, [instances, instanceId, oppIdNum])

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
        const created = await createStrategyInstance({
          strategy_opportunity_id: opp,
          account_id: executionAccountId,
          opened_at: `${dateStr}T12:00:00.000Z`,
          label: newLabel.trim() || undefined,
        })
        finalInstanceId = created.strategy_instance_id
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
  const useInstanceBubbles = instances.length > 0 && instances.length <= 12

  return (
    <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="space-y-1 border-b border-border bg-secondary/40 px-5 py-4">
        <DialogTitle>Assign strategy</DialogTitle>
        {execId != null && (
          <p className="text-xs font-normal text-muted-foreground">
            Set strategy opportunity and instance for execution #{execId}. No new execution row is created.
          </p>
        )}
      </DialogHeader>

      {ex && (
        <p className={cn(linkExecSummaryClass, 'border-b border-border px-5 py-2')}>
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
                const key = `${p.strategy_opportunity_id}::${p.strategy_instance_id}`
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
                      setInstanceId(String(p.strategy_instance_id))
                      setInstanceMode('existing')
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
            {symbolFiltered && execSymbol ? (
              <span className={linkExecSymbolBadgeClass} title={`Filtered by symbol ${execSymbol}`}>
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
            <p className={linkExecHintClass}>
              {symbolFiltered
                ? `No active opportunities match symbol ${execSymbol}. Check scope in Strategy / Opportunity.`
                : 'No active strategy opportunities loaded.'}
            </p>
          )}
        </div>

        {oppId ? (
          <div className={linkExecInstancePanelClass}>
            <SegmentControl
              size="sm"
              ariaLabel="Instance mode"
              value={instanceMode}
              onChange={(v) => {
                const mode = v as 'existing' | 'new'
                setInstanceMode(mode)
                if (mode === 'new') setPeerShortcut('')
              }}
              options={INSTANCE_MODE_OPTIONS.map((o) => ({
                ...o,
                disabled: o.value === 'new' && !executionAccountId,
              }))}
            />

            {instanceMode === 'existing' ? (
              <div className="space-y-2">
                <span className={linkExecSectionLabelClass}>Strategy instance</span>
                {instancesLoading ? (
                  <p className={linkExecHintClass}>Loading instances…</p>
                ) : instances.length === 0 ? (
                  <p className={linkExecHintClass}>
                    No instances for this opportunity. Switch to &quot;Create new&quot; to add one.
                  </p>
                ) : useInstanceBubbles ? (
                  <div className={linkExecPillsClass} role="radiogroup" aria-label="Strategy instance">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!instanceId}
                      className={cn(linkExecPillClass, !instanceId && linkExecPillSelectedClass)}
                      onClick={() => {
                        setInstanceId('')
                        setPeerShortcut('')
                      }}
                    >
                      — None —
                    </button>
                    {instances.map((inst) => {
                      const idStr = String(inst.strategy_instance_id)
                      const isActive = instanceId === idStr
                      const label = formatInstanceOpenedDate(inst)
                      return (
                        <button
                          key={inst.strategy_instance_id}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          className={cn(linkExecPillClass, isActive && linkExecPillSelectedClass)}
                          title={label}
                          onClick={() => {
                            setInstanceId(idStr)
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
                    value={instanceId || '__none__'}
                    onValueChange={(v) => {
                      setInstanceId(v === '__none__' ? '' : v)
                      setPeerShortcut('')
                    }}
                  >
                    <SelectTrigger id="link-strategy-inst" className="h-9 w-full text-sm">
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
