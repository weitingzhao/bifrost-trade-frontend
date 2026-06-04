import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import styles from '@/components/strategy/gates/gatesForm.module.css'
import {
  useCreateGateSafety,
  useGateSafetyFull,
  useStrategyDims,
  useUpdateGateSafety,
} from '@/hooks/useGateSafety'
import { DEFAULT_GATES, DIM_TYPES, DIM_LABELS, type DimFieldName } from '@/utils/gateDefaults'
import type { GateSafetyPayload } from '@/types/positions'

export type GateSheetMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'copy'; id: number }

const DIM_TIME_LABEL = 'Time horizon'

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

function GateNumberRow({
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
    <div className={cn(styles.formRow, className)}>
      <label>{label}</label>
      <input
        type="number"
        step={step ?? 1}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function GateSwitchRow({
  label,
  checked,
  onChange,
  className,
}: {
  label: string
  checked: boolean | undefined
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <div className={cn(styles.formRow, styles.formRowFull, className)}>
      <label className={styles.toggleRow}>
        <Switch checked={checked ?? false} onCheckedChange={onChange} aria-label={label} />
        <span>{label}</span>
      </label>
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

  if (mode.kind === 'closed') return null

  const panelTitle =
    mode.kind === 'create' || mode.kind === 'copy'
      ? 'New gate set'
      : `Edit gate set ${editId}`

  return (
    <section className={styles.formSection}>
      <div className={styles.stickyHeader}>
        <h3 className={styles.headerTitle}>{panelTitle}</h3>
        {detailLoading && !form.name && (
          <p className={styles.headerHint}>Loading…</p>
        )}
        {submitError && (
          <Alert variant="destructive" className={styles.errorAlert}>
            <AlertDescription>{(submitError as Error).message}</AlertDescription>
          </Alert>
        )}
      </div>

      {!detailLoading && (
        <div className={styles.formGrid}>
          <div className={cn(styles.formGroup, styles.metadataRoot)}>
            <h4 className={styles.metadataTitle}>Metadata</h4>
            <div className={styles.formRow}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Gate set name"
              />
            </div>
            <div className={styles.formRow}>
              <label>Version</label>
              <input
                type="number"
                min={1}
                value={form.version ?? 1}
                onChange={(e) =>
                  setForm((p) => ({ ...p, version: parseInt(e.target.value, 10) || 1 }))
                }
              />
            </div>
            <p className={styles.metadataHint}>
              Optional filters by strategy dimensions. Leave blank to apply broadly.
            </p>
            {DIM_TYPES.map((dim) => (
              <div key={dim} className={styles.formRow}>
                <label>{dim === 'dim_time' ? DIM_TIME_LABEL : DIM_LABELS[dim as DimFieldName]}</label>
                <select
                  value={form[dim] ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [dim]: e.target.value.trim() || null,
                    }))
                  }
                  aria-label={dim === 'dim_time' ? DIM_TIME_LABEL : DIM_LABELS[dim as DimFieldName]}
                >
                  <option value="">— Any</option>
                  {(dimsData?.by_type[dim] ?? []).map((d) => (
                    <option key={d.strategy_dim_id} value={d.code}>
                      {d.display_label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className={cn(styles.formRow, styles.formRowFull)}>
              <label className={styles.toggleRow}>
                <Switch
                  checked={form.is_active ?? false}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
                  aria-label="Active"
                />
                <span>Active</span>
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <h4 className={styles.groupTitle}>Strategy (structure &amp; earnings)</h4>
            <GateNumberRow
              label="min_dte"
              value={gateNum('strategy.structure.min_dte')}
              onChange={(v) => setGateValue('strategy.structure.min_dte', v)}
            />
            <GateNumberRow
              label="max_dte"
              value={gateNum('strategy.structure.max_dte')}
              onChange={(v) => setGateValue('strategy.structure.max_dte', v)}
            />
            <GateNumberRow
              label="atm_band_pct"
              value={gateNum('strategy.structure.atm_band_pct')}
              onChange={(v) => setGateValue('strategy.structure.atm_band_pct', v)}
              step={0.01}
            />
            <GateNumberRow
              label="blackout_days_before"
              value={gateNum('strategy.earnings.blackout_days_before')}
              onChange={(v) => setGateValue('strategy.earnings.blackout_days_before', v)}
            />
            <GateNumberRow
              label="blackout_days_after"
              value={gateNum('strategy.earnings.blackout_days_after')}
              onChange={(v) => setGateValue('strategy.earnings.blackout_days_after', v)}
            />
            <GateSwitchRow
              label="trading_hours_only"
              checked={gateBool('strategy.trading_hours_only')}
              onChange={(v) => setGateValue('strategy.trading_hours_only', v)}
            />
          </div>

          <div className={styles.formGroup}>
            <h4 className={styles.groupTitle}>State (delta, market, liquidity, system)</h4>
            <GateNumberRow
              label="epsilon_band"
              value={gateNum('state.delta.epsilon_band')}
              onChange={(v) => setGateValue('state.delta.epsilon_band', v)}
            />
            <GateNumberRow
              label="threshold_hedge_shares"
              value={gateNum('state.delta.threshold_hedge_shares')}
              onChange={(v) => setGateValue('state.delta.threshold_hedge_shares', v)}
            />
            <GateNumberRow
              label="max_delta_limit"
              value={gateNum('state.delta.max_delta_limit')}
              onChange={(v) => setGateValue('state.delta.max_delta_limit', v)}
            />
            <GateNumberRow
              label="vol_window_min"
              value={gateNum('state.market.vol_window_min')}
              onChange={(v) => setGateValue('state.market.vol_window_min', v)}
            />
            <GateNumberRow
              label="stale_ts_threshold_ms"
              value={gateNum('state.market.stale_ts_threshold_ms')}
              onChange={(v) => setGateValue('state.market.stale_ts_threshold_ms', v)}
            />
            <GateNumberRow
              label="wide_spread_pct"
              value={gateNum('state.liquidity.wide_spread_pct')}
              onChange={(v) => setGateValue('state.liquidity.wide_spread_pct', v)}
              step={0.01}
            />
            <GateNumberRow
              label="extreme_spread_pct"
              value={gateNum('state.liquidity.extreme_spread_pct')}
              onChange={(v) => setGateValue('state.liquidity.extreme_spread_pct', v)}
              step={0.01}
            />
            <GateNumberRow
              label="data_lag_threshold_ms"
              value={gateNum('state.system.data_lag_threshold_ms')}
              onChange={(v) => setGateValue('state.system.data_lag_threshold_ms', v)}
            />
          </div>

          <div className={styles.formGroup}>
            <h4 className={styles.groupTitle}>Intent (hedge)</h4>
            <GateNumberRow
              label="min_hedge_shares"
              value={gateNum('intent.hedge.min_hedge_shares')}
              onChange={(v) => setGateValue('intent.hedge.min_hedge_shares', v)}
            />
            <GateNumberRow
              label="cooldown_seconds"
              value={gateNum('intent.hedge.cooldown_seconds')}
              onChange={(v) => setGateValue('intent.hedge.cooldown_seconds', v)}
            />
            <GateNumberRow
              label="max_hedge_shares_per_order"
              value={gateNum('intent.hedge.max_hedge_shares_per_order')}
              onChange={(v) => setGateValue('intent.hedge.max_hedge_shares_per_order', v)}
            />
            <GateNumberRow
              label="min_price_move_pct"
              value={gateNum('intent.hedge.min_price_move_pct')}
              onChange={(v) => setGateValue('intent.hedge.min_price_move_pct', v)}
              step={0.01}
            />
          </div>

          <div className={styles.formGroup}>
            <h4 className={styles.groupTitle}>Guard (risk)</h4>
            <GateNumberRow
              label="max_daily_hedge_count"
              value={gateNum('guard.risk.max_daily_hedge_count')}
              onChange={(v) => setGateValue('guard.risk.max_daily_hedge_count', v)}
            />
            <GateNumberRow
              label="max_position_shares"
              value={gateNum('guard.risk.max_position_shares')}
              onChange={(v) => setGateValue('guard.risk.max_position_shares', v)}
            />
            <GateNumberRow
              label="max_daily_loss_usd"
              value={gateNum('guard.risk.max_daily_loss_usd')}
              onChange={(v) => setGateValue('guard.risk.max_daily_loss_usd', v)}
            />
            <GateNumberRow
              label="max_net_delta_shares"
              value={gateNum('guard.risk.max_net_delta_shares')}
              onChange={(v) => setGateValue('guard.risk.max_net_delta_shares', v)}
            />
            <GateNumberRow
              label="max_spread_pct"
              value={gateNum('guard.risk.max_spread_pct')}
              onChange={(v) => setGateValue('guard.risk.max_spread_pct', v)}
              step={0.01}
            />
            <GateSwitchRow
              label="paper_trade"
              checked={gateBool('guard.risk.paper_trade')}
              onChange={(v) => setGateValue('guard.risk.paper_trade', v)}
            />
          </div>

          <div className={styles.formGroup}>
            <h4 className={styles.groupTitle}>Earnings dates (blacklist YYYY-MM-DD)</h4>
            {earningsDates.map((d, idx) => (
              <div key={idx} className={cn(styles.formRow, styles.formRowInline)}>
                <input
                  type="date"
                  value={d}
                  onChange={(e) => updateEarningsDate(idx, e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={styles.removeBtn}
                  onClick={() => removeEarningsDate(idx)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className={cn(styles.formRow, styles.formRowFull)}>
              <Button type="button" variant="outline" size="sm" onClick={addEarningsDate}>
                Add date
              </Button>
            </div>
          </div>

          <div className={styles.formActions}>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !form.name.trim()}
            >
              {submitting ? 'Saving…' : mode.kind === 'edit' ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
