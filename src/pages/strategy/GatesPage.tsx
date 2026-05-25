import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Copy, Pencil, Star, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import {
  useGateSafetyList,
  useGateSafetyFull,
  useStrategyDims,
  useCreateGateSafety,
  useUpdateGateSafety,
  useSetActiveStrategy,
} from '@/hooks/useGateSafety'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { DEFAULT_GATES, DIM_TYPES, DIM_LABELS } from '@/utils/gateDefaults'
import type { GateSafetyPayload, GateSafetyItem } from '@/types/positions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function dimCells(item: GateSafetyItem): string {
  const vals = [
    item.dim_direction, item.dim_structure, item.dim_coverage,
    item.dim_risk, item.dim_volatility, item.dim_time,
  ].filter(Boolean) as string[]
  return vals.length > 0 ? vals.join(' · ') : '—'
}

// ---------------------------------------------------------------------------
// Reusable form field helpers
// ---------------------------------------------------------------------------

function NumberField({
  label, value, onChange, step, className,
}: {
  label: string
  value: number | undefined
  onChange: (v: number) => void
  step?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
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
  label, checked, onChange,
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

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type SheetMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: number } | { kind: 'copy'; id: number }

export default function GatesPage() {
  const { data: listData, isLoading: listLoading, isError: listError, error: listErr } = useGateSafetyList()
  const { data: statusData } = useMonitorStatus()
  const { data: dimsData } = useStrategyDims()
  const createMut = useCreateGateSafety()
  const updateMut = useUpdateGateSafety()
  const setActiveMut = useSetActiveStrategy()

  const [sheetMode, setSheetMode] = useState<SheetMode>({ kind: 'closed' })
  const sheetOpen = sheetMode.kind !== 'closed'
  const editId = sheetMode.kind === 'edit' ? sheetMode.id : null

  const items = useMemo(() => listData?.items ?? [], [listData])

  const activeGate = statusData?.strategy?.active?.gate_safety
  const activeAlloc = statusData?.strategy?.active?.allocation
  const activeStructure = statusData?.strategy?.active?.structure

  // -------------------------------------------------------------------------
  // Form state
  // -------------------------------------------------------------------------
  const [form, setForm] = useState<GateSafetyPayload>(buildEmptyPayload)
  const [earningsDates, setEarningsDates] = useState<string[]>([])

  const detailQuery = useGateSafetyFull(
    sheetMode.kind === 'edit' ? sheetMode.id
      : sheetMode.kind === 'copy' ? sheetMode.id
        : null,
  )

  useEffect(() => {
    if (sheetMode.kind === 'create') {
      setForm(buildEmptyPayload())
      setEarningsDates([])
    }
  }, [sheetMode.kind])

  useEffect(() => {
    if (detailQuery.data && (sheetMode.kind === 'edit' || sheetMode.kind === 'copy')) {
      const d = detailQuery.data
      const payload: GateSafetyPayload = {
        name: sheetMode.kind === 'copy' ? `${d.name} (copy)` : d.name,
        version: d.version,
        dim_direction: d.dim_direction ?? null,
        dim_structure: d.dim_structure ?? null,
        dim_coverage: d.dim_coverage ?? null,
        dim_risk: d.dim_risk ?? null,
        dim_volatility: d.dim_volatility ?? null,
        dim_time: d.dim_time ?? null,
        is_active: sheetMode.kind === 'copy' ? false : d.is_active,
        gates: deepClone(d.gates),
        earnings_dates: [...d.earnings_dates],
      }
      setForm(payload)
      setEarningsDates([...d.earnings_dates])
    }
  }, [detailQuery.data, sheetMode.kind])

  const setGateValue = useCallback((path: string, value: unknown) => {
    setForm((prev) => {
      const next = { ...prev, gates: deepClone(prev.gates) }
      setNestedValue(next.gates as unknown as Record<string, unknown>, path, value)
      return next
    })
  }, [])

  const gateVal = useCallback((path: string): unknown => {
    return getNestedValue(form.gates as unknown as Record<string, unknown>, path)
  }, [form.gates])

  const gateNum = useCallback((path: string): number | undefined => {
    const v = gateVal(path)
    return typeof v === 'number' ? v : undefined
  }, [gateVal])

  const gateBool = useCallback((path: string): boolean | undefined => {
    const v = gateVal(path)
    return typeof v === 'boolean' ? v : undefined
  }, [gateVal])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function openCreate() {
    setSheetMode({ kind: 'create' })
  }

  function openEdit(id: number) {
    setSheetMode({ kind: 'edit', id })
  }

  function openCopy(id: number) {
    setSheetMode({ kind: 'copy', id })
  }

  function closeSheet() {
    setSheetMode({ kind: 'closed' })
  }

  async function handleSubmit() {
    const payload: GateSafetyPayload = { ...form, earnings_dates: earningsDates }
    if (sheetMode.kind === 'edit') {
      await updateMut.mutateAsync({ id: sheetMode.id, payload })
    } else {
      await createMut.mutateAsync(payload)
    }
    closeSheet()
  }

  function handleSetActive(item: GateSafetyItem) {
    setActiveMut.mutate({
      active_strategy_structure_id: activeStructure?.id ?? null,
      active_gate_safety_strategy_id: item.gate_safety_strategy_id,
      active_strategy_allocation_id: activeAlloc?.id ?? null,
    })
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
  const detailLoading = (sheetMode.kind === 'edit' || sheetMode.kind === 'copy') && detailQuery.isLoading

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold">Gates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Risk gate configuration</p>
      </div>

      {/* Current active section */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">Active Strategy Configuration</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Gate Safety: </span>
              {activeGate?.id != null ? (
                <span className="font-medium">
                  {activeGate.name} <span className="text-muted-foreground font-mono text-xs">(#{activeGate.id})</span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Allocation: </span>
              {activeAlloc?.id != null ? (
                <span className="font-medium">
                  {activeAlloc.name} <span className="text-muted-foreground font-mono text-xs">(#{activeAlloc.id})</span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gate Safety Sets Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Gate Safety Sets</h2>
            <Badge variant="secondary">{items.length}</Badge>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create gate set
          </Button>
        </div>

        {listError && (
          <Alert variant="destructive">
            <AlertDescription>{(listErr as Error).message}</AlertDescription>
          </Alert>
        )}

        {listLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-48 rounded-md" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No gate safety sets found.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-14 text-right">Ver</TableHead>
                  <TableHead>Dimensions</TableHead>
                  <TableHead className="w-20 text-center">Active</TableHead>
                  <TableHead className="w-48 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isActive = activeGate?.id === item.gate_safety_strategy_id
                  return (
                    <TableRow key={item.gate_safety_strategy_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{item.gate_safety_strategy_id}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-xs text-muted-foreground">v{item.version}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{dimCells(item)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        {isActive ? (
                          <Badge variant="default" className="text-[10px]">Active</Badge>
                        ) : item.is_active ? (
                          <Badge variant="secondary" className="text-[10px]">Available</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openEdit(item.gate_safety_strategy_id)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => openCopy(item.gate_safety_strategy_id)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className={cn(
                              'h-7 px-2 text-xs',
                              isActive && 'text-amber-500',
                            )}
                            disabled={isActive || setActiveMut.isPending}
                            onClick={() => handleSetActive(item)}
                          >
                            <Star className={cn('h-3 w-3 mr-1', isActive && 'fill-current')} />
                            {isActive ? 'Active' : 'Set Active'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sheet Form */}
      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>
              {sheetMode.kind === 'edit' ? 'Edit Gate Safety Set' : 'Create Gate Safety Set'}
            </SheetTitle>
            <SheetDescription>
              {sheetMode.kind === 'edit'
                ? `Editing gate set #${editId}`
                : sheetMode.kind === 'copy'
                  ? 'Creating a copy of an existing gate set'
                  : 'Configure a new risk gate parameter set'}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{(submitError as Error).message}</AlertDescription>
                </Alert>
              )}

              {/* Group 1: Metadata */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
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

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {DIM_TYPES.map((dim) => (
                      <div key={dim} className="space-y-1">
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
                </CardContent>
              </Card>

              {/* Group 2: Strategy */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <CardTitle className="text-sm">Strategy — Structure &amp; Earnings</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberField label="min_dte" value={gateNum('strategy.structure.min_dte')} onChange={(v) => setGateValue('strategy.structure.min_dte', v)} />
                    <NumberField label="max_dte" value={gateNum('strategy.structure.max_dte')} onChange={(v) => setGateValue('strategy.structure.max_dte', v)} />
                    <NumberField label="atm_band_pct" value={gateNum('strategy.structure.atm_band_pct')} onChange={(v) => setGateValue('strategy.structure.atm_band_pct', v)} step={0.01} />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberField label="blackout_days_before" value={gateNum('strategy.earnings.blackout_days_before')} onChange={(v) => setGateValue('strategy.earnings.blackout_days_before', v)} />
                    <NumberField label="blackout_days_after" value={gateNum('strategy.earnings.blackout_days_after')} onChange={(v) => setGateValue('strategy.earnings.blackout_days_after', v)} />
                  </div>
                  <SwitchField
                    label="trading_hours_only"
                    checked={gateBool('strategy.trading_hours_only')}
                    onChange={(v) => setGateValue('strategy.trading_hours_only', v)}
                  />
                </CardContent>
              </Card>

              {/* Group 3: State */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <CardTitle className="text-sm">State — Delta, Market, Liquidity, System</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">Delta</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberField label="epsilon_band" value={gateNum('state.delta.epsilon_band')} onChange={(v) => setGateValue('state.delta.epsilon_band', v)} />
                    <NumberField label="threshold_hedge_shares" value={gateNum('state.delta.threshold_hedge_shares')} onChange={(v) => setGateValue('state.delta.threshold_hedge_shares', v)} />
                    <NumberField label="max_delta_limit" value={gateNum('state.delta.max_delta_limit')} onChange={(v) => setGateValue('state.delta.max_delta_limit', v)} />
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground font-medium">Market</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="vol_window_min" value={gateNum('state.market.vol_window_min')} onChange={(v) => setGateValue('state.market.vol_window_min', v)} />
                    <NumberField label="stale_ts_threshold_ms" value={gateNum('state.market.stale_ts_threshold_ms')} onChange={(v) => setGateValue('state.market.stale_ts_threshold_ms', v)} />
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground font-medium">Liquidity</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="wide_spread_pct" value={gateNum('state.liquidity.wide_spread_pct')} onChange={(v) => setGateValue('state.liquidity.wide_spread_pct', v)} step={0.01} />
                    <NumberField label="extreme_spread_pct" value={gateNum('state.liquidity.extreme_spread_pct')} onChange={(v) => setGateValue('state.liquidity.extreme_spread_pct', v)} step={0.01} />
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground font-medium">System</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="data_lag_threshold_ms" value={gateNum('state.system.data_lag_threshold_ms')} onChange={(v) => setGateValue('state.system.data_lag_threshold_ms', v)} />
                  </div>
                </CardContent>
              </Card>

              {/* Group 4: Intent */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <CardTitle className="text-sm">Intent — Hedge</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField label="min_hedge_shares" value={gateNum('intent.hedge.min_hedge_shares')} onChange={(v) => setGateValue('intent.hedge.min_hedge_shares', v)} />
                    <NumberField label="cooldown_seconds" value={gateNum('intent.hedge.cooldown_seconds')} onChange={(v) => setGateValue('intent.hedge.cooldown_seconds', v)} />
                    <NumberField label="max_hedge_shares_per_order" value={gateNum('intent.hedge.max_hedge_shares_per_order')} onChange={(v) => setGateValue('intent.hedge.max_hedge_shares_per_order', v)} />
                    <NumberField label="min_price_move_pct" value={gateNum('intent.hedge.min_price_move_pct')} onChange={(v) => setGateValue('intent.hedge.min_price_move_pct', v)} step={0.01} />
                  </div>
                </CardContent>
              </Card>

              {/* Group 5: Guard */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <CardTitle className="text-sm">Guard — Risk</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberField label="max_daily_hedge_count" value={gateNum('guard.risk.max_daily_hedge_count')} onChange={(v) => setGateValue('guard.risk.max_daily_hedge_count', v)} />
                    <NumberField label="max_position_shares" value={gateNum('guard.risk.max_position_shares')} onChange={(v) => setGateValue('guard.risk.max_position_shares', v)} />
                    <NumberField label="max_daily_loss_usd" value={gateNum('guard.risk.max_daily_loss_usd')} onChange={(v) => setGateValue('guard.risk.max_daily_loss_usd', v)} />
                    <NumberField label="max_net_delta_shares" value={gateNum('guard.risk.max_net_delta_shares')} onChange={(v) => setGateValue('guard.risk.max_net_delta_shares', v)} />
                    <NumberField label="max_spread_pct" value={gateNum('guard.risk.max_spread_pct')} onChange={(v) => setGateValue('guard.risk.max_spread_pct', v)} step={0.01} />
                  </div>
                  <SwitchField
                    label="paper_trade"
                    checked={gateBool('guard.risk.paper_trade')}
                    onChange={(v) => setGateValue('guard.risk.paper_trade', v)}
                  />
                </CardContent>
              </Card>

              {/* Group 6: Earnings Dates */}
              <Card>
                <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Earnings Dates</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addEarningsDate}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add date
                  </Button>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-2">
                  {earningsDates.length === 0 && (
                    <p className="text-xs text-muted-foreground">No earnings dates configured.</p>
                  )}
                  {earningsDates.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={d}
                        onChange={(e) => updateEarningsDate(idx, e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className="h-8 text-sm font-mono flex-1"
                      />
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEarningsDate(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          <SheetFooter className="border-t px-4 py-3">
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={closeSheet} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !form.name.trim()}
              >
                {submitting ? 'Saving…' : sheetMode.kind === 'edit' ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
