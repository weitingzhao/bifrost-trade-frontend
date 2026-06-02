import { useState, useEffect, useCallback } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { LayoutGrid, Plus, Settings2 } from 'lucide-react'
import type {
  StrategyTemplateRow,
  StrategyTemplateDetail,
  StructureTypeLegPayload,
  MetaParamPayload,
  StrategyDimRow,
} from '@/types/positions'
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  replaceTemplateLegs,
  replaceTemplateParams,
  replaceTemplateCharacteristics,
  createDim,
  deleteDim,
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
import { DIM_TYPES, type DimType } from '@/pages/strategy/optionCategory/constants'
import { OptionCategorySidebar } from '@/pages/strategy/optionCategory/OptionCategorySidebar'
import { OptionCategoryTemplateInfoSection } from '@/pages/strategy/optionCategory/OptionCategoryTemplateInfoSection'
import { OptionCategoryLegsSection } from '@/pages/strategy/optionCategory/OptionCategoryLegsSection'
import { OptionCategoryMetaTable } from '@/pages/strategy/optionCategory/OptionCategoryMetaTable'
import { OptionCategoryCharacteristicsSection } from '@/pages/strategy/optionCategory/OptionCategoryCharacteristicsSection'
import { OptionCategoryCreateDialog } from '@/pages/strategy/optionCategory/OptionCategoryCreateDialog'
import { OptionCategoryDimensionsDialog } from '@/pages/strategy/optionCategory/OptionCategoryDimensionsDialog'
import {
  OPTION_CATEGORY_INFO,
  optionCategoryDetailContentClass,
  optionCategoryDetailEmptyClass,
  optionCategoryDetailLoadingClass,
  optionCategoryDetailMainClass,
  optionCategoryLayoutClass,
  optionCategoryPageHeaderClass,
} from '@/pages/strategy/optionCategory/optionCategoryUi'

