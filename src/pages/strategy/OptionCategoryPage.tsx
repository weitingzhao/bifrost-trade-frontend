import { useState, useEffect, useCallback } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { dangerTextBtnClass } from '@/lib/uiClasses'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Settings2, Plus, GripVertical, Search, X, LayoutGrid } from 'lucide-react'
import type {
  StrategyTemplateRow, StrategyTemplateDetail, StructureLeg,
  StructureTypeLegPayload, MetaParamPayload, StrategyDimRow,
} from '@/types/positions'
import {
  createTemplate, updateTemplate, deleteTemplate,
  replaceTemplateLegs, replaceTemplateParams, replaceTemplateCharacteristics,
  createDim, deleteDim,
} from '@/api/strategy'
import {
  useOptionCategoryTemplates,
  useOptionCategoryDims,
  useOptionCategoryTemplateDetail,
  useOptionCategoryFormOptions,
  TEMPLATES_KEY,
  TEMPLATE_DETAIL_KEY,
  DIMS_KEY,
} from '@/hooks/useOptionCategory'
import { DIM_TYPES, DIM_LABELS, DIM_ICONS, type DimType } from '@/pages/strategy/optionCategory/constants'
import { SaveFeedback } from '@/pages/strategy/optionCategory/SaveFeedback'
import { TemplateMetaEditor } from '@/pages/strategy/optionCategory/TemplateMetaEditor'

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OptionCategoryPage() {
  const queryClient = useQueryClient()

  // Selection
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Filters
  const [searchText, setSearchText] = useState('')
  const [dimFilters, setDimFilters] = useState<Partial<Record<DimType, string>>>({})
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Drag reorder
  const [dragId, setDragId] = useState<number | null>(null)

  // Dialogs
  const [dimsDialogOpen, setDimsDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ msg: string; action: () => Promise<void> } | null>(null)

  // New template form
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')

  // New dim form
  const [newDimType, setNewDimType] = useState<DimType>('direction')
  const [newDimCode, setNewDimCode] = useState('')
  const [newDimLabel, setNewDimLabel] = useState('')

  // Save feedback
  const [feedback, setFeedback] = useState<{ section: string; ok: boolean } | null>(null)

  // Local editing state (copy of server detail for editing)
  const [detail, setDetail] = useState<StrategyTemplateDetail | null>(null)

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: templatesData, isLoading: templatesLoading, isError: templatesError } =
    useOptionCategoryTemplates()
  const { data: dimsData } = useOptionCategoryDims()
  const { data: detailData, isLoading: detailLoading } = useOptionCategoryTemplateDetail(selectedId)
  const { paramKinds, legRoles, legDirs, legOrs } = useOptionCategoryFormOptions()

  const paramKindOpts = paramKinds.data?.options ?? []
  const legRoleOpts = legRoles.data?.options ?? []
  const legDirOpts = legDirs.data?.options ?? []
  const legOrOpts = legOrs.data?.options ?? []
  const dimsByType = dimsData?.by_type ?? {}
  const templates = templatesData?.items ?? []

  // Sync local editing state from query
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (detailData) setDetail(detailData)
    else if (selectedId == null) setDetail(null)
  }, [detailData, selectedId])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Derived lists ─────────────────────────────────────────────────────────
  const activeDimFilterCount = Object.values(dimFilters).filter(Boolean).length
  const hasFilter = activeDimFilterCount > 0 || searchText.trim().length > 0

  const filteredTemplates = templates.filter(t => {
    const q = searchText.trim().toLowerCase()
    if (q && !t.display_name.toLowerCase().includes(q) && !t.template_code.toLowerCase().includes(q)) return false
    for (const dt of DIM_TYPES) {
      const fv = dimFilters[dt]
      if (fv && (t[`dim_${dt}` as keyof StrategyTemplateRow] as string | null) !== fv) return false
    }
    return true
  })

  const sidebarTemplates = [...filteredTemplates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // ── Feedback helper ───────────────────────────────────────────────────────
  const showFeedback = useCallback((section: string, ok: boolean) => {
    setFeedback({ section, ok })
    setTimeout(() => setFeedback(null), 2000)
  }, [])

  // ── Drag reorder ──────────────────────────────────────────────────────────
  async function applyReorder(draggedId: number, targetId: number) {
    if (draggedId === targetId) return
    const sorted = [...templates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const ids = sorted.map(t => t.strategy_template_id)
    const from = ids.indexOf(draggedId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, draggedId)
    const updates: Promise<unknown>[] = []
    for (let i = 0; i < next.length; i++) {
      const tid = next[i]
      const row = templates.find(t => t.strategy_template_id === tid)
      const newOrder = (i + 1) * 10
      if (row && row.sort_order !== newOrder) {
        updates.push(updateTemplate(tid, { sort_order: newOrder }))
      }
    }
    if (updates.length === 0) return
    try {
      await Promise.all(updates)
      await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      showFeedback('reorder', true)
    } catch {
      showFeedback('reorder', false)
    }
  }

  // ── Save handlers ─────────────────────────────────────────────────────────
  async function saveInfo() {
    if (!detail) return
    try {
      const code = detail.template_code.trim().toLowerCase().replace(/\s+/g, '_')
      if (!code || !/^[a-z][a-z0-9_]*$/.test(code)) { showFeedback('info', false); return }
      await updateTemplate(detail.strategy_template_id, {
        template_code: code,
        display_name: detail.display_name,
        dim_direction: detail.dim_direction,
        dim_structure: detail.dim_structure,
        dim_coverage: detail.dim_coverage,
        dim_risk: detail.dim_risk,
        dim_volatility: detail.dim_volatility,
        dim_time: detail.dim_time,
        explanation: detail.explanation,
        typical_use: detail.typical_use,
        example: detail.example,
        nature: detail.nature,
        sort_order: detail.sort_order,
        is_active: detail.is_active,
      })
      await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      await queryClient.invalidateQueries({ queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id] })
      showFeedback('info', true)
    } catch {
      showFeedback('info', false)
    }
  }

  async function saveLegs() {
    if (!detail) return
    try {
      const legs: StructureTypeLegPayload[] = (detail.legs ?? []).map((l, i) => ({
        role: l.role,
        direction: l.direction,
        option_right: l.option_right === null || l.option_right === undefined ? '' : String(l.option_right),
        quantity_default: l.quantity ?? 1,
        sort_order: i,
      }))
      await replaceTemplateLegs(detail.strategy_template_id, legs)
      await queryClient.invalidateQueries({ queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id] })
      showFeedback('legs', true)
    } catch {
      showFeedback('legs', false)
    }
  }

  async function saveParams() {
    if (!detail) return
    try {
      const items: MetaParamPayload[] = (detail.meta_params ?? []).map(p => ({
        meta_key: p.meta_key,
        display_label: p.display_label,
        default_value_text: p.default_value_text,
        param_kind: p.param_kind ?? 'fixed',
        sort_order: p.sort_order,
      }))
      await replaceTemplateParams(detail.strategy_template_id, items)
      await queryClient.invalidateQueries({ queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id] })
      showFeedback('params', true)
    } catch {
      showFeedback('params', false)
    }
  }

  async function saveCharacteristics() {
    if (!detail) return
    try {
      await replaceTemplateCharacteristics(detail.strategy_template_id, detail.characteristics ?? [])
      await queryClient.invalidateQueries({ queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id] })
      showFeedback('chars', true)
    } catch {
      showFeedback('chars', false)
    }
  }

  // ── Create template ───────────────────────────────────────────────────────
  async function handleCreate() {
    const code = newCode.trim().toLowerCase().replace(/\s+/g, '_')
    if (!code) return
    try {
      const { strategy_template_id } = await createTemplate({
        template_code: code,
        display_name: newName.trim() || code,
        dim_structure: 'custom',
        sort_order: 100,
      })
      setCreateDialogOpen(false)
      setNewCode('')
      setNewName('')
      await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      setSelectedId(strategy_template_id)
    } catch {
      showFeedback('create', false)
    }
  }

  // ── Add dim ───────────────────────────────────────────────────────────────
  async function handleAddDim() {
    if (!newDimCode.trim()) return
    await createDim(newDimType, {
      code: newDimCode.trim().toLowerCase(),
      display_label: newDimLabel.trim() || newDimCode.trim(),
      sort_order: 0,
    })
    setNewDimCode('')
    setNewDimLabel('')
    await queryClient.invalidateQueries({ queryKey: DIMS_KEY })
  }

  // ── Delete template ───────────────────────────────────────────────────────
  function openDeleteTemplate() {
    if (!detail) return
    setConfirmDialog({
      msg: `Delete template "${detail.display_name}"? This fails if any structure references it.`,
      action: async () => {
        await deleteTemplate(detail.strategy_template_id)
        setSelectedId(null)
        await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      },
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (templatesLoading && templates.length === 0) {
    return (
      <PageShell className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }

  if (templatesError && templates.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Option Category" />
        <p className="text-sm text-red-500">Failed to load templates.</p>
      </PageShell>
    )
  }

  return (
    <PageShell padding="none" className="flex flex-col h-full">
      <PageHeader
        className="px-6 py-4 border-b shrink-0"
        title="Option Category"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setDimsDialogOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />
              Dimensions
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </>
        }
      />

      {/* Two-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ── */}
        <aside className="w-64 flex flex-col border-r overflow-hidden shrink-0">
          {/* Search */}
          <div className="p-3 border-b space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-7 pl-7 text-xs"
                placeholder="Search templates…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              {searchText && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearchText('')}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Dim filter toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {hasFilter ? `${filteredTemplates.length} / ${templates.length}` : `${templates.length}`} templates
                {feedback?.section === 'reorder' && (
                  <span className={cn('ml-2', feedback.ok ? 'text-green-600' : 'text-red-500')}>
                    {feedback.ok ? '✓ reordered' : '✗ failed'}
                  </span>
                )}
              </span>
              <Button
                variant={activeDimFilterCount > 0 ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setFiltersOpen(v => !v)}
              >
                <LayoutGrid className="h-3 w-3 mr-1" />
                {activeDimFilterCount > 0 ? `${activeDimFilterCount} filter` : 'Filter'}
              </Button>
            </div>

            {/* Dim filter panel */}
            {filtersOpen && (
              <div className="space-y-1.5 pt-1">
                {DIM_TYPES.map(dt => (
                  <div key={dt} className="flex items-center gap-2">
                    <span className="w-5 text-center text-sm" title={DIM_LABELS[dt]}>{DIM_ICONS[dt]}</span>
                    <select
                      className="flex-1 h-6 text-[10px] rounded border border-input bg-background px-1 focus:outline-none"
                      value={dimFilters[dt] ?? ''}
                      onChange={e => setDimFilters(prev => {
                        const next = { ...prev }
                        if (e.target.value) next[dt] = e.target.value
                        else delete next[dt]
                        return next
                      })}
                    >
                      <option value="">All {DIM_LABELS[dt]}</option>
                      {(dimsByType[dt] ?? []).map((d: StrategyDimRow) => (
                        <option key={d.code} value={d.code}>{d.display_label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                {activeDimFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => setDimFilters({})}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Template list */}
          <ul className="flex-1 overflow-y-auto py-1">
            {hasFilter && sidebarTemplates.length === 0 && (
              <li className="text-xs text-muted-foreground text-center py-4">No matches</li>
            )}
            {sidebarTemplates.map(t => (
              <li
                key={t.strategy_template_id}
                className={cn(
                  'group flex items-center gap-1 px-2 py-0.5',
                  dragId === t.strategy_template_id && 'opacity-40',
                )}
                onDragOver={hasFilter ? undefined : e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                onDrop={hasFilter ? undefined : e => {
                  e.preventDefault()
                  const id = parseInt(e.dataTransfer.getData('application/x-tpl-id'), 10)
                  if (!Number.isNaN(id)) void applyReorder(id, t.strategy_template_id)
                  setDragId(null)
                }}
              >
                {/* Drag handle — only when no filter active */}
                {!hasFilter && (
                  <span
                    className="cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70 shrink-0"
                    draggable
                    onDragStart={e => {
                      setDragId(t.strategy_template_id)
                      e.dataTransfer.setData('application/x-tpl-id', String(t.strategy_template_id))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDragId(null)}
                  >
                    <GripVertical className="h-4 w-4" />
                  </span>
                )}
                <button
                  className={cn(
                    'flex-1 text-left px-2 py-1.5 rounded text-xs hover:bg-muted/60 transition-colors min-w-0',
                    selectedId === t.strategy_template_id && 'bg-muted font-medium',
                  )}
                  onClick={() => setSelectedId(t.strategy_template_id)}
                >
                  <div className="truncate">{t.display_name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{t.template_code}</div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── Detail pane ── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
              <LayoutGrid className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select a template from the sidebar</p>
            </div>
          ) : detailLoading && !detail ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className="p-6 space-y-6">
              {/* ── Template Info + Dimensions ── */}
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{detail.display_name}</h2>
                    <Badge variant="outline" className="font-mono text-[10px]">{detail.template_code}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveFeedback section="info" feedback={feedback} />
                    <Button size="sm" className="h-7 text-xs" onClick={() => void saveInfo()}>Save</Button>
                    <Button size="sm" variant="ghost" className={cn('h-7 text-xs', dangerTextBtnClass)} onClick={openDeleteTemplate}>Delete</Button>
                  </div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Basic fields */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Template code</Label>
                      <Input
                        className="h-7 text-xs font-mono"
                        value={detail.template_code}
                        onChange={e => setDetail({ ...detail, template_code: e.target.value })}
                        spellCheck={false}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs mb-1 block">Display name</Label>
                      <Input className="h-7 text-xs" value={detail.display_name} onChange={e => setDetail({ ...detail, display_name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Sort order</Label>
                      <Input
                        className="h-7 text-xs"
                        type="number"
                        value={detail.sort_order}
                        onChange={e => setDetail({ ...detail, sort_order: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>
                    <div className="flex items-end gap-2 pb-0.5">
                      <Switch
                        id="is-active"
                        checked={detail.is_active}
                        onCheckedChange={v => setDetail({ ...detail, is_active: v })}
                      />
                      <Label htmlFor="is-active" className="text-xs">Active</Label>
                    </div>
                  </div>

                  {/* Six dimensions grid */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Six Dimensions</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {DIM_TYPES.map(dt => (
                        <div key={dt}>
                          <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                            <span>{DIM_ICONS[dt]}</span> {DIM_LABELS[dt]}
                          </div>
                          <select
                            className="w-full h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none"
                            value={(detail[`dim_${dt}` as keyof StrategyTemplateDetail] as string | null) ?? ''}
                            onChange={e => setDetail({
                              ...detail,
                              [`dim_${dt}`]: e.target.value || null,
                            } as StrategyTemplateDetail)}
                          >
                            <option value="">—</option>
                            {(dimsByType[dt] ?? []).map((d: StrategyDimRow) => (
                              <option key={d.code} value={d.code}>{d.display_label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Default Legs ── */}
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Default Legs</h3>
                  <div className="flex items-center gap-2">
                    <SaveFeedback section="legs" feedback={feedback} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setDetail({ ...detail, legs: [...(detail.legs ?? []), { role: 'call', direction: 'long', option_right: 'C', quantity: 1, strike: null, expiration: null }] })}
                    >
                      + Add leg
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => void saveLegs()}>Save</Button>
                  </div>
                </div>
                {(detail.legs ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground px-4 py-6 text-center">No legs defined. Click "Add leg" to get started.</p>
                ) : (
                  <div className="px-4 py-3">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="h-7">Role</TableHead>
                          <TableHead className="h-7">Direction</TableHead>
                          <TableHead className="h-7">Right</TableHead>
                          <TableHead className="h-7 text-right w-20">Qty</TableHead>
                          <TableHead className="h-7 w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(detail.legs ?? []).map((leg: StructureLeg, i: number) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="py-1">
                              <select
                                className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-28"
                                value={leg.role ?? ''}
                                onChange={e => {
                                  const legs = [...(detail.legs ?? [])]
                                  legs[i] = { ...legs[i], role: e.target.value || null }
                                  setDetail({ ...detail, legs })
                                }}
                              >
                                <option value="">—</option>
                                {legRoleOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </TableCell>
                            <TableCell className="py-1">
                              <select
                                className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-24"
                                value={leg.direction ?? ''}
                                onChange={e => {
                                  const legs = [...(detail.legs ?? [])]
                                  legs[i] = { ...legs[i], direction: e.target.value || null }
                                  setDetail({ ...detail, legs })
                                }}
                              >
                                {legDirOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </TableCell>
                            <TableCell className="py-1">
                              <select
                                className="h-7 text-xs rounded border border-input bg-background px-2 focus:outline-none w-20"
                                value={leg.option_right ?? ''}
                                onChange={e => {
                                  const legs = [...(detail.legs ?? [])]
                                  legs[i] = { ...legs[i], option_right: e.target.value || null }
                                  setDetail({ ...detail, legs })
                                }}
                              >
                                {legOrOpts.map(o => <option key={o.value || '_empty'} value={o.value}>{o.label}</option>)}
                              </select>
                            </TableCell>
                            <TableCell className="py-1 text-right">
                              <Input
                                className="h-7 text-xs w-16 ml-auto"
                                type="number"
                                min={1}
                                value={leg.quantity ?? 1}
                                onChange={e => {
                                  const legs = [...(detail.legs ?? [])]
                                  legs[i] = { ...legs[i], quantity: parseInt(e.target.value, 10) || 1 }
                                  setDetail({ ...detail, legs })
                                }}
                              />
                            </TableCell>
                            <TableCell className="py-1">
                              <button
                                className={dangerTextBtnClass}
                                onClick={() => {
                                  const legs = [...(detail.legs ?? [])]
                                  legs.splice(i, 1)
                                  setDetail({ ...detail, legs })
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* ── Meta Parameters ── */}
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Meta Parameters</h3>
                  <SaveFeedback section="params" feedback={feedback} />
                </div>
                <div className="px-4 py-3">
                  <TemplateMetaEditor
                    detail={detail}
                    setDetail={setDetail}
                    paramKindOpts={paramKindOpts}
                    onSave={() => void saveParams()}
                  />
                </div>
              </div>

              {/* ── Characteristics ── */}
              <div className="rounded-lg border">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Characteristics</h3>
                  <div className="flex items-center gap-2">
                    <SaveFeedback section="chars" feedback={feedback} />
                    <Button size="sm" className="h-7 text-xs" onClick={() => void saveCharacteristics()}>Save</Button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <textarea
                    className="w-full rounded border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={6}
                    placeholder="One characteristic per line…"
                    value={(detail.characteristics ?? []).join('\n')}
                    onChange={e => setDetail({
                      ...detail,
                      characteristics: e.target.value.split('\n').filter(Boolean),
                    })}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* ── Create Template Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Template code (snake_case)</Label>
              <Input
                className="h-8 text-sm font-mono"
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate() }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Display name</Label>
              <Input
                className="h-8 text-sm"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleCreate() }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => void handleCreate()} disabled={!newCode.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delete Dialog ── */}
      <Dialog open={!!confirmDialog} onOpenChange={open => { if (!open) setConfirmDialog(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{confirmDialog?.msg}</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                await confirmDialog?.action()
                setConfirmDialog(null)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dimensions Dialog ── */}
      <Dialog open={dimsDialogOpen} onOpenChange={setDimsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Dimension Values</DialogTitle>
          </DialogHeader>

          {/* Dimension columns grid */}
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
            {DIM_TYPES.map(dt => (
              <div key={dt}>
                <div className="text-xs font-medium mb-2 flex items-center gap-1">
                  <span>{DIM_ICONS[dt]}</span> {DIM_LABELS[dt]}
                </div>
                {(dimsByType[dt] ?? []).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">No values</p>
                ) : (
                  <ul className="space-y-1">
                    {(dimsByType[dt] ?? []).map((row: StrategyDimRow) => (
                      <li key={row.strategy_dim_id} className="flex items-center gap-1 group">
                        <code className="text-[10px] font-mono bg-muted px-1 rounded flex-1 truncate">{row.code}</code>
                        <button
                          className={cn('opacity-0 group-hover:opacity-100 shrink-0', dangerTextBtnClass)}
                          title={`Delete ${row.code}`}
                          onClick={() => setConfirmDialog({
                            msg: `Delete dimension value "${row.code}"?`,
                            action: async () => {
                              await deleteDim(row.strategy_dim_id)
                              await queryClient.invalidateQueries({ queryKey: DIMS_KEY })
                            },
                          })}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Add dim row */}
          <div className="flex items-center gap-2 pt-4 border-t mt-2">
            <select
              className="h-8 text-xs rounded border border-input bg-background px-2 focus:outline-none"
              value={newDimType}
              onChange={e => setNewDimType(e.target.value as DimType)}
            >
              {DIM_TYPES.map(dt => <option key={dt} value={dt}>{DIM_LABELS[dt]}</option>)}
            </select>
            <Input
              className="h-8 text-xs w-28"
              placeholder="code"
              value={newDimCode}
              onChange={e => setNewDimCode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAddDim() }}
            />
            <Input
              className="h-8 text-xs flex-1"
              placeholder="label"
              value={newDimLabel}
              onChange={e => setNewDimLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleAddDim() }}
            />
            <Button size="sm" className="h-8 shrink-0" onClick={() => void handleAddDim()} disabled={!newDimCode.trim()}>
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
