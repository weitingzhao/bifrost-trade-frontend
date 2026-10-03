import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import styles from '@/components/strategy/gates/gatesForm.module.css'
import {
  useCreateGateSafety,
  useGateSafetyDefaults,
  useGateSafetyFull,
  useUpdateGateSafety,
} from '@/hooks/useGateSafety'
import { useStrategyDims } from '@/hooks/useOptionCategory'
import { DIM_TYPES, dimOptions } from '@/utils/gateDefaults'
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

  /**
   * Null until the form has something real to start from: the set itself
   * (edit / copy) or core's defaults (create, TD-72). Nothing renders the
   * fields — so nothing can be saved — while it is null.
   */
  const [form, setForm] = useState<GateFormState | null>(null)
  const [earningsDates, setEarningsDates] = useState<string[]>([])
  /** Create seeds once: a later defaults refetch must not wipe what was typed. */
  const [seeded, setSeeded] = useState(false)

  const defaultsQuery = useGateSafetyDefaults(mode.kind === 'create')
  const detailQuery = useGateSafetyFull(
    mode.kind === 'edit' ? mode.id : mode.kind === 'copy' ? mode.id : null,
  )

  const modeKey = mode.kind === 'edit' || mode.kind === 'copy' ? `${mode.kind}:${mode.id}` : mode.kind
  useEffect(() => {
    // A different sheet: drop what the last one held before anything seeds it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(null)
    setEarningsDates([])
    setSeeded(false)
  }, [modeKey])

  const defaultGates = defaultsQuery.data?.gates
  useEffect(() => {
    if (mode.kind !== 'create' || seeded || !defaultGates) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(emptyGateForm(defaultGates))
    setEarningsDates([])
    setSeeded(true)
  }, [mode.kind, seeded, defaultGates])

  useEffect(() => {
    if (detailQuery.data && (mode.kind === 'edit' || mode.kind === 'copy')) {
      const d = detailQuery.data
      const payload = gateToForm(d, { copy: mode.kind === 'copy' })
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(payload)
      setEarningsDates([...d.earnings_dates])
    }
  }, [detailQuery.data, mode.kind])

  const patchForm = useCallback((patch: Partial<GateFormState>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const setGateValue = useCallback((path: string, value: unknown) => {
    setForm((prev) => (prev ? setGatePath(prev, path, value) : prev))
  }, [])

  const formGates = form?.gates
  const gateVal = useCallback(
    (path: string): unknown => {
      return formGates ? getGateValue(formGates, path) : undefined
    },
    [formGates],
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
    if (!form) return
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
  /** Create waits for core's defaults; on failure it offers Retry and no form. */
  const defaultsLoading = mode.kind === 'create' && !form && !defaultsQuery.isError
  const defaultsError = mode.kind === 'create' && !form && defaultsQuery.isError ? defaultsQuery.error : null

  if (mode.kind === 'closed') return null

  const panelTitle =
    mode.kind === 'create' || mode.kind === 'copy'
      ? 'New gate set'
      : `Edit gate set ${editId}`

  return (
    <section className={styles.formSection}>
      <div className={styles.stickyHeader}>
        <h3 className={styles.headerTitle}>{panelTitle}</h3>
        {detailLoading && !form?.name && (
          <p className={styles.headerHint}>Loading…</p>
        )}
        {defaultsLoading && <p className={styles.headerHint}>Loading gate defaults…</p>}
        {defaultsError && (
          <Alert variant="destructive" className={styles.errorAlert}>
            <AlertDescription>
              Could not load the gate defaults a new set starts from — {(defaultsError as Error).message}
            </AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void defaultsQuery.refetch()}
              disabled={defaultsQuery.isFetching}
            >
              {defaultsQuery.isFetching ? 'Retrying…' : 'Retry'}
            </Button>
          </Alert>
        )}
        {(mode.kind === 'edit' || mode.kind === 'copy') && !form && detailQuery.isError && (
          <Alert variant="destructive" className={styles.errorAlert}>
            <AlertDescription>Could not load gate set {mode.id} — {(detailQuery.error as Error).message}</AlertDescription>
          </Alert>
        )}
        {submitError && (
          <Alert variant="destructive" className={styles.errorAlert}>
            <AlertDescription>{(submitError as Error).message}</AlertDescription>
          </Alert>
        )}
      </div>

      {form && !detailLoading && (
        <div className={styles.formGrid}>
          <div className={cn(styles.formGroup, styles.metadataRoot)}>
            <h4 className={styles.metadataTitle}>Metadata</h4>
            <div className={styles.formRow}>
              <label>Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => patchForm({ name: e.target.value })}
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
                  patchForm({ version: parseInt(e.target.value, 10) || 1 })
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
                  onValueChange={(v) => patchForm({ [dim]: v === '__any__' ? null : v })}
                >
                  <SelectTrigger aria-label={gateDimLabel(dim)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">— Any</SelectItem>
                    {dimOptions(dimsData, dim).map((d) => (
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
                  onCheckedChange={(checked) => patchForm({ is_active: checked })}
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
