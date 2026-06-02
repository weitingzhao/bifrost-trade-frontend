import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { IconActionButton } from '@/components/data-display'
import {
  gatesEarningsRowClass,
  gatesFormFieldClass,
  gatesFormFooterClass,
  gatesFormGrid3Class,
  gatesFormGrid4Class,
  gatesFormGroupTitleClass,
  gatesFormHintClass,
  gatesFormPanelClass,
  gatesFormScrollClass,
  gatesFormSubheadingClass,
} from '@/components/strategy/gates/gatesFormUi'
import {
  useCreateGateSafety,
  useGateSafetyFull,
  useStrategyDims,
  useUpdateGateSafety,
} from '@/hooks/useGateSafety'
import { DEFAULT_GATES, DIM_TYPES, DIM_LABELS } from '@/utils/gateDefaults'
import type { GateSafetyPayload } from '@/types/positions'

export type GateSheetMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'copy'; id: number }

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur != null && typeof cur === 'object') return (cur as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let cur: Record<string, unknown> = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
}

function buildEmptyPayload(): GateSafetyPayload {
  return {
    name: '',
    version: 1,
    dim_direction: null,
    dim_structure: null,
    dim_coverage: null,
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    is_active: false,
    gates: deepClone(DEFAULT_GATES),
    earnings_dates: [],
  }
}

function NumberField({
  label,
  value,
  onChange,
  step,
  className,
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  step?: number
  className?: string
}) {
  return (
    <div className={cn(gatesFormFieldClass, className)}>
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step ?? 1}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 text-sm"
      />
    </div>
  )
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean | undefined
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked ?? false} onCheckedChange={onChange} />
    </div>
  )
}

export interface GateSafetyFormSheetProps {
  mode: GateSheetMode
  onClose: () => void
}

