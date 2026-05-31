import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
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

export function StructureFormSheet({ mode, onClose, onSaved }: StructureFormSheetProps) {
  const open = mode.kind !== 'closed'
  const isCopy = mode.kind === 'copy'
  const sourceId = mode.kind === 'edit' || mode.kind === 'copy' ? mode.id : null

  const { data: templatesData } = useStructureTemplates()
  const templates = useMemo(() => templatesData?.items ?? [], [templatesData])
  const createMut = useCreateStructure()
  const updateMut = useUpdateStructure()

  const isWizard = mode.kind === 'create' || mode.kind === 'edit' || mode.kind === 'copy'

  const [formPayload, setFormPayload] = useState<StructurePayload>(DEFAULT_STRUCTURE_PAYLOAD)
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
      resetForm()
      setFormPayload({ ...DEFAULT_STRUCTURE_PAYLOAD, name: 'New structure', legs: [] })
      setWizardStep(1)
      return
    }
    if (sourceId == null) return

    let cancelled = false
    setFormLoading(true)
    setFormError(null)
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
        if (mode.kind === 'edit') {
          setOriginalEditName(row.name ?? null)
          setOriginalEditVersion(
            typeof row.version === 'number'
              ? row.version
              : parseInt(String(row.version), 10) || 1,
          )
          setOriginalEditTemplateId(row.strategy_template_id ?? null)
          setOriginalEditMeta(p.meta != null ? [...p.meta] : null)
        }
        setWizardStep(mode.kind === 'edit' || mode.kind === 'copy' ? 3 : 1)
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
  }, [open, mode.kind, sourceId, isCopy, resetForm])

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
      if (mode.kind === 'create' || mode.kind === 'copy') {
        await createMut.mutateAsync(payload)
      } else if (mode.kind === 'edit') {
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

  const trySubmitWithVersionCheck = (chosenName: string) => {
    if (mode.kind === 'edit' && haveTypeSubtypeOrMetaChanged()) {
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
    if (mode.kind === 'edit' && originalEditName != null && suggestedName !== originalEditName) {
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

  const sheetTitle =
    mode.kind === 'create'
      ? isCopy
        ? 'New structure (copy)'
        : 'New structure'
      : mode.kind === 'edit'
        ? `Edit structure #${mode.id}`
        : 'Structure'

  const submitting = formLoading || createMut.isPending || updateMut.isPending

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              Choose a template, set parameters, then save legs and constraints from the template.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {formLoading && !formPayload.name && <Skeleton className="h-24 w-full" />}

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <p>{formError}</p>
                  {formErrorIsSchemaMismatch && (
                    <p className="text-xs mt-1 opacity-90">
                      Legs do not match the expected schema for this type. Update Option Category if needed.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {defaultLegsFallbackMsg && (
              <Alert>
                <AlertDescription>{defaultLegsFallbackMsg}</AlertDescription>
              </Alert>
            )}

            {isWizard && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  {[1, 2, 3].map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={step === 2 && wizardStep < 2 && wizardStep !== 1}
                      onClick={() => {
                        if (step === 1 && wizardStep > 1) setWizardStep(1)
                        if (step === 2 && wizardStep > 2) setWizardStep(2)
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 border transition-colors',
                        wizardStep === step
                          ? 'bg-primary text-primary-foreground border-primary'
                          : wizardStep > step
                            ? 'border-border text-foreground'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {step === 1 ? 'Template' : step === 2 ? 'Parameters' : 'Details'}
                    </button>
                  ))}
                </div>

                {wizardStep === 1 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Choose template</h4>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Input
                          type="search"
                          placeholder="Filter by name or code…"
                          value={tplFilterSearch}
                          onChange={(e) => setTplFilterSearch(e.target.value)}
                          className="h-8 flex-1 min-w-[180px]"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTplFiltersExpanded((v) => !v)}
                        >
                          {tplFiltersExpanded ? 'Hide dimensions' : 'Filter by dimensions'}
                        </Button>
                        {activeTplFilterCount > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTplFilterSearch('')
                              setTplDimFilters({})
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                      {tplFiltersExpanded && (
                        <div className="grid grid-cols-2 gap-2">
                          {TEMPLATE_DIM_TYPES.map((dt) => (
                            <div key={dt} className="space-y-1">
                              <Label className="text-xs">{TEMPLATE_DIM_LABELS[dt]}</Label>
                              <select
                                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                                value={tplDimFilters[dt] ?? ''}
                                onChange={(e) =>
                                  setTplDimFilters((prev) => ({ ...prev, [dt]: e.target.value }))
                                }
                              >
                                <option value="">Any</option>
                                {tplDimOptions[dt].map((code) => (
                                  <option key={code} value={code}>
                                    {code}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Showing {wizardTemplatesToShow.length} of {templates.length} templates
                      </p>
                    </div>
                    <div className="grid gap-2 max-h-[320px] overflow-y-auto pr-1">
                      {wizardTemplatesToShow.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No templates match the current filters.</p>
                      ) : (
                        wizardTemplatesToShow.map((tpl) => (
                          <button
                            key={tpl.strategy_template_id}
                            type="button"
                            onClick={() => handleTemplateSelect(tpl.strategy_template_id)}
                            className={cn(
                              'rounded-lg border p-3 text-left transition-colors',
                              selectedTemplateId === tpl.strategy_template_id
                                ? 'border-primary bg-accent-soft'
                                : 'border-border hover:border-primary/40',
                            )}
                          >
                            <div className="font-medium text-sm">{tpl.display_name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{tpl.template_code}</div>
                            {(tpl.typical_use || tpl.explanation) && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {tpl.typical_use || tpl.explanation}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {TEMPLATE_DIM_TYPES.map((dt) => {
                                const v = templateDimAt(tpl, dt)
                                return v ? (
                                  <Badge key={dt} variant="secondary" className="text-[10px] font-normal">
                                    {v}
                                  </Badge>
                                ) : null
                              })}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    {defaultLegsLoading && (
                      <p className="text-xs text-muted-foreground">Loading template…</p>
                    )}
                  </div>
                )}

                {wizardStep === 2 && wizardTemplateDetail && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Parameters</h4>
                    {wizardTemplateDetail.example && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Example:</strong> {wizardTemplateDetail.example}
                      </p>
                    )}
                    {(wizardTemplateDetail.meta_params ?? []).filter((p) => p.param_kind !== 'fixed')
                      .length === 0 ? (
                      <p className="text-sm text-muted-foreground">No editable parameters. Click Next.</p>
                    ) : (
                      <div className="space-y-3 rounded-lg border p-3">
                        {(wizardTemplateDetail.meta_params ?? [])
                          .filter((p) => p.param_kind !== 'fixed')
                          .map((p) => (
                            <div key={p.meta_key} className="space-y-1">
                              <Label className="text-xs">{p.display_label ?? p.meta_key}</Label>
                              <Input
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
                                className="h-8"
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
                    formNotes={formNotes}
                    defaultLegsLoading={defaultLegsLoading}
                    isEdit={mode.kind === 'edit'}
                    wizardTemplateDetail={wizardTemplateDetail}
                    wizardParamValues={wizardParamValues}
                    wizardVisitedMetaStep={wizardVisitedMetaStep}
                    onUpdateForm={updateForm}
                    onUpdateConstraint={updateConstraint}
                    onAddConstraint={addConstraint}
                    onRemoveConstraint={removeConstraint}
                    onNotesChange={setFormNotes}
                    onParamChange={(key, value) =>
                      setWizardParamValues((prev) => ({ ...prev, [key]: value }))
                    }
                  />
                )}
              </>
            )}
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {isWizard &&
              (wizardStep < 3 ? (
                <Button
                  type="button"
                  onClick={goWizardNext}
                  disabled={wizardStep === 1 && !selectedTemplateId}
                >
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={submitWizardForm} disabled={submitting}>
                  {mode.kind === 'edit' ? 'Save' : 'Create'}
                </Button>
              ))}
          </SheetFooter>
        </SheetContent>
      </Sheet>

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

interface StructureDetailsFieldsProps {
  formPayload: StructurePayload
  formLegs: StructureLeg[]
  formConstraints: StructureConstraint[]
  formNotes: string
  defaultLegsLoading: boolean
  isEdit: boolean
  wizardTemplateDetail: Awaited<ReturnType<typeof fetchTemplateDetail>> | null
  wizardParamValues: Record<string, string | number>
  wizardVisitedMetaStep: boolean
  onUpdateForm: (patch: Partial<StructurePayload>) => void
  onUpdateConstraint: (index: number, patch: Partial<StructureConstraint>) => void
  onAddConstraint: () => void
  onRemoveConstraint: (index: number) => void
  onNotesChange: (notes: string) => void
  onParamChange: (key: string, value: string | number) => void
}

function StructureDetailsFields({
  formPayload,
  formLegs,
  formConstraints,
  formNotes,
  defaultLegsLoading,
  isEdit,
  wizardTemplateDetail,
  wizardParamValues,
  wizardVisitedMetaStep,
  onUpdateForm,
  onUpdateConstraint,
  onAddConstraint,
  onRemoveConstraint,
  onNotesChange,
  onParamChange,
}: StructureDetailsFieldsProps) {
  const metaNF = (wizardTemplateDetail?.meta_params ?? []).filter((p) => p.param_kind !== 'fixed')
  const showStep3Meta = metaNF.length > 0 && !wizardVisitedMetaStep

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <h4 className="text-sm font-medium">Metadata</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs inline-flex items-center">
              Name
              <InfoTooltip text="Auto-filled from structure type and parameters; you can edit." />
            </Label>
            <Input
              value={formPayload.name}
              onChange={(e) => onUpdateForm({ name: e.target.value })}
              placeholder="Structure name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs inline-flex items-center">
              Version
              {isEdit && (
                <InfoTooltip text="Read-only when editing. New version is offered on Save when Type, SubType, or Meta change." />
              )}
            </Label>
            <Input
              type="number"
              min={1}
              value={formPayload.version ?? 1}
              onChange={(e) => onUpdateForm({ version: parseInt(e.target.value, 10) || 1 })}
              disabled={isEdit}
              className="font-mono"
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-5">
            <Label className="text-xs">Available</Label>
            <Switch
              checked={formPayload.is_active ?? true}
              onCheckedChange={(checked) => onUpdateForm({ is_active: checked })}
            />
          </div>
        </div>
      </div>

      {showStep3Meta && wizardTemplateDetail && (
        <div className="rounded-lg border p-3 space-y-3">
          <h4 className="text-sm font-medium">Parameters</h4>
          {metaNF.map((p) => (
            <div key={p.meta_key} className="space-y-1">
              <Label className="text-xs">{p.display_label ?? p.meta_key}</Label>
              <Input
                type="number"
                min={p.param_kind === 'percent' ? 1 : 0}
                max={p.param_kind === 'percent' ? 50 : undefined}
                value={wizardParamValues[p.meta_key] ?? p.default_value_text ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10) ?? e.target.value
                  onParamChange(p.meta_key, v as string | number)
                }}
                className="h-8 max-w-[120px] font-mono"
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-3 space-y-2">
          <h4 className="text-sm font-medium">Legs</h4>
          <p className="text-xs text-muted-foreground">From template. Not editable here.</p>
          {defaultLegsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Right</TableHead>
                    <TableHead>Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formLegs.map((leg, i) => (
                    <TableRow key={`${leg.role}-${leg.direction}-${i}`}>
                      <TableCell className="text-xs">{leg.role ?? '—'}</TableCell>
                      <TableCell className="text-xs">{leg.direction ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{leg.option_right ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{leg.quantity ?? 1}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <h4 className="text-sm font-medium">Constraints</h4>
          <div className="space-y-2">
            {formConstraints.map((c, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <Input
                  value={c.constraint_type ?? ''}
                  onChange={(e) => onUpdateConstraint(i, { constraint_type: e.target.value })}
                  placeholder="Type"
                  className="h-8 flex-1 min-w-[80px]"
                />
                <Input
                  value={c.constraint_value_text ?? ''}
                  onChange={(e) => onUpdateConstraint(i, { constraint_value_text: e.target.value })}
                  placeholder="Value (text)"
                  className="h-8 flex-1 min-w-[80px]"
                />
                <Input
                  type="number"
                  value={c.constraint_value_int ?? ''}
                  onChange={(e) =>
                    onUpdateConstraint(i, {
                      constraint_value_int:
                        e.target.value === '' ? null : parseInt(e.target.value, 10),
                    })
                  }
                  placeholder="Int"
                  className="h-8 w-20 font-mono"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemoveConstraint(i)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={onAddConstraint}>
              Add constraint
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <h4 className="text-sm font-medium">Notes</h4>
        <textarea
          value={formNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Optional notes"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[72px]"
        />
      </div>
    </div>
  )
}
