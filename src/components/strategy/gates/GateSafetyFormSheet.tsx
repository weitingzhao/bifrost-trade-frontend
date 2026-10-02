import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import styles from '@/components/strategy/gates/gatesForm.module.css'
import {
  useCreateGateSafety,
  useGateSafetyFull,
  useStrategyDims,
  useUpdateGateSafety,
} from '@/hooks/useGateSafety'
import { DIM_TYPES, dimCatalogType } from '@/utils/gateDefaults'
import {
  emptyGateForm,
  gateDimLabel,
  gateFormToPayload,
  gateToForm,
  getGateValue,
  GATE_FAMILIES,
  isGateFormReady,
  setGateValue as setGatePath,
  type GateFormState,
} from '@/components/strategy/gates/gateForm'

export type GateSheetMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'copy'; id: number }


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

  const [form, setForm] = useState<GateFormState>(emptyGateForm)
  const [earningsDates, setEarningsDates] = useState<string[]>([])

  const detailQuery = useGateSafetyFull(
    mode.kind === 'edit' ? mode.id : mode.kind === 'copy' ? mode.id : null,
  )

  useEffect(() => {
    if (mode.kind === 'create') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(emptyGateForm())
      setEarningsDates([])
    }
  }, [mode.kind])

  useEffect(() => {
    if (detailQuery.data && (mode.kind === 'edit' || mode.kind === 'copy')) {
      const d = detailQuery.data
      const payload = gateToForm(d, { copy: mode.kind === 'copy' })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(payload)
      setEarningsDates([...d.earnings_dates])
    }
  }, [detailQuery.data, mode.kind])

  const setGateValue = useCallback((path: string, value: unknown) => {
    setForm((prev) => setGatePath(prev, path, value))
  }, [])

  const gateVal = useCallback(
    (path: string): unknown => {
      return getGateValue(form.gates, path)
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
    const payload = gateFormToPayload({ ...form, earnings_dates: earningsDates })
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
                <label>{gateDimLabel(dim)}</label>
                <Select
                  value={form[dim] || '__any__'}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      [dim]: v === '__any__' ? null : v,
                    }))
                  }
                >
                  <SelectTrigger aria-label={gateDimLabel(dim)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any</SelectItem>
                    {(dimsData?.by_type[dimCatalogType(dim)] ?? []).map((d) => (
                      <SelectItem key={d.strategy_dim_id} value={d.code}>
                        {d.display_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {GATE_FAMILIES.map((fam) => (
            <div key={fam.id} className={styles.formGroup}>
              <h4 className={styles.groupTitle}>{fam.title}</h4>
              {fam.fields.map((field) =>
                field.kind === 'bool' ? (
                  <GateSwitchRow
                    key={field.path}
                    label={field.key}
                    checked={gateBool(field.path)}
                    onChange={(v) => setGateValue(field.path, v)}
                  />
                ) : (
                  <GateNumberRow
                    key={field.path}
                    label={field.key}
                    value={gateNum(field.path)}
                    onChange={(v) => setGateValue(field.path, v)}
                    step={field.step}
                  />
                ),
              )}
            </div>
          ))}

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
              disabled={submitting || !isGateFormReady(form)}
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