export function GateSafetyFormSheet({ mode, onClose }: GateSafetyFormSheetProps) {
  const { data: dimsData } = useStrategyDims()
  const createMut = useCreateGateSafety()
  const updateMut = useUpdateGateSafety()

  const sheetOpen = mode.kind !== 'closed'
  const editId = mode.kind === 'edit' ? mode.id : null

  const [form, setForm] = useState<GateSafetyPayload>(buildEmptyPayload)
  const [earningsDates, setEarningsDates] = useState<string[]>([])

  const detailQuery = useGateSafetyFull(
    mode.kind === 'edit' ? mode.id : mode.kind === 'copy' ? mode.id : null,
  )

  useEffect(() => {
    if (mode.kind === 'create') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(buildEmptyPayload())
      setEarningsDates([])
    }
  }, [mode.kind])

  useEffect(() => {
    if (detailQuery.data && (mode.kind === 'edit' || mode.kind === 'copy')) {
      const d = detailQuery.data
      const payload: GateSafetyPayload = {
        name: mode.kind === 'copy' ? `${d.name} (copy)` : d.name,
        version: d.version,
        dim_direction: d.dim_direction ?? null,
        dim_structure: d.dim_structure ?? null,
        dim_coverage: d.dim_coverage ?? null,
        dim_risk: d.dim_risk ?? null,
        dim_volatility: d.dim_volatility ?? null,
        dim_time: d.dim_time ?? null,
        is_active: mode.kind === 'copy' ? false : d.is_active,
        gates: deepClone(d.gates),
        earnings_dates: [...d.earnings_dates],
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(payload)
      setEarningsDates([...d.earnings_dates])
    }
  }, [detailQuery.data, mode.kind])

  const setGateValue = useCallback((path: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, gates: deepClone(prev.gates) }
      setNestedValue(next.gates as unknown as Record<string, unknown>, path, value)
      return next
    })
  }, [])

  const gateVal = useCallback(
    (path: string): unknown => {
      return getNestedValue(form.gates as unknown as Record<string, unknown>, path)
    },
    [form.gates],
  )

  const gateNum = useCallback(
    (path: string): number | undefined => {
      const v = gateVal(path)
      return typeof v === 'number' ? v : undefined
    },
    [gateVal],
  )

  const gateBool = useCallback(
    (path: string): boolean | undefined => {
      const v = gateVal(path)
      return typeof v === 'boolean' ? v : undefined
    },
    [gateVal],
  )

  async function handleSubmit() {
    const payload: GateSafetyPayload = { ...form, earnings_dates: earningsDates }
    if (mode.kind === 'edit') {
      await updateMut.mutateAsync({ id: mode.id, payload })
    } else if (mode.kind === 'create' || mode.kind === 'copy') {
      await createMut.mutateAsync(payload)
    }
    onClose()
  }

  function addEarningsDate() {
    setEarningsDates((prev) => [...prev, ''])
  }

  function removeEarningsDate(idx: number) {
    setEarningsDates((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEarningsDate(idx: number, val: string) {
    setEarningsDates((prev) => prev.map((d, i) => (i === idx ? val : d)))
  }

  const submitting = createMut.isPending || updateMut.isPending
  const submitError = createMut.error ?? updateMut.error
  const detailLoading =
    (mode.kind === 'edit' || mode.kind === 'copy') && detailQuery.isLoading

  return (
    <Sheet
      open={sheetOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[860px]"
      >
        <SheetHeader className="shrink-0 border-b px-6 pb-4 pt-5">
          <SheetTitle>
            {mode.kind === 'edit' ? 'Edit Gate Safety Set' : 'Create Gate Safety Set'}
          </SheetTitle>
          <SheetDescription>
            {mode.kind === 'edit'
              ? `Editing gate set #${editId}`
              : mode.kind === 'copy'
                ? 'Creating a copy of an existing gate set'
                : 'Configure a new risk gate parameter set'}
          </SheetDescription>
        </SheetHeader>

        {detailLoading ? (
          <div className="flex-1 space-y-3 p-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className={gatesFormScrollClass}>
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{(submitError as Error).message}</AlertDescription>
              </Alert>
            )}

            <div className={gatesFormPanelClass}>
              <h3 className={gatesFormGroupTitleClass}>Metadata</h3>
              <div className={gatesFormGrid4Class}>
                <div className={cn(gatesFormFieldClass, 'col-span-3')}>
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. NVDA Gamma Default"
                    className="h-8 text-sm"
                  />
                </div>
                <NumberField
                  label="Version"
                  value={form.version}
                  onChange={(v) => setForm((p) => ({ ...p, version: v }))}
                />
              </div>
              <Separator />
              <div className={gatesFormGrid3Class}>
                {DIM_TYPES.map((dim) => (
                  <div key={dim} className={gatesFormFieldClass}>
                    <Label className="text-xs">{DIM_LABELS[dim]}</Label>
                    <Select
                      value={form[dim] ?? '__none__'}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, [dim]: v === '__none__' ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {(dimsData?.by_type[dim] ?? []).map((d) => (
                          <SelectItem key={d.code} value={d.code}>
                            {d.display_label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <SwitchField
                label="Available (is_active)"
                checked={form.is_active}
                onChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </div>

            <div className={gatesFormPanelClass}>
              <h3 className={gatesFormGroupTitleClass}>Strategy — Structure &amp; Earnings</h3>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="min_dte"
                  value={gateNum('strategy.structure.min_dte')}
                  onChange={(v) => setGateValue('strategy.structure.min_dte', v)}
                />
                <NumberField
                  label="max_dte"
                  value={gateNum('strategy.structure.max_dte')}
                  onChange={(v) => setGateValue('strategy.structure.max_dte', v)}
                />
                <NumberField
                  label="atm_band_pct"
                  value={gateNum('strategy.structure.atm_band_pct')}
                  onChange={(v) => setGateValue('strategy.structure.atm_band_pct', v)}
                  step={0.01}
                />
              </div>
              <Separator />
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="blackout_days_before"
                  value={gateNum('strategy.earnings.blackout_days_before')}
                  onChange={(v) => setGateValue('strategy.earnings.blackout_days_before', v)}
                />
                <NumberField
                  label="blackout_days_after"
                  value={gateNum('strategy.earnings.blackout_days_after')}
                  onChange={(v) => setGateValue('strategy.earnings.blackout_days_after', v)}
                />
                <div />
              </div>
              <SwitchField
                label="trading_hours_only"
                checked={gateBool('strategy.trading_hours_only')}
                onChange={(v) => setGateValue('strategy.trading_hours_only', v)}
              />
            </div>

            <div className={gatesFormPanelClass}>
              <h3 className={gatesFormGroupTitleClass}>
                State — Delta / Market / Liquidity / System
              </h3>
              <p className={gatesFormSubheadingClass}>Delta</p>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="epsilon_band"
                  value={gateNum('state.delta.epsilon_band')}
                  onChange={(v) => setGateValue('state.delta.epsilon_band', v)}
                />
                <NumberField
                  label="threshold_hedge_shares"
                  value={gateNum('state.delta.threshold_hedge_shares')}
                  onChange={(v) => setGateValue('state.delta.threshold_hedge_shares', v)}
                />
                <NumberField
                  label="max_delta_limit"
                  value={gateNum('state.delta.max_delta_limit')}
                  onChange={(v) => setGateValue('state.delta.max_delta_limit', v)}
                />
              </div>
              <Separator />
              <p className={gatesFormSubheadingClass}>Market</p>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="vol_window_min"
                  value={gateNum('state.market.vol_window_min')}
                  onChange={(v) => setGateValue('state.market.vol_window_min', v)}
                />
                <NumberField
                  label="stale_ts_threshold_ms"
                  value={gateNum('state.market.stale_ts_threshold_ms')}
                  onChange={(v) => setGateValue('state.market.stale_ts_threshold_ms', v)}
                />
                <div />
              </div>
              <Separator />
              <p className={gatesFormSubheadingClass}>Liquidity</p>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="wide_spread_pct"
                  value={gateNum('state.liquidity.wide_spread_pct')}
                  onChange={(v) => setGateValue('state.liquidity.wide_spread_pct', v)}
                  step={0.01}
                />
                <NumberField
                  label="extreme_spread_pct"
                  value={gateNum('state.liquidity.extreme_spread_pct')}
                  onChange={(v) => setGateValue('state.liquidity.extreme_spread_pct', v)}
                  step={0.01}
                />
                <div />
              </div>
              <Separator />
              <p className={gatesFormSubheadingClass}>System</p>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="data_lag_threshold_ms"
                  value={gateNum('state.system.data_lag_threshold_ms')}
                  onChange={(v) => setGateValue('state.system.data_lag_threshold_ms', v)}
                />
                <div />
                <div />
              </div>
            </div>

            <div className={gatesFormPanelClass}>
              <h3 className={gatesFormGroupTitleClass}>Intent — Hedge</h3>
              <div className={gatesFormGrid4Class}>
                <NumberField
                  label="min_hedge_shares"
                  value={gateNum('intent.hedge.min_hedge_shares')}
                  onChange={(v) => setGateValue('intent.hedge.min_hedge_shares', v)}
                />
                <NumberField
                  label="cooldown_seconds"
                  value={gateNum('intent.hedge.cooldown_seconds')}
                  onChange={(v) => setGateValue('intent.hedge.cooldown_seconds', v)}
                />
                <NumberField
                  label="max_hedge_shares_per_order"
                  value={gateNum('intent.hedge.max_hedge_shares_per_order')}
                  onChange={(v) => setGateValue('intent.hedge.max_hedge_shares_per_order', v)}
                />
                <NumberField
                  label="min_price_move_pct"
                  value={gateNum('intent.hedge.min_price_move_pct')}
                  onChange={(v) => setGateValue('intent.hedge.min_price_move_pct', v)}
                  step={0.01}
                />
              </div>
            </div>

            <div className={gatesFormPanelClass}>
              <h3 className={gatesFormGroupTitleClass}>Guard — Risk</h3>
              <div className={gatesFormGrid3Class}>
                <NumberField
                  label="max_daily_hedge_count"
                  value={gateNum('guard.risk.max_daily_hedge_count')}
                  onChange={(v) => setGateValue('guard.risk.max_daily_hedge_count', v)}
                />
                <NumberField
                  label="max_position_shares"
                  value={gateNum('guard.risk.max_position_shares')}
                  onChange={(v) => setGateValue('guard.risk.max_position_shares', v)}
                />
                <NumberField
                  label="max_daily_loss_usd"
                  value={gateNum('guard.risk.max_daily_loss_usd')}
                  onChange={(v) => setGateValue('guard.risk.max_daily_loss_usd', v)}
                />
                <NumberField
                  label="max_net_delta_shares"
                  value={gateNum('guard.risk.max_net_delta_shares')}
                  onChange={(v) => setGateValue('guard.risk.max_net_delta_shares', v)}
                />
                <NumberField
                  label="max_spread_pct"
                  value={gateNum('guard.risk.max_spread_pct')}
                  onChange={(v) => setGateValue('guard.risk.max_spread_pct', v)}
                  step={0.01}
                />
                <div />
              </div>
              <SwitchField
                label="paper_trade"
                checked={gateBool('guard.risk.paper_trade')}
                onChange={(v) => setGateValue('guard.risk.paper_trade', v)}
              />
            </div>

            <div className={gatesFormPanelClass}>
              <div className="flex items-center justify-between gap-2">
                <h3 className={gatesFormGroupTitleClass}>Earnings Dates</h3>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addEarningsDate}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add date
                </Button>
              </div>
              {earningsDates.length === 0 && (
                <p className={gatesFormHintClass}>No earnings dates configured.</p>
              )}
              <div className={gatesFormGrid3Class}>
                {earningsDates.map((d, idx) => (
                  <div key={idx} className={gatesEarningsRowClass}>
                    <Input
                      value={d}
                      onChange={(e) => updateEarningsDate(idx, e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="h-8 flex-1 font-mono text-sm"
                    />
                    <IconActionButton
                      title="Remove earnings date"
                      ariaLabel={`Remove earnings date row ${idx + 1}`}
                      tone="danger"
                      onClick={() => removeEarningsDate(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconActionButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="shrink-0 border-t px-6 py-3">
          <div className={gatesFormFooterClass}>
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSubmit()}
              disabled={submitting || !form.name.trim()}
            >
              {submitting ? 'Saving…' : mode.kind === 'edit' ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
