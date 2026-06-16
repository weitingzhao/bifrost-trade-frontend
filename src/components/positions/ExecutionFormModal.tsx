import { useId, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SegmentControl } from '@/components/data-display'
import { updateExecution, createExecution } from '@/api/trading'
import { fetchOpportunities, fetchStrategyInstances } from '@/api/strategy'
import { formatInstanceOpenedDate } from '@/components/positions/linkExecutionModalHelpers'
import type { Execution, StrategyInstance, CreateExecutionBody, UpdateExecutionBody } from '@/types/positions'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  exec: Execution | null
  accountOptions: string[]
  createSource?: 'manual' | 'journal_closed'
  onClose: () => void
  onSuccess: () => void
}

const FORM_LABEL = 'min-w-[88px] shrink-0 text-xs text-muted-foreground'

function ExecFormRow({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <span className={FORM_LABEL}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function ExecMetricField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string
  htmlFor: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 flex-1 min-w-0', className)}>
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground font-normal">
        {label}
      </Label>
      {children}
    </div>
  )
}

function initFormFromExec(exec: Execution | null, accountOptions: string[]) {
  const defaultAccount = accountOptions[0] ?? ''
  if (!exec?.account_executions_id) {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const defaultTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    return {
      accountId: exec?.account_id?.trim() || defaultAccount,
      symbol: exec?.symbol ?? '',
      secType: (exec?.sec_type === 'OPT' ? 'OPT' : 'STK') as 'STK' | 'OPT',
      side: (exec?.side === 'Sell' ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
      quantity: '',
      price: exec?.price != null && exec.price !== 0 ? String(exec.price) : '',
      execTime: defaultTime,
      expiry: exec?.expiry ?? '',
      strike: exec?.strike != null ? String(exec.strike) : '',
      right: ((exec?.right ?? exec?.option_right ?? 'C').toString().toUpperCase().slice(0, 1) === 'P' ? 'P' : 'C') as 'C' | 'P',
      commission: '',
      realizedPnl: '',
      currency: 'USD',
      strategyOpportunityId: '',
      strategyInstanceId: '',
      useInstanceSplits: false,
      splitRows: [] as Array<{ uid: string; strategyInstanceId: string; allocatedQuantity: string }>,
    }
  }

  const sideRaw = (exec.side ?? 'BUY').toUpperCase()
  const isSell = sideRaw === 'SELL' || sideRaw === 'SLD' || sideRaw === 'S'
  const qty = Math.abs(Number(exec.quantity ?? exec.qty) || 0)
  const r = (exec.right ?? exec.option_right ?? 'C').toString().toUpperCase().slice(0, 1)
  const ia = exec.instance_allocations

  return {
    accountId: exec.account_id ?? '',
    symbol: exec.symbol ?? '',
    secType: (exec.sec_type === 'OPT' ? 'OPT' : 'STK') as 'STK' | 'OPT',
    side: (isSell ? 'SELL' : 'BUY') as 'BUY' | 'SELL',
    quantity: qty > 0 ? String(qty) : '',
    price: exec.price != null ? String(exec.price) : '',
    execTime: exec.time ? new Date(exec.time * 1000).toISOString().slice(0, 16) : '',
    expiry: exec.expiry ?? '',
    strike: exec.strike != null ? String(exec.strike) : '',
    right: (r === 'P' ? 'P' : 'C') as 'C' | 'P',
    commission: exec.commission != null ? String(exec.commission) : '',
    realizedPnl: exec.realized_pnl != null ? String(exec.realized_pnl) : '',
    currency: (exec as Execution & { currency?: string }).currency?.trim() || 'USD',
    strategyOpportunityId: exec.strategy_opportunity_id != null ? String(exec.strategy_opportunity_id) : '',
    strategyInstanceId: exec.strategy_instance_id != null ? String(exec.strategy_instance_id) : '',
    useInstanceSplits: Boolean(ia && ia.length > 0),
    splitRows:
      ia && ia.length > 0
        ? ia.map((a, i) => ({
            uid: `split-${exec.account_executions_id ?? 'x'}-${i}`,
            strategyInstanceId: String(a.strategy_instance_id),
            allocatedQuantity: String(a.allocated_quantity),
          }))
        : [],
  }
}

function ExecutionFormModalBody({
  exec,
  accountOptions,
  createSource = 'manual',
  onClose,
  onSuccess,
}: Omit<Props, 'open'>) {
  const init = initFormFromExec(exec, accountOptions)
  const splitSectionId = useId()

  const [accountId, setAccountId] = useState(init.accountId)
  const [symbol, setSymbol] = useState(init.symbol)
  const [secType, setSecType] = useState<'STK' | 'OPT'>(init.secType)
  const [side, setSide] = useState<'BUY' | 'SELL'>(init.side)
  const [quantity, setQuantity] = useState(init.quantity)
  const [price, setPrice] = useState(init.price)
  const [execTime, setExecTime] = useState(init.execTime)
  const [expiry, setExpiry] = useState(init.expiry)
  const [strike, setStrike] = useState(init.strike)
  const [right, setRight] = useState<'C' | 'P'>(init.right)
  const [commission, setCommission] = useState(init.commission)
  const [realizedPnl, setRealizedPnl] = useState(init.realizedPnl)
  const [currency, setCurrency] = useState(init.currency)
  const [strategyOpportunityId, setStrategyOpportunityId] = useState(init.strategyOpportunityId)
  const [strategyInstanceId, setStrategyInstanceId] = useState(init.strategyInstanceId)
  const [useInstanceSplits, setUseInstanceSplits] = useState(init.useInstanceSplits)
  const [splitRows, setSplitRows] = useState(init.splitRows)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreate = !exec?.account_executions_id
  const isJournal = isCreate && createSource === 'journal_closed'
  const lockContractContext = isJournal && Boolean(init.symbol.trim())

  const { data: oppsData } = useQuery({
    queryKey: ['strategy', 'opportunities', 'exec-form'],
    queryFn: () => fetchOpportunities(true),
    staleTime: 60_000,
  })
  const opportunities = oppsData?.items ?? []

  const oppIdNum = strategyOpportunityId.trim() ? Number(strategyOpportunityId) : null
  const { data: instancesData } = useQuery({
    queryKey: ['strategy', 'instances', 'exec-form', oppIdNum],
    queryFn: () => fetchStrategyInstances({ opportunityId: oppIdNum! }),
    enabled: oppIdNum != null && Number.isFinite(oppIdNum),
    staleTime: 30_000,
  })
  const instances = instancesData?.items ?? []

  const accountTrimmed = accountId.trim()
  const { data: accountInstancesData } = useQuery({
    queryKey: ['strategy', 'instances', 'exec-form-account', accountTrimmed],
    queryFn: () => fetchStrategyInstances({ accountId: accountTrimmed }),
    enabled: Boolean(accountTrimmed),
    staleTime: 30_000,
  })
  const allInstancesForAccount = accountInstancesData?.items ?? []

  function instanceLabel(si: StrategyInstance): string {
    return si.label?.trim() || formatInstanceOpenedDate(si)
  }

  function buildContractKey(sym: string): string | undefined {
    if (secType !== 'OPT') return undefined
    const rawStrike = strike ? Number(strike) : 0
    const strikeStr = Number.isFinite(rawStrike) ? rawStrike.toFixed(1) : '0.0'
    return `${sym}|OPT|${expiry || ''}|${strikeStr}|${right}`
  }

  function signedQuantity(q: number): number {
    return side === 'SELL' ? -Math.abs(q) : Math.abs(q)
  }

  function resolveSplitAllocations(
    quantityForDb: number,
  ): { instance_allocations: { strategy_instance_id: number; allocated_quantity: number }[] } | null {
    if (!useInstanceSplits) return null
    if (splitRows.length === 0) {
      return { instance_allocations: [] }
    }
    const allocs: { strategy_instance_id: number; allocated_quantity: number }[] = []
    for (const row of splitRows) {
      const si = Number(row.strategyInstanceId)
      const aq = Number(row.allocatedQuantity)
      if (!Number.isFinite(si) || !Number.isFinite(aq)) {
        throw new Error('Each split row needs a valid instance and allocated quantity.')
      }
      allocs.push({ strategy_instance_id: si, allocated_quantity: aq })
    }
    const sum = allocs.reduce((s, x) => s + x.allocated_quantity, 0)
    if (Math.abs(sum - quantityForDb) > 1e-4 * Math.max(1, Math.abs(quantityForDb))) {
      throw new Error(`Split quantities must sum to the execution quantity (${quantityForDb}).`)
    }
    return { instance_allocations: allocs }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const sym = symbol.trim().toUpperCase()
      const q = Math.abs(Number(quantity))
      const p = Number(price)
      if (!sym || !Number.isFinite(q) || q <= 0 || !Number.isFinite(p)) {
        throw new Error('Fill symbol, quantity (> 0), and price.')
      }
      if (secType === 'OPT') {
        const strikeNum = strike !== '' ? Number(strike) : NaN
        if (!Number.isFinite(strikeNum) || strikeNum <= 0) {
          throw new Error('Option strike is required and must be > 0.')
        }
      }

      const timeEpoch = execTime
        ? Math.floor(new Date(execTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000)
      const quantityForDb = signedQuantity(q)
      const contractKey = buildContractKey(sym)

      const strategyOpp =
        strategyOpportunityId.trim() && Number.isFinite(Number(strategyOpportunityId))
          ? Number(strategyOpportunityId)
          : undefined
      const strategyInst =
        strategyInstanceId.trim() && Number.isFinite(Number(strategyInstanceId))
          ? Number(strategyInstanceId)
          : undefined

      const splitPayload = resolveSplitAllocations(quantityForDb)

      if (isCreate) {
        const body: CreateExecutionBody = {
          account_id: accountId.trim(),
          time: timeEpoch,
          symbol: sym,
          sec_type: secType,
          side,
          quantity: quantityForDb,
          price: p,
          source: isJournal ? 'journal_closed' : 'manual',
          expiry: expiry.trim() || undefined,
          strike: strike ? Number(strike) : undefined,
          option_right: secType === 'OPT' ? right : undefined,
          contract_key: contractKey,
          commission: commission.trim() ? Number(commission) : undefined,
          realized_pnl: realizedPnl.trim() ? Number(realizedPnl) : undefined,
          currency: currency.trim() || undefined,
          ...(splitPayload ?? {
            strategy_opportunity_id: strategyOpp,
            strategy_instance_id: strategyInst,
          }),
        }
        const res = await createExecution(body)
        if (!res.ok) throw new Error(res.error ?? 'Add failed')
      } else {
        const body: UpdateExecutionBody = {
          account_id: accountId.trim(),
          exec_time: timeEpoch,
          symbol: sym,
          sec_type: secType,
          side,
          quantity: quantityForDb,
          price: p,
          strike: strike ? Number(strike) : undefined,
          option_right: secType === 'OPT' ? right : undefined,
          contract_key: contractKey,
          commission: commission.trim() ? Number(commission) : undefined,
          realized_pnl: realizedPnl.trim() ? Number(realizedPnl) : undefined,
          currency: currency.trim() || undefined,
          ...(splitPayload ?? {
            strategy_opportunity_id: strategyOpp,
            strategy_instance_id: strategyInst,
          }),
        }
        const expiryTrimmed = expiry.trim()
        if (secType === 'OPT' && expiryTrimmed && /^\d{6,8}$/.test(expiryTrimmed)) {
          body.expiry = expiryTrimmed
        }
        const res = await updateExecution(exec!.account_executions_id!, body)
        if (!res.ok) throw new Error(res.error ?? 'Update failed')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'h-8 text-sm w-full'

  return (
    <DialogContent className="max-w-[720px] max-h-[90vh] overflow-y-auto gap-0 p-0">
      <DialogHeader className="px-5 pt-5 pb-3 space-y-1">
        <DialogTitle>
          {isCreate ? (isJournal ? 'Add journal' : 'Add history') : 'Edit execution'}
        </DialogTitle>
      </DialogHeader>

      {isJournal && (
        <p className="px-5 text-xs text-muted-foreground pb-2">
          Manual journal entry: stored as{' '}
          <code className="font-mono text-dense-meta">journal_closed</code> in the journal execution store.
          Use only when IB / Flex cannot supply the fill.
        </p>
      )}

      <form onSubmit={handleSubmit} className="px-5 pb-5 flex flex-col gap-2 min-w-0">
        <ExecFormRow label="Account">
          {lockContractContext ? (
            <Input readOnly value={accountId} className={cn(inputClass, 'bg-muted text-muted-foreground')} />
          ) : (
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className={inputClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountOptions.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </ExecFormRow>

        <ExecFormRow label="Strategy (optional)">
          <Select
            value={strategyOpportunityId || '__none__'}
            onValueChange={(v) => {
              setStrategyOpportunityId(v === '__none__' ? '' : v)
              setStrategyInstanceId('')
            }}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {opportunities.map((o) => (
                <SelectItem key={o.strategy_opportunity_id} value={String(o.strategy_opportunity_id)}>
                  {o.name?.trim() || `#${o.strategy_opportunity_id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ExecFormRow>

        <ExecFormRow label="Instance (optional)">
          <Select
            value={strategyInstanceId || '__none__'}
            onValueChange={(v) => {
              const instanceId = v === '__none__' ? '' : v
              const instance = instanceId
                ? instances.find((si) => String(si.strategy_instance_id) === instanceId)
                : null
              setStrategyInstanceId(instanceId)
              if (instance && !strategyOpportunityId.trim()) {
                setStrategyOpportunityId(String(instance.strategy_opportunity_id))
              }
            }}
          >
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {instances.map((si) => (
                <SelectItem key={si.strategy_instance_id} value={String(si.strategy_instance_id)}>
                  {instanceLabel(si)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ExecFormRow>

        <div className="flex flex-col gap-2 w-full min-w-0">
          <ExecFormRow label={<span id={splitSectionId}>Multi-instance split</span>}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox
                  checked={useInstanceSplits}
                  onCheckedChange={(checked) => {
                    const on = checked === true
                    setUseInstanceSplits(on)
                    if (on && splitRows.length === 0) {
                      setSplitRows([{ uid: `new-${Date.now()}`, strategyInstanceId: '', allocatedQuantity: '' }])
                    }
                  }}
                  aria-describedby={splitSectionId}
                />
                Split quantity across instances
              </label>
              {useInstanceSplits && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSplitRows((rows) => [
                      ...rows,
                      { uid: `new-${Date.now()}-${rows.length}`, strategyInstanceId: '', allocatedQuantity: '' },
                    ])
                  }
                >
                  Add row
                </Button>
              )}
            </div>
          </ExecFormRow>
          {useInstanceSplits && (
            <>
              <p className="text-dense-meta text-muted-foreground pl-[96px]">
                Signed quantities must sum to the execution quantity. Saving with splits enabled and no rows clears
                allocation rows. Single Strategy / Instance fields are ignored when splits are saved.
              </p>
              <div className="flex flex-col gap-2 max-h-[min(42vh,320px)] overflow-y-auto pl-[96px] min-w-0">
                {splitRows.map((row) => (
                  <div key={row.uid} className="flex flex-wrap items-center gap-2 min-w-0">
                    <Select
                      value={row.strategyInstanceId || '__none__'}
                      onValueChange={(v) =>
                        setSplitRows((rows) =>
                          rows.map((r) =>
                            r.uid === row.uid
                              ? { ...r, strategyInstanceId: v === '__none__' ? '' : v }
                              : r,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-sm flex-1 min-w-[12rem]">
                        <SelectValue placeholder="— Instance —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Instance —</SelectItem>
                        {allInstancesForAccount.map((si) => (
                          <SelectItem key={si.strategy_instance_id} value={String(si.strategy_instance_id)}>
                            {instanceLabel(si)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      step="any"
                      value={row.allocatedQuantity}
                      onChange={(e) =>
                        setSplitRows((rows) =>
                          rows.map((r) =>
                            r.uid === row.uid ? { ...r, allocatedQuantity: e.target.value } : r,
                          ),
                        )
                      }
                      placeholder="Signed qty"
                      aria-label="Allocated quantity"
                      className="h-8 text-sm font-mono w-32 shrink-0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSplitRows((rows) => rows.filter((r) => r.uid !== row.uid))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <ExecFormRow label="Time">
          <Input
            type="datetime-local"
            value={execTime}
            onChange={(e) => setExecTime(e.target.value)}
            className={inputClass}
            required
          />
        </ExecFormRow>

        <ExecFormRow label="Symbol">
          {lockContractContext ? (
            <Input readOnly value={symbol} className={cn(inputClass, 'font-mono bg-muted text-muted-foreground')} />
          ) : (
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className={cn(inputClass, 'font-mono')}
              placeholder="e.g. NVDA"
              required
            />
          )}
        </ExecFormRow>

        <ExecFormRow label="Type">
          {lockContractContext ? (
            <SegmentControl
              options={[{ value: 'STK', label: 'STK' }]}
              value="STK"
              onChange={() => undefined}
              ariaLabel="Security type"
            />
          ) : (
            <SegmentControl
              options={[
                { value: 'STK', label: 'STK' },
                { value: 'OPT', label: 'OPT' },
              ]}
              value={secType}
              onChange={(v) => setSecType(v as 'STK' | 'OPT')}
              ariaLabel="Security type"
            />
          )}
        </ExecFormRow>

        <ExecFormRow label="Side">
          <SegmentControl
            options={[
              { value: 'BUY', label: 'Buy' },
              { value: 'SELL', label: 'Sell' },
            ]}
            value={side}
            onChange={(v) => setSide(v as 'BUY' | 'SELL')}
            ariaLabel="Side"
          />
        </ExecFormRow>

        <div className="flex flex-wrap items-end gap-2 min-w-0">
          <ExecMetricField label="Quantity" htmlFor="exec-qty">
            <Input
              id="exec-qty"
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={cn(inputClass, 'font-mono')}
              required
            />
          </ExecMetricField>
          <ExecMetricField label="Price" htmlFor="exec-price">
            <Input
              id="exec-price"
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={cn(inputClass, 'font-mono')}
              required
            />
          </ExecMetricField>
          <ExecMetricField label="Commission" htmlFor="exec-comm">
            <Input
              id="exec-comm"
              type="number"
              step="any"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className={cn(inputClass, 'font-mono')}
              placeholder="Optional"
            />
          </ExecMetricField>
        </div>

        {secType === 'OPT' && (
          <>
            <ExecFormRow label="Expiry (YYYYMMDD)">
              <Input
                value={expiry}
                onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className={cn(inputClass, 'font-mono')}
                placeholder="20251219"
              />
            </ExecFormRow>
            <ExecFormRow label="STRIKE">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                className={cn(inputClass, 'font-mono')}
                required
                placeholder="Required, > 0"
              />
            </ExecFormRow>
            <ExecFormRow label="Right">
              <div className="flex items-center gap-4 text-sm">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exec-option-right"
                    value="C"
                    checked={right === 'C'}
                    onChange={() => setRight('C')}
                    className="accent-primary"
                  />
                  Call
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="exec-option-right"
                    value="P"
                    checked={right === 'P'}
                    onChange={() => setRight('P')}
                    className="accent-primary"
                  />
                  Put
                </label>
              </div>
            </ExecFormRow>
          </>
        )}

        <div className="flex flex-wrap items-end gap-2 min-w-0">
          <ExecMetricField label="Realized PnL" htmlFor="exec-realized">
            <Input
              id="exec-realized"
              type="number"
              step="any"
              value={realizedPnl}
              onChange={(e) => setRealizedPnl(e.target.value)}
              className={cn(inputClass, 'font-mono')}
              placeholder="Optional"
            />
          </ExecMetricField>
          <ExecMetricField label="Currency" htmlFor="exec-ccy" className="flex-none max-w-[10rem]">
            <Input
              id="exec-ccy"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputClass}
              placeholder="USD"
            />
          </ExecMetricField>
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting
              ? isCreate
                ? 'Adding…'
                : 'Saving…'
              : isCreate
                ? isJournal
                  ? 'Add journal'
                  : 'Add'
                : 'Save'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

export function ExecutionFormModal({
  open,
  exec,
  accountOptions,
  createSource = 'manual',
  onClose,
  onSuccess,
}: Props) {
  const formKey = open
    ? String(exec?.account_executions_id ?? createSource)
    : 'closed'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      {open && exec ? (
        <ExecutionFormModalBody
          key={formKey}
          exec={exec}
          accountOptions={accountOptions}
          createSource={createSource}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  )
}
