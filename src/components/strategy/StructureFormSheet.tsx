import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { StructureWizardStepper } from '@/components/strategy/structures/StructureWizardStepper'
import styles from '@/components/strategy/structures/structuresForm.module.css'
import { fetchStructure, fetchTemplateDetail } from '@/api/strategy'
import {
  useCreateStructure,
  useStructureTemplates,
  useUpdateStructure,
} from '@/hooks/useStructureManagement'
import type {
  MetaParamItem,
  StructureConstraint,
  StructureLeg,
  StructureMetaEntry,
  StructurePayload,
  StrategyTemplateRow,
} from '@/types/strategy'
import {
  DEFAULT_STRUCTURE_PAYLOAD,
  isSchemaMismatchError,
  structureToPayload,
  wizardParamValuesFromSavedMeta,
} from '@/utils/strategyFormUtils'

const TEMPLATE_DIM_TYPES = [
  'direction',
  'structure',
  'coverage',
  'risk',
  'volatility',
  'time',
] as const

const TEMPLATE_DIM_LABELS: Record<(typeof TEMPLATE_DIM_TYPES)[number], string> = {
  direction: 'Direction',
  structure: 'Structure',
  coverage: 'Coverage',
  risk: 'Risk',
  volatility: 'Volatility',
  time: 'Time',
}

function templateDimAt(t: StrategyTemplateRow, dt: (typeof TEMPLATE_DIM_TYPES)[number]): string | null {
  const key = `dim_${dt}` as keyof StrategyTemplateRow
  const v = t[key]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

export type StructureFormMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: number }
  | { kind: 'copy'; id: number }

interface StructureFormSheetProps {
  mode: StructureFormMode
  onClose: () => void
  onSaved: () => void
}