export default function OptionCategoryPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [dimFilters, setDimFilters] = useState<Partial<Record<DimType, string>>>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)

  const [dimsDialogOpen, setDimsDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<{
    title: string
    message: string
    confirmLabel?: string
    action: () => Promise<void>
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newDimType, setNewDimType] = useState<DimType>('direction')
  const [newDimCode, setNewDimCode] = useState('')
  const [newDimLabel, setNewDimLabel] = useState('')

  const [feedback, setFeedback] = useState<{ section: string; ok: boolean } | null>(null)
  const [detail, setDetail] = useState<StrategyTemplateDetail | null>(null)

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (detailData) setDetail(detailData)
    else if (selectedId == null) setDetail(null)
  }, [detailData, selectedId])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeDimFilterCount = Object.values(dimFilters).filter(Boolean).length
  const hasFilter = activeDimFilterCount > 0 || searchText.trim().length > 0

  const filteredTemplates = templates.filter((t) => {
    const q = searchText.trim().toLowerCase()
    if (q && !t.display_name.toLowerCase().includes(q) && !t.template_code.toLowerCase().includes(q)) {
      return false
    }
    for (const dt of DIM_TYPES) {
      const fv = dimFilters[dt]
      if (fv && (t[`dim_${dt}` as keyof StrategyTemplateRow] as string | null) !== fv) return false
    }
    return true
  })

  const sidebarTemplates = [...filteredTemplates].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  )

  const showFeedback = useCallback((section: string, ok: boolean) => {
    setFeedback({ section, ok })
    setTimeout(() => setFeedback(null), 2000)
  }, [])

  async function applyReorder(draggedId: number, targetId: number) {
    if (draggedId === targetId) return
    const sorted = [...templates].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const ids = sorted.map((t) => t.strategy_template_id)
    const from = ids.indexOf(draggedId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, draggedId)
    const updates: Promise<unknown>[] = []
    for (let i = 0; i < next.length; i++) {
      const tid = next[i]
      const row = templates.find((t) => t.strategy_template_id === tid)
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

  async function saveInfo() {
    if (!detail) return
    try {
      const code = detail.template_code.trim().toLowerCase().replace(/\s+/g, '_')
      if (!code || !/^[a-z][a-z0-9_]*$/.test(code)) {
        showFeedback('info', false)
        return
      }
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
      await queryClient.invalidateQueries({
        queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id],
      })
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
        option_right:
          l.option_right === null || l.option_right === undefined ? '' : String(l.option_right),
        quantity_default: l.quantity ?? 1,
        sort_order: i,
      }))
      await replaceTemplateLegs(detail.strategy_template_id, legs)
      await queryClient.invalidateQueries({
        queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id],
      })
      showFeedback('legs', true)
    } catch {
      showFeedback('legs', false)
    }
  }

  async function saveParams() {
    if (!detail) return
    try {
      const items: MetaParamPayload[] = (detail.meta_params ?? []).map((p) => ({
        meta_key: p.meta_key,
        display_label: p.display_label,
        default_value_text: p.default_value_text,
        param_kind: p.param_kind ?? 'fixed',
        sort_order: p.sort_order,
      }))
      await replaceTemplateParams(detail.strategy_template_id, items)
      await queryClient.invalidateQueries({
        queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id],
      })
      showFeedback('params', true)
    } catch {
      showFeedback('params', false)
    }
  }

  async function saveCharacteristics() {
    if (!detail) return
    try {
      await replaceTemplateCharacteristics(detail.strategy_template_id, detail.characteristics ?? [])
      await queryClient.invalidateQueries({
        queryKey: [...TEMPLATE_DETAIL_KEY, detail.strategy_template_id],
      })
      showFeedback('chars', true)
    } catch {
      showFeedback('chars', false)
    }
  }

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

  function openDeleteTemplate() {
    if (!detail) return
    setConfirmState({
      title: 'Delete template',
      message: `Delete template "${detail.display_name}"? This fails if any structure references it.`,
      confirmLabel: 'Confirm delete',
      action: async () => {
        await deleteTemplate(detail.strategy_template_id)
        setSelectedId(null)
        await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      },
    })
  }

  function openDeleteDim(row: StrategyDimRow) {
    setConfirmState({
      title: 'Delete dimension value',
      message: `Delete dimension value "${row.code}"?`,
      confirmLabel: 'Confirm delete',
      action: async () => {
        await deleteDim(row.strategy_dim_id)
        await queryClient.invalidateQueries({ queryKey: DIMS_KEY })
      },
    })
  }

  async function handleConfirm() {
    if (!confirmState) return
    setConfirming(true)
    try {
      await confirmState.action()
      setConfirmState(null)
    } finally {
      setConfirming(false)
    }
  }

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
    <PageShell padding="none" className="flex h-full flex-col">
      <PageHeader
        className={optionCategoryPageHeaderClass}
        title={
          <span className="inline-flex items-center gap-1">
            Option Category
            <InfoTooltip text={OPTION_CATEGORY_INFO} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setDimsDialogOpen(true)}>
              <Settings2 className="mr-1 h-4 w-4" />
              Dimensions
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Template
            </Button>
          </>
        }
      />

      <div className={optionCategoryLayoutClass}>
        <OptionCategorySidebar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          dimFilters={dimFilters}
          onDimFiltersChange={setDimFilters}
          filtersOpen={filtersOpen}
          onFiltersOpenToggle={() => setFiltersOpen((v) => !v)}
          activeDimFilterCount={activeDimFilterCount}
          hasFilter={hasFilter}
          filteredCount={filteredTemplates.length}
          totalCount={templates.length}
          sidebarTemplates={sidebarTemplates}
          dimsByType={dimsByType}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          dragId={dragId}
          onDragIdChange={setDragId}
          onReorder={(from, to) => void applyReorder(from, to)}
          reorderFeedback={feedback}
        />

        <main className={optionCategoryDetailMainClass}>
          {!selectedId ? (
            <div className={optionCategoryDetailEmptyClass}>
              <LayoutGrid className="h-12 w-12 opacity-20" />
              <p className="text-sm">Select a template from the sidebar</p>
            </div>
          ) : detailLoading && !detail ? (
            <div className={optionCategoryDetailLoadingClass}>
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className={optionCategoryDetailContentClass}>
              <OptionCategoryTemplateInfoSection
                detail={detail}
                dimsByType={dimsByType}
                feedback={feedback}
                onDetailChange={setDetail}
                onSave={() => void saveInfo()}
                onDelete={openDeleteTemplate}
              />
              <OptionCategoryLegsSection
                detail={detail}
                legRoleOpts={legRoleOpts}
                legDirOpts={legDirOpts}
                legOrOpts={legOrOpts}
                feedback={feedback}
                onDetailChange={setDetail}
                onSave={() => void saveLegs()}
              />
              <OptionCategoryMetaTable
                detail={detail}
                paramKindOpts={paramKindOpts}
                feedback={feedback}
                onDetailChange={setDetail}
                onSave={() => void saveParams()}
              />
              <OptionCategoryCharacteristicsSection
                detail={detail}
                feedback={feedback}
                onDetailChange={setDetail}
                onSave={() => void saveCharacteristics()}
              />
            </div>
          ) : null}
        </main>
      </div>

      <OptionCategoryCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        newCode={newCode}
        newName={newName}
        onNewCodeChange={setNewCode}
        onNewNameChange={setNewName}
        onCreate={() => void handleCreate()}
      />

      <OptionCategoryDimensionsDialog
        open={dimsDialogOpen}
        onOpenChange={setDimsDialogOpen}
        dimsByType={dimsByType}
        newDimType={newDimType}
        newDimCode={newDimCode}
        newDimLabel={newDimLabel}
        onNewDimTypeChange={setNewDimType}
        onNewDimCodeChange={setNewDimCode}
        onNewDimLabelChange={setNewDimLabel}
        onAddDim={() => void handleAddDim()}
        onRequestDeleteDim={openDeleteDim}
      />

      <ConfirmDialog
        open={confirmState != null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm delete'}
        confirming={confirming}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </PageShell>
  )
}