function StructureFormSheetInner({ mode, onClose, onSaved }: StructureFormSheetProps) {
  const open = mode.kind !== 'closed'
  const isCopy = mode.kind === 'copy'
  const sourceId = mode.kind === 'edit' || mode.kind === 'copy' ? mode.id : null
  const isEdit = mode.kind === 'edit'
  const isWizard = (mode.kind === 'create' && !isCopy) || isEdit

  const { data: templatesData } = useStructureTemplates()
  const templates = useMemo(() => templatesData?.items ?? [], [templatesData])
  const createMut = useCreateStructure()
  const updateMut = useUpdateStructure()

  const [formPayload, setFormPayload] = useState<StructurePayload>(() =>
    mode.kind === 'create'
      ? { ...DEFAULT_STRUCTURE_PAYLOAD, name: 'New structure', legs: [] }
      : DEFAULT_STRUCTURE_PAYLOAD,
  )
  const [formLegs, setFormLegs] = useState<StructureLeg[]>([])
  const [formConstraints, setFormConstraints] = useState<StructureConstraint[]>([])
  const [formNotes, setFormNotes] = useState('')
  const [formMeta, setFormMeta] = useState<StructureMetaEntry[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formErrorIsSchemaMismatch, setFormErrorIsSchemaMismatch] = useState(false)
  const [defaultLegsLoading, setDefaultLegsLoading] = useState(false)
  const [defaultLegsFallbackMsg, setDefaultLegsFallbackMsg] = useState<string | null>(null)

  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [wizardTemplateDetail, setWizardTemplateDetail] = useState<Awaited<
    ReturnType<typeof fetchTemplateDetail>
  > | null>(null)
  const [wizardVisitedMetaStep, setWizardVisitedMetaStep] = useState(false)
  const [wizardParamValues, setWizardParamValues] = useState<Record<string, string | number>>({})

  const [tplFilterSearch, setTplFilterSearch] = useState('')
  const [tplDimFilters, setTplDimFilters] = useState<Record<string, string>>({})
  const [tplFiltersExpanded, setTplFiltersExpanded] = useState(false)

  const [originalEditName, setOriginalEditName] = useState<string | null>(null)
  const [originalEditVersion, setOriginalEditVersion] = useState<number | null>(null)
  const [originalEditTemplateId, setOriginalEditTemplateId] = useState<number | null>(null)
  const [originalEditMeta, setOriginalEditMeta] = useState<StructureMetaEntry[] | null>(null)
  const [pendingSubmitName, setPendingSubmitName] = useState<string | null>(null)

  const [nameConfirmDialog, setNameConfirmDialog] = useState<{
    originalName: string
    suggestedName: string
    editedName: string
  } | null>(null)
  const [versionConfirmDialog, setVersionConfirmDialog] = useState<{ useNewVersion: boolean } | null>(
    null,
  )

  const tplDimOptions = useMemo(() => {
    const by: Record<string, Set<string>> = {}
    for (const dt of TEMPLATE_DIM_TYPES) by[dt] = new Set()
    for (const t of templates) {
      for (const dt of TEMPLATE_DIM_TYPES) {
        const v = templateDimAt(t, dt)
        if (v) by[dt].add(v)
      }
    }
    const out: Record<string, string[]> = {}
    for (const dt of TEMPLATE_DIM_TYPES) {
      out[dt] = Array.from(by[dt]).sort((a, b) => a.localeCompare(b))
    }
    return out
  }, [templates])

  const filteredTemplatesForPicker = useMemo(() => {
    let result = templates
    const q = tplFilterSearch.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (t) =>
          t.display_name.toLowerCase().includes(q) ||
          t.template_code.toLowerCase().includes(q) ||
          (t.typical_use && t.typical_use.toLowerCase().includes(q)) ||
          (t.explanation && t.explanation.toLowerCase().includes(q)),
      )
    }
    for (const dt of TEMPLATE_DIM_TYPES) {
      const fv = tplDimFilters[dt]
      if (fv) result = result.filter((t) => templateDimAt(t, dt) === fv)
    }
    return result
  }, [templates, tplFilterSearch, tplDimFilters])

  const activeTplFilterCount =
    Object.values(tplDimFilters).filter(Boolean).length + (tplFilterSearch.trim() ? 1 : 0)

  const wizardTemplatesToShow = useMemo(() => {
    const f = filteredTemplatesForPicker
    const sel = selectedTemplateId
    if (!sel) return f
    if (f.some((t) => t.strategy_template_id === sel)) return f
    const cur = templates.find((t) => t.strategy_template_id === sel)
    return cur ? [cur, ...f] : f
  }, [filteredTemplatesForPicker, selectedTemplateId, templates])

  const copyTemplateSelectOptions = useMemo(() => {
    const tid = formPayload.strategy_template_id
    const f = filteredTemplatesForPicker
    if (!tid) return f
    if (f.some((t) => t.strategy_template_id === tid)) return f
    const cur = templates.find((t) => t.strategy_template_id === tid)
    return cur ? [cur, ...f] : f
  }, [filteredTemplatesForPicker, formPayload.strategy_template_id, templates])

  const resetForm = useCallback(() => {
    setFormPayload(DEFAULT_STRUCTURE_PAYLOAD)
    setFormLegs([])
    setFormConstraints([])
    setFormNotes('')
    setFormMeta([])
    setFormError(null)
    setFormErrorIsSchemaMismatch(false)
    setDefaultLegsLoading(false)
    setDefaultLegsFallbackMsg(null)
    setWizardStep(1)
    setSelectedTemplateId(null)
    setWizardTemplateDetail(null)
    setWizardVisitedMetaStep(false)
    setWizardParamValues({})
    setTplFilterSearch('')
    setTplDimFilters({})
    setTplFiltersExpanded(false)
    setOriginalEditName(null)
    setOriginalEditVersion(null)
    setOriginalEditTemplateId(null)
    setOriginalEditMeta(null)
    setPendingSubmitName(null)
    setNameConfirmDialog(null)
    setVersionConfirmDialog(null)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  useEffect(() => {
    if (!open) return
    if (mode.kind === 'create' && !isCopy) {
      return
    }
    if (sourceId == null) return

    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setFormLoading(true)
      setFormError(null)
    })
    fetchStructure(sourceId)
      .then((row) => {
        if (cancelled) return
        const p = structureToPayload(row)
        if (isCopy) {
          p.name = `${row.name} (copy)`
        }
        setFormPayload(p)
        setFormLegs(p.legs)
        setFormConstraints(p.constraints ?? [])
        setFormNotes(p.notes ?? '')
        setFormMeta(p.meta ?? [])
        if (isEdit) {
          setOriginalEditName(row.name ?? null)
          setOriginalEditVersion(
            typeof row.version === 'number'
              ? row.version
              : parseInt(String(row.version), 10) || 1,
          )
          setOriginalEditTemplateId(row.strategy_template_id ?? null)
          setOriginalEditMeta(p.meta != null ? [...p.meta] : null)
          setWizardStep(3)
        }
        setSelectedTemplateId(row.strategy_template_id ?? null)
        if (row.strategy_template_id) {
          fetchTemplateDetail(row.strategy_template_id)
            .then((d) => {
              if (cancelled) return
              setWizardTemplateDetail(d)
              setWizardParamValues(wizardParamValuesFromSavedMeta(p.meta, d.meta_params))
            })
            .catch(() => {
              if (!cancelled) setWizardTemplateDetail(null)
            })
        }
      })
      .catch((e) => {
        if (!cancelled) setFormError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setFormLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, mode.kind, sourceId, isCopy, isEdit, resetForm])

  useEffect(() => {
    const tid = formPayload.strategy_template_id
    if (!tid || !open || !isCopy) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setDefaultLegsLoading(true)
    })
    fetchTemplateDetail(tid)
      .then((d) => {
        if (!cancelled) {
          setFormLegs(d.legs ?? [])
          setWizardTemplateDetail(d)
        }
      })
      .catch(() => {
        if (!cancelled) setFormLegs([])
      })
      .finally(() => {
        if (!cancelled) setDefaultLegsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [formPayload.strategy_template_id, open, isCopy])

  const updateForm = useCallback((patch: Partial<StructurePayload>) => {
    setFormPayload((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleTemplateSelect = useCallback(
    (strategyTemplateId: number) => {
      setSelectedTemplateId(strategyTemplateId)
      updateForm({ strategy_template_id: strategyTemplateId, structure_subtype: null })
      setDefaultLegsLoading(true)
      setDefaultLegsFallbackMsg(null)
      setWizardParamValues({})
      fetchTemplateDetail(strategyTemplateId)
        .then((d) => {
          setWizardTemplateDetail(d)
          updateForm({
            strategy_template_id: strategyTemplateId,
            structure_type: d.template_code,
          })
          setFormLegs(d.legs ?? [])
          setDefaultLegsFallbackMsg(
            (d.legs ?? []).length === 0 && d.template_code !== 'custom' ? 'No legs on template.' : null,
          )
          const pv: Record<string, string | number> = {}
          d.meta_params?.forEach((p: MetaParamItem) => {
            if (p.param_kind !== 'fixed' && p.default_value_text) {
              pv[p.meta_key] = p.default_value_text
            }
          })
          setWizardParamValues(pv)
        })
        .catch(() => {
          setWizardTemplateDetail(null)
          setFormLegs([])
          setDefaultLegsFallbackMsg('Failed to load template.')
        })
        .finally(() => setDefaultLegsLoading(false))
    },
    [updateForm],
  )

  const buildWizardDefaultName = (): string => {
    const t = wizardTemplateDetail
    if (t) {
      const pct = wizardParamValues.otm_pct
      const itmPct = wizardParamValues.itm_pct
      if (pct != null && String(pct) !== '') return `${t.display_name} (${pct}% OTM)`
      if (itmPct != null && String(itmPct) !== '') return `${t.display_name} (${itmPct}% ITM)`
      return t.display_name
    }
    const tpl = templates.find((x) => x.strategy_template_id === selectedTemplateId)
    return tpl?.display_name ?? 'Structure'
  }

  const getCurrentBuiltMeta = (): StructureMetaEntry[] => {
    if (wizardTemplateDetail?.meta_params?.length) {
      const meta: StructureMetaEntry[] = []
      wizardTemplateDetail.meta_params.forEach((p: MetaParamItem) => {
        if (p.param_kind === 'fixed') {
          if (p.default_value_text != null && p.default_value_text !== '') {
            meta.push({ meta_key: p.meta_key, meta_value_text: p.default_value_text })
          }
        } else {
          const v = wizardParamValues[p.meta_key]
          if (v !== undefined && v !== '') {
            meta.push({ meta_key: p.meta_key, meta_value_text: String(v) })
          }
        }
      })
      return meta
    }
    return [...formMeta]
  }

  const metaEntriesEqual = (a: StructureMetaEntry[], b: StructureMetaEntry[]): boolean => {
    const norm = (arr: StructureMetaEntry[]) =>
      [...arr]
        .filter((m) => m.meta_key)
        .sort((x, y) => (x.meta_key ?? '').localeCompare(y.meta_key ?? ''))
        .map((m) => `${m.meta_key}:${m.meta_value_text ?? ''}`)
        .join('|')
    return norm(a) === norm(b)
  }

  const haveTypeSubtypeOrMetaChanged = (): boolean => {
    const curTid = formPayload.strategy_template_id ?? null
    if (curTid !== originalEditTemplateId) return true
    if (originalEditMeta == null) return getCurrentBuiltMeta().length > 0
    return !metaEntriesEqual(getCurrentBuiltMeta(), originalEditMeta)
  }

  const buildWizardPayload = (name: string, versionOverride?: number): StructurePayload => {
    const meta = getCurrentBuiltMeta()
    const tpl = wizardTemplateDetail
    return {
      name: name.trim(),
      strategy_template_id: formPayload.strategy_template_id,
      structure_type: tpl?.template_code ?? formPayload.structure_type,
      structure_subtype: null,
      legs: formLegs,
      constraints: formConstraints.length ? formConstraints : undefined,
      version: versionOverride !== undefined ? versionOverride : (formPayload.version ?? 1),
      is_active: formPayload.is_active ?? true,
      notes: formNotes.trim() || undefined,
      meta: meta.length ? meta : undefined,
    }
  }

  const doWizardSubmit = async (chosenName: string, versionOverride?: number) => {
    const name = chosenName.trim()
    if (!name) {
      setFormError('Name is required')
      return
    }
    setFormError(null)
    setFormLoading(true)
    setNameConfirmDialog(null)
    setVersionConfirmDialog(null)
    setPendingSubmitName(null)
    try {
      const payload = buildWizardPayload(name, versionOverride)
      if (mode.kind === 'create') {
        await createMut.mutateAsync(payload)
      } else if (isEdit) {
        await updateMut.mutateAsync({ id: mode.id, payload })
      }
      onSaved()
      handleClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFormError(msg)
      setFormErrorIsSchemaMismatch(isSchemaMismatchError(msg))
    } finally {
      setFormLoading(false)
    }
  }

  const submitCopyForm = async () => {
    const name = (formPayload.name || '').trim()
    if (!name) {
      setFormError('Name is required')
      return
    }
    const tid = formPayload.strategy_template_id
    if (!tid) {
      setFormError('Template is required')
      return
    }
    setFormError(null)
    setFormLoading(true)
    const payload: StructurePayload = {
      name,
      strategy_template_id: tid,
      structure_type: formPayload.structure_type,
      structure_subtype: null,
      legs: formLegs,
      constraints: formConstraints.length ? formConstraints : undefined,
      version: formPayload.version ?? 1,
      is_active: formPayload.is_active ?? true,
      notes: formNotes.trim() || undefined,
      meta: formMeta.length ? formMeta : undefined,
    }
    try {
      await createMut.mutateAsync(payload)
      onSaved()
      handleClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setFormError(msg)
      setFormErrorIsSchemaMismatch(isSchemaMismatchError(msg))
    } finally {
      setFormLoading(false)
    }
  }

  const trySubmitWithVersionCheck = (chosenName: string) => {
    if (isEdit && haveTypeSubtypeOrMetaChanged()) {
      setPendingSubmitName(chosenName)
      setNameConfirmDialog(null)
      setVersionConfirmDialog({ useNewVersion: true })
      return
    }
    void doWizardSubmit(chosenName)
  }

  const submitWizardForm = () => {
    const name = (formPayload.name || '').trim()
    if (!name) {
      setFormError('Name is required')
      return
    }
    if (!formPayload.strategy_template_id) {
      setFormError('Template is required')
      return
    }
    const suggestedName = buildWizardDefaultName()
    if (isEdit && originalEditName != null && suggestedName !== originalEditName) {
      setNameConfirmDialog({
        originalName: originalEditName,
        suggestedName,
        editedName: suggestedName,
      })
      return
    }
    trySubmitWithVersionCheck(name)
  }

  const goWizardNext = () => {
    if (wizardStep === 1) {
      if (!selectedTemplateId) {
        setFormError('Select a template')
        return
      }
      const hasEditableMeta =
        wizardTemplateDetail?.meta_params?.some((p) => p.param_kind !== 'fixed') ?? false
      if (hasEditableMeta) {
        setWizardStep(2)
      } else {
        setWizardVisitedMetaStep(false)
        setWizardStep(3)
        updateForm({ name: buildWizardDefaultName() })
      }
    } else if (wizardStep === 2) {
      setWizardVisitedMetaStep(true)
      setWizardStep(3)
      updateForm({ name: buildWizardDefaultName() })
    }
  }

  const updateConstraint = (index: number, patch: Partial<StructureConstraint>) => {
    setFormConstraints((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const addConstraint = () => {
    setFormConstraints((prev) => [
      ...prev,
      { constraint_type: '', constraint_value_text: '', constraint_value_int: null },
    ])
  }

  const removeConstraint = (index: number) => {
    setFormConstraints((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMeta = (index: number, patch: Partial<StructureMetaEntry>) => {
    setFormMeta((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  const addMeta = () => {
    setFormMeta((prev) => [...prev, { meta_key: '', meta_value_text: '' }])
  }

  const removeMeta = (index: number) => {
    setFormMeta((prev) => prev.filter((_, i) => i !== index))
  }

  const submitting = formLoading || createMut.isPending || updateMut.isPending

  const panelTitle =
    mode.kind === 'create' || isCopy ? 'New structure' : 'Edit structure'

  return (
    <>
      <section className={styles.formPanel}>
        <div className={styles.formHeader}>
          <h3 className={styles.formHeaderTitle}>
            {panelTitle}
            {isCopy && <span className={styles.formHeaderBadge}>Copy</span>}
            {isEdit && <span className={styles.formHeaderBadge}>ID {mode.id}</span>}
          </h3>
          <button
            type="button"
            className={styles.formHeaderClose}
            onClick={handleClose}
            aria-label="Close form"
          >
            ×
          </button>
        </div>

        <div className={styles.formBody}>
          {formLoading && !formPayload.name && (
            <p className={styles.formHint}>Loading…</p>
          )}

          {formError && (
            <Alert variant="destructive" className="mb-3">
              <AlertDescription>
                <p>{formError}</p>
                {formErrorIsSchemaMismatch && (
                  <p className="text-xs mt-1 opacity-90">
                    Legs do not match the expected schema for this type/subtype. Update Option Category if needed.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {defaultLegsFallbackMsg && (
            <Alert className="mb-3">
              <AlertDescription>{defaultLegsFallbackMsg}</AlertDescription>
            </Alert>
          )}

          {isWizard ? (
            <>
              <StructureWizardStepper
                wizardStep={wizardStep}
                selectedTemplateId={selectedTemplateId}
                metaParams={wizardTemplateDetail?.meta_params}
                onStepClick={(step) => setWizardStep(step)}
              />

              {wizardStep === 1 && (
                <StructureTemplateStep
                  tplFilterSearch={tplFilterSearch}
                  tplDimFilters={tplDimFilters}
                  tplFiltersExpanded={tplFiltersExpanded}
                  tplDimOptions={tplDimOptions}
                  activeTplFilterCount={activeTplFilterCount}
                  templatesCount={templates.length}
                  wizardTemplatesToShow={wizardTemplatesToShow}
                  selectedTemplateId={selectedTemplateId}
                  defaultLegsLoading={defaultLegsLoading}
                  onSearchChange={setTplFilterSearch}
                  onToggleFilters={() => setTplFiltersExpanded((v) => !v)}
                  onClearFilters={() => {
                    setTplFilterSearch('')
                    setTplDimFilters({})
                  }}
                  onDimFilterChange={(dt, value) =>
                    setTplDimFilters((prev) => ({ ...prev, [dt]: value }))
                  }
                  onTemplateSelect={handleTemplateSelect}
                />
              )}

              {wizardStep === 2 && wizardTemplateDetail && (
                <div className={styles.wizardStep}>
                  <h4 className={styles.formGroupTitle}>Parameters</h4>
                  {wizardTemplateDetail.example && (
                    <p className={styles.paramExample}>
                      <strong>Example:</strong> {wizardTemplateDetail.example}
                    </p>
                  )}
                  {(wizardTemplateDetail.meta_params ?? []).filter((p) => p.param_kind !== 'fixed')
                    .length === 0 ? (
                    <p className={styles.formHint}>No editable parameters. Click Next.</p>
                  ) : (
                    <div className={styles.paramCard}>
                      {(wizardTemplateDetail.meta_params ?? [])
                        .filter((p) => p.param_kind !== 'fixed')
                        .map((p) => (
                          <div key={p.meta_key} className={styles.paramRow}>
                            <label className={styles.paramRowLabel}>
                              {p.display_label ?? p.meta_key}
                            </label>
                            <input
                              type="number"
                              min={p.param_kind === 'percent' ? 1 : 0}
                              max={p.param_kind === 'percent' ? 50 : undefined}
                              value={wizardParamValues[p.meta_key] ?? p.default_value_text ?? ''}
                              onChange={(e) => {
                                const v =
                                  e.target.value === ''
                                    ? ''
                                    : (parseInt(e.target.value, 10) ?? e.target.value)
                                setWizardParamValues((prev) => ({
                                  ...prev,
                                  [p.meta_key]: v as string | number,
                                }))
                              }}
                              className={cn(styles.detailsInput, styles.detailsInputNarrow)}
                              aria-label={p.display_label ?? p.meta_key}
                            />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <StructureDetailsFields
                  formPayload={formPayload}
                  formLegs={formLegs}
                  formConstraints={formConstraints}
                  defaultLegsLoading={defaultLegsLoading}
                  isEdit={isEdit}
                  wizardTemplateDetail={wizardTemplateDetail}
                  wizardParamValues={wizardParamValues}
                  wizardVisitedMetaStep={wizardVisitedMetaStep}
                  onUpdateForm={updateForm}
                  onUpdateConstraint={updateConstraint}
                  onAddConstraint={addConstraint}
                  onRemoveConstraint={removeConstraint}
                  onParamChange={(key, value) =>
                    setWizardParamValues((prev) => ({ ...prev, [key]: value }))
                  }
                />
              )}
            </>
          ) : (
            isCopy && (
              <StructureCopyForm
                formPayload={formPayload}
                formLegs={formLegs}
                formConstraints={formConstraints}
                formNotes={formNotes}
                formMeta={formMeta}
                defaultLegsLoading={defaultLegsLoading}
                tplFilterSearch={tplFilterSearch}
                tplDimFilters={tplDimFilters}
                tplFiltersExpanded={tplFiltersExpanded}
                tplDimOptions={tplDimOptions}
                activeTplFilterCount={activeTplFilterCount}
                copyTemplateSelectOptions={copyTemplateSelectOptions}
                onUpdateForm={updateForm}
                onTemplateSelect={handleTemplateSelect}
                onSearchChange={setTplFilterSearch}
                onToggleFilters={() => setTplFiltersExpanded((v) => !v)}
                onClearFilters={() => {
                  setTplFilterSearch('')
                  setTplDimFilters({})
                }}
                onDimFilterChange={(dt, value) =>
                  setTplDimFilters((prev) => ({ ...prev, [dt]: value }))
                }
                onNotesChange={setFormNotes}
                onUpdateConstraint={updateConstraint}
                onAddConstraint={addConstraint}
                onRemoveConstraint={removeConstraint}
                onUpdateMeta={updateMeta}
                onAddMeta={addMeta}
                onRemoveMeta={removeMeta}
              />
            )
          )}
        </div>

        <div className={styles.formFooter}>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          {isWizard ? (
            wizardStep < 3 ? (
              <Button
                type="button"
                onClick={goWizardNext}
                disabled={wizardStep === 1 && !selectedTemplateId}
              >
                Next
              </Button>
            ) : (
              <Button type="button" onClick={submitWizardForm} disabled={submitting}>
                {isEdit ? 'Save' : 'Create'}
              </Button>
            )
          ) : (
            <Button type="button" onClick={() => void submitCopyForm()} disabled={submitting}>
              Create
            </Button>
          )}
        </div>
      </section>

      <Dialog open={nameConfirmDialog != null} onOpenChange={(v) => { if (!v) setNameConfirmDialog(null) }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Structure name will change</DialogTitle>
            <DialogDescription>
              Current name: <strong>{nameConfirmDialog?.originalName}</strong>. Edit the suggested name or keep the
              current name when saving.
            </DialogDescription>
          </DialogHeader>
          {nameConfirmDialog != null && (
            <div className="space-y-2">
              <Label htmlFor="name-confirm-new-name">New name</Label>
              <Input
                id="name-confirm-new-name"
                value={nameConfirmDialog.editedName}
                onChange={(e) =>
                  setNameConfirmDialog((prev) =>
                    prev ? { ...prev, editedName: e.target.value } : null,
                  )
                }
              />
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                nameConfirmDialog &&
                trySubmitWithVersionCheck(
                  (nameConfirmDialog.editedName || '').trim() || nameConfirmDialog.suggestedName,
                )
              }
              disabled={submitting || nameConfirmDialog == null}
            >
              Use new name and save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => originalEditName && trySubmitWithVersionCheck(originalEditName)}
              disabled={submitting}
            >
              Keep current name and save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setNameConfirmDialog(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={versionConfirmDialog != null && pendingSubmitName != null && originalEditVersion != null}
        onOpenChange={(v) => {
          if (!v) {
            setVersionConfirmDialog(null)
            setPendingSubmitName(null)
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Type, SubType, or Meta changed</DialogTitle>
            <DialogDescription>
              Use a new version (Version + 1) for this structure? If not, changes will be saved with the current
              version.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 py-2">
            <Label htmlFor="version-confirm-use-new" className="text-sm">
              Use new version (Version + 1)
            </Label>
            <Switch
              id="version-confirm-use-new"
              checked={versionConfirmDialog?.useNewVersion ?? true}
              onCheckedChange={(checked) =>
                setVersionConfirmDialog((prev) => (prev ? { useNewVersion: checked } : null))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() =>
                pendingSubmitName != null &&
                originalEditVersion != null &&
                versionConfirmDialog &&
                doWizardSubmit(
                  pendingSubmitName,
                  versionConfirmDialog.useNewVersion ? originalEditVersion + 1 : originalEditVersion,
                )
              }
              disabled={submitting || versionConfirmDialog == null}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setVersionConfirmDialog(null)
                setPendingSubmitName(null)
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface StructureTemplateStepProps {
  tplFilterSearch: string
  tplDimFilters: Record<string, string>
  tplFiltersExpanded: boolean
  tplDimOptions: Record<string, string[]>
  activeTplFilterCount: number
  templatesCount: number
  wizardTemplatesToShow: StrategyTemplateRow[]
  selectedTemplateId: number | null
  defaultLegsLoading: boolean
  onSearchChange: (value: string) => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onDimFilterChange: (dt: string, value: string) => void
  onTemplateSelect: (id: number) => void
}

function StructureTemplateFilters({
  compact,
  tplFilterSearch,
  tplDimFilters,
  tplFiltersExpanded,
  tplDimOptions,
  activeTplFilterCount,
  metaLine,
  dimensionsLabel,
  onSearchChange,
  onToggleFilters,
  onClearFilters,
  onDimFilterChange,
}: {
  compact?: boolean
  tplFilterSearch: string
  tplDimFilters: Record<string, string>
  tplFiltersExpanded: boolean
  tplDimOptions: Record<string, string[]>
  activeTplFilterCount: number
  metaLine: string
  dimensionsLabel?: string
  onSearchChange: (value: string) => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onDimFilterChange: (dt: string, value: string) => void
}) {
  const dimCount = Object.values(tplDimFilters).filter(Boolean).length
  return (
    <div
      className={cn(styles.templateFilters, compact && styles.templateFiltersCompact)}
      aria-label="Template filters"
    >
      <div className={styles.templateFiltersSearchRow}>
        <input
          type="search"
          className={cn(styles.templateFiltersSearch, styles.detailsInput)}
          placeholder="Filter by name or code…"
          value={tplFilterSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Filter templates by name or code"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.templateFiltersToggle}
          onClick={onToggleFilters}
          aria-expanded={tplFiltersExpanded}
        >
          {tplFiltersExpanded
            ? 'Hide dimensions'
            : `${dimensionsLabel ?? 'Filter by dimensions'}${dimCount > 0 ? ` (${dimCount})` : ''}`}
        </Button>
        {activeTplFilterCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.templateFiltersClear}
            onClick={onClearFilters}
          >
            {compact ? 'Clear' : 'Clear filters'}
          </Button>
        )}
      </div>
      {tplFiltersExpanded && (
        <div className={styles.templateFiltersDims}>
          {TEMPLATE_DIM_TYPES.map((dt) => (
            <label key={dt} className={styles.templateFilterDim}>
              <span className={styles.templateFilterDimLabel}>{TEMPLATE_DIM_LABELS[dt]}</span>
              <Select
                value={tplDimFilters[dt] || '__any__'}
                onValueChange={(v) => onDimFilterChange(dt, v === '__any__' ? '' : v)}
              >
                <SelectTrigger className={cn(styles.detailsInput, styles.templateFilterSelect)} aria-label={`Filter by ${TEMPLATE_DIM_LABELS[dt]}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any</SelectItem>
                  {tplDimOptions[dt].map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ))}
        </div>
      )}
      <p className={styles.templateFiltersMeta}>{metaLine}</p>
    </div>
  )
}

function StructureTemplateStep({
  tplFilterSearch,
  tplDimFilters,
  tplFiltersExpanded,
  tplDimOptions,
  activeTplFilterCount,
  templatesCount,
  wizardTemplatesToShow,
  selectedTemplateId,
  defaultLegsLoading,
  onSearchChange,
  onToggleFilters,
  onClearFilters,
  onDimFilterChange,
  onTemplateSelect,
}: StructureTemplateStepProps) {
  return (
    <div className={styles.wizardStep}>
      <h4 className={styles.formGroupTitle}>Choose template</h4>
      <StructureTemplateFilters
        tplFilterSearch={tplFilterSearch}
        tplDimFilters={tplDimFilters}
        tplFiltersExpanded={tplFiltersExpanded}
        tplDimOptions={tplDimOptions}
        activeTplFilterCount={activeTplFilterCount}
        metaLine={`Showing ${wizardTemplatesToShow.length} of ${templatesCount} templates${
          activeTplFilterCount > 0 && wizardTemplatesToShow.length === 0
            ? ' — No match. Adjust filters.'
            : ''
        }`}
        onSearchChange={onSearchChange}
        onToggleFilters={onToggleFilters}
        onClearFilters={onClearFilters}
        onDimFilterChange={onDimFilterChange}
      />
      <div className={styles.templateGrid} role="radiogroup" aria-label="Template">
        {wizardTemplatesToShow.length === 0 ? (
          <p className={styles.templateGridEmpty}>
            No templates match the current filters. Clear filters or change criteria.
          </p>
        ) : (
          wizardTemplatesToShow.map((tpl) => (
            <label
              key={tpl.strategy_template_id}
              className={cn(
                styles.templateCard,
                selectedTemplateId === tpl.strategy_template_id && styles.templateCardSelected,
              )}
            >
              <input
                type="radio"
                name="structure_template_wizard"
                value={tpl.strategy_template_id}
                checked={selectedTemplateId === tpl.strategy_template_id}
                onChange={() => onTemplateSelect(tpl.strategy_template_id)}
                className={styles.templateCardRadio}
              />
              <span className={styles.templateCardName}>{tpl.display_name}</span>
              <span className={styles.templateCardCode}>{tpl.template_code}</span>
              {(tpl.typical_use || tpl.explanation) && (
                <span className={styles.templateCardDesc}>{tpl.typical_use || tpl.explanation}</span>
              )}
              <span className={styles.templateCardTags}>
                {TEMPLATE_DIM_TYPES.map((dt) => {
                  const v = templateDimAt(tpl, dt)
                  return v ? (
                    <span key={dt} className={styles.templateCardTag}>
                      {v}
                    </span>
                  ) : null
                })}
              </span>
            </label>
          ))
        )}
      </div>
      {defaultLegsLoading && <p className={styles.formHint}>Loading template…</p>}
    </div>
  )
}

interface StructureDetailsFieldsProps {
  formPayload: StructurePayload
  formLegs: StructureLeg[]
  formConstraints: StructureConstraint[]
  defaultLegsLoading: boolean
  isEdit: boolean
  wizardTemplateDetail: Awaited<ReturnType<typeof fetchTemplateDetail>> | null
  wizardParamValues: Record<string, string | number>
  wizardVisitedMetaStep: boolean
  onUpdateForm: (patch: Partial<StructurePayload>) => void
  onUpdateConstraint: (index: number, patch: Partial<StructureConstraint>) => void
  onAddConstraint: () => void
  onRemoveConstraint: (index: number) => void
  onParamChange: (key: string, value: string | number) => void
}

function StructureDetailsFields({
  formPayload,
  formLegs,
  formConstraints,
  defaultLegsLoading,
  isEdit,
  wizardTemplateDetail,
  wizardParamValues,
  wizardVisitedMetaStep,
  onUpdateForm,
  onUpdateConstraint,
  onAddConstraint,
  onRemoveConstraint,
  onParamChange,
}: StructureDetailsFieldsProps) {
  const metaNF = (wizardTemplateDetail?.meta_params ?? []).filter((p) => p.param_kind !== 'fixed')
  const showStep3Meta = metaNF.length > 0 && !wizardVisitedMetaStep

  return (
    <div className={cn(styles.wizardStep, styles.detailsStep)}>
      <div
        className={cn(styles.detailsCard, !showStep3Meta && styles.detailsCardSpan2)}
      >
        <h4 className={styles.detailsCardTitle}>Metadata</h4>
        <div className={styles.detailsMetaGrid}>
          <div className={cn(styles.detailsField, styles.detailsFieldName)}>
            <label className={styles.detailsLabel}>
              Name{' '}
              <InfoTooltip text="Auto-filled from structure type and subtype; you can edit." />
            </label>
            <input
              type="text"
              value={formPayload.name}
              onChange={(e) => onUpdateForm({ name: e.target.value })}
              placeholder="Structure name"
              className={styles.detailsInput}
              aria-label="Structure name"
            />
          </div>
          <div className={cn(styles.detailsField, styles.detailsFieldVersion)}>
            <label className={styles.detailsLabel}>
              Version
              {isEdit && (
                <InfoTooltip text="Read-only when editing. New version is offered on Save when Type, SubType, or Meta change." />
              )}
            </label>
            <input
              type="number"
              min={1}
              value={formPayload.version ?? 1}
              onChange={(e) => onUpdateForm({ version: parseInt(e.target.value, 10) || 1 })}
              disabled={isEdit}
              className={cn(styles.detailsInput, styles.detailsInputNarrow)}
              aria-label="Version"
            />
          </div>
          <div className={cn(styles.detailsField, styles.detailsFieldAvailable)}>
            <label className={styles.detailsToggle}>
              <Switch
                checked={formPayload.is_active ?? true}
                onCheckedChange={(checked) => onUpdateForm({ is_active: checked })}
                aria-label="Available"
              />
              <span>Available</span>
            </label>
          </div>
        </div>
      </div>

      {showStep3Meta && wizardTemplateDetail && (
        <div className={styles.detailsCard}>
          <h4 className={styles.detailsCardTitle}>Parameters</h4>
          <div className={styles.detailsParams}>
            {metaNF.map((p) => (
              <div key={p.meta_key} className={styles.detailsParamRow}>
                <label className={styles.detailsLabel}>{p.display_label ?? p.meta_key}</label>
                <input
                  type="number"
                  min={p.param_kind === 'percent' ? 1 : 0}
                  max={p.param_kind === 'percent' ? 50 : undefined}
                  value={wizardParamValues[p.meta_key] ?? p.default_value_text ?? ''}
                  onChange={(e) => {
                    const v =
                      e.target.value === '' ? '' : parseInt(e.target.value, 10) ?? e.target.value
                    onParamChange(p.meta_key, v as string | number)
                  }}
                  className={cn(styles.detailsInput, styles.detailsInputNarrow)}
                  aria-label={p.display_label ?? p.meta_key}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <StructureLegsCard formLegs={formLegs} defaultLegsLoading={defaultLegsLoading} />
      <StructureConstraintsCard
        formConstraints={formConstraints}
        onUpdateConstraint={onUpdateConstraint}
        onAddConstraint={onAddConstraint}
        onRemoveConstraint={onRemoveConstraint}
      />
    </div>
  )
}

function StructureLegsCard({
  formLegs,
  defaultLegsLoading,
}: {
  formLegs: StructureLeg[]
  defaultLegsLoading: boolean
}) {
  return (
    <div className={styles.detailsCard}>
      <h4 className={styles.detailsCardTitle}>Legs</h4>
      <p className={cn(styles.detailsHint, styles.detailsCardDesc)}>
        From template. Not editable here.
      </p>
      {defaultLegsLoading ? (
        <p className={styles.detailsHint}>Loading legs…</p>
      ) : (
        <div className={styles.detailsTableWrap}>
          <table className={styles.detailsTable} aria-label="Structure legs">
            <thead>
              <tr>
                <th>Role</th>
                <th>Direction</th>
                <th>Right</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {formLegs.map((leg, i) => (
                <tr key={`${leg.role}-${leg.direction}-${i}`}>
                  <td>{leg.role ?? '—'}</td>
                  <td>{leg.direction ?? '—'}</td>
                  <td>{leg.option_right ?? '—'}</td>
                  <td>{leg.quantity ?? 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StructureConstraintsCard({
  formConstraints,
  onUpdateConstraint,
  onAddConstraint,
  onRemoveConstraint,
}: {
  formConstraints: StructureConstraint[]
  onUpdateConstraint: (index: number, patch: Partial<StructureConstraint>) => void
  onAddConstraint: () => void
  onRemoveConstraint: (index: number) => void
}) {
  return (
    <div className={styles.detailsCard}>
      <h4 className={styles.detailsCardTitle}>Constraints</h4>
      <div className={styles.detailsConstraints}>
        {formConstraints.map((c, i) => (
          <div key={i} className={styles.detailsConstraintRow}>
            <input
              type="text"
              value={c.constraint_type ?? ''}
              onChange={(e) => onUpdateConstraint(i, { constraint_type: e.target.value })}
              placeholder="Type"
              className={cn(styles.detailsInput, styles.detailsConstraintType)}
              aria-label="Constraint type"
            />
            <input
              type="text"
              value={c.constraint_value_text ?? ''}
              onChange={(e) => onUpdateConstraint(i, { constraint_value_text: e.target.value })}
              placeholder="Value (text)"
              className={cn(styles.detailsInput, styles.detailsConstraintValue)}
              aria-label="Value text"
            />
            <input
              type="number"
              value={c.constraint_value_int ?? ''}
              onChange={(e) =>
                onUpdateConstraint(i, {
                  constraint_value_int:
                    e.target.value === '' ? null : parseInt(e.target.value, 10),
                })
              }
              placeholder="Int"
              className={cn(styles.detailsInput, styles.detailsConstraintInt)}
              aria-label="Value int"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={styles.detailsConstraintRemove}
              onClick={() => onRemoveConstraint(i)}
              aria-label="Remove constraint"
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={styles.detailsAddConstraint}
          onClick={onAddConstraint}
        >
          Add constraint
        </Button>
      </div>
    </div>
  )
}

interface StructureCopyFormProps {
  formPayload: StructurePayload
  formLegs: StructureLeg[]
  formConstraints: StructureConstraint[]
  formNotes: string
  formMeta: StructureMetaEntry[]
  defaultLegsLoading: boolean
  tplFilterSearch: string
  tplDimFilters: Record<string, string>
  tplFiltersExpanded: boolean
  tplDimOptions: Record<string, string[]>
  activeTplFilterCount: number
  copyTemplateSelectOptions: StrategyTemplateRow[]
  onUpdateForm: (patch: Partial<StructurePayload>) => void
  onTemplateSelect: (id: number) => void
  onSearchChange: (value: string) => void
  onToggleFilters: () => void
  onClearFilters: () => void
  onDimFilterChange: (dt: string, value: string) => void
  onNotesChange: (notes: string) => void
  onUpdateConstraint: (index: number, patch: Partial<StructureConstraint>) => void
  onAddConstraint: () => void
  onRemoveConstraint: (index: number) => void
  onUpdateMeta: (index: number, patch: Partial<StructureMetaEntry>) => void
  onAddMeta: () => void
  onRemoveMeta: (index: number) => void
}

function StructureCopyForm({
  formPayload,
  formLegs,
  formConstraints,
  formNotes,
  formMeta,
  defaultLegsLoading,
  tplFilterSearch,
  tplDimFilters,
  tplFiltersExpanded,
  tplDimOptions,
  activeTplFilterCount,
  copyTemplateSelectOptions,
  onUpdateForm,
  onTemplateSelect,
  onSearchChange,
  onToggleFilters,
  onClearFilters,
  onDimFilterChange,
  onNotesChange,
  onUpdateConstraint,
  onAddConstraint,
  onRemoveConstraint,
  onUpdateMeta,
  onAddMeta,
  onRemoveMeta,
}: StructureCopyFormProps) {
  return (
    <div className={styles.copyGrid}>
      <div className={cn(styles.detailsCard, styles.detailsCardSpan2)}>
        <h4 className={styles.detailsCardTitle}>Metadata</h4>
        <div className={styles.detailsMetaGrid}>
          <div className={cn(styles.detailsField, styles.detailsFieldName)}>
            <label className={styles.detailsLabel}>Name</label>
            <input
              type="text"
              value={formPayload.name}
              onChange={(e) => onUpdateForm({ name: e.target.value })}
              placeholder="Structure name"
              className={styles.detailsInput}
              aria-label="Structure name"
            />
          </div>
          <div className={cn(styles.detailsField, styles.detailsFieldVersion)}>
            <label className={styles.detailsLabel}>Version</label>
            <input
              type="number"
              min={1}
              value={formPayload.version ?? 1}
              onChange={(e) => onUpdateForm({ version: parseInt(e.target.value, 10) || 1 })}
              className={cn(styles.detailsInput, styles.detailsInputNarrow)}
              aria-label="Version"
            />
          </div>
          <div className={cn(styles.detailsField, styles.detailsFieldAvailable)}>
            <label className={styles.detailsToggle}>
              <Switch
                checked={formPayload.is_active ?? true}
                onCheckedChange={(checked) => onUpdateForm({ is_active: checked })}
                aria-label="Available"
              />
              <span>Available</span>
            </label>
          </div>
        </div>
        <div className={styles.copyTemplateBlock}>
          <label className={styles.detailsLabel}>Template</label>
          <StructureTemplateFilters
            compact
            tplFilterSearch={tplFilterSearch}
            tplDimFilters={tplDimFilters}
            tplFiltersExpanded={tplFiltersExpanded}
            tplDimOptions={tplDimOptions}
            activeTplFilterCount={activeTplFilterCount}
            dimensionsLabel="Dimensions"
            metaLine={`${copyTemplateSelectOptions.length} template(s) in list`}
            onSearchChange={onSearchChange}
            onToggleFilters={onToggleFilters}
            onClearFilters={onClearFilters}
            onDimFilterChange={onDimFilterChange}
          />
          <Select
            value={formPayload.strategy_template_id != null ? String(formPayload.strategy_template_id) : '__none__'}
            onValueChange={(v) => {
              const n = parseInt(v, 10)
              if (n) onTemplateSelect(n)
            }}
          >
            <SelectTrigger className={cn(styles.detailsInput, styles.copyTemplateSelect)} aria-label="Template">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Select —</SelectItem>
              {copyTemplateSelectOptions.map((tpl) => (
                <SelectItem key={tpl.strategy_template_id} value={String(tpl.strategy_template_id)}>
                  {tpl.display_name} ({tpl.template_code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {copyTemplateSelectOptions.length === 0 && (
            <p className={styles.formHint}>No templates match filters. Clear filters to see all.</p>
          )}
        </div>
      </div>

      <StructureLegsCard formLegs={formLegs} defaultLegsLoading={defaultLegsLoading} />
      <StructureConstraintsCard
        formConstraints={formConstraints}
        onUpdateConstraint={onUpdateConstraint}
        onAddConstraint={onAddConstraint}
        onRemoveConstraint={onRemoveConstraint}
      />

      <div className={styles.detailsCard}>
        <h4 className={styles.detailsCardTitle}>Notes</h4>
        <textarea
          value={formNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Optional notes"
          className={cn(styles.detailsInput, styles.detailsTextarea)}
        />
      </div>

      <div className={styles.detailsCard}>
        <h4 className={styles.detailsCardTitle}>Meta</h4>
        <div className={styles.detailsConstraints}>
          {formMeta.map((m, i) => (
            <div key={i} className={styles.detailsConstraintRow}>
              <input
                type="text"
                value={m.meta_key ?? ''}
                onChange={(e) => onUpdateMeta(i, { meta_key: e.target.value })}
                placeholder="Key"
                className={cn(styles.detailsInput, styles.detailsConstraintType)}
                aria-label="Meta key"
              />
              <input
                type="text"
                value={m.meta_value_text ?? ''}
                onChange={(e) => onUpdateMeta(i, { meta_value_text: e.target.value })}
                placeholder="Value"
                className={cn(styles.detailsInput, styles.detailsConstraintValue)}
                aria-label="Meta value"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={styles.detailsConstraintRemove}
                onClick={() => onRemoveMeta(i)}
                aria-label="Remove meta"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={styles.detailsAddConstraint}
            onClick={onAddMeta}
          >
            Add meta
          </Button>
        </div>
      </div>
    </div>
  )
}

function structureFormSheetKey(mode: StructureFormMode): string {
  if (mode.kind === 'create') return 'create'
  if (mode.kind === 'edit') return `edit-${mode.id}`
  if (mode.kind === 'copy') return `copy-${mode.id}`
  return 'closed'
}

export function StructureFormSheet(props: StructureFormSheetProps) {
  if (props.mode.kind === 'closed') return null
  return <StructureFormSheetInner key={structureFormSheetKey(props.mode)} {...props} />
}
