import { useState, useCallback } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { LayoutGrid, Plus, Settings2 } from 'lucide-react'
import type {
  StrategyTemplateRow,
  StrategyDimRow,
} from '@/types/positions'
import { createTemplate, createDim, deleteDim, updateTemplate } from '@/api/strategy'
import {
  useOptionCategoryTemplates,
  useOptionCategoryDims,
  TEMPLATES_KEY,
  DIMS_KEY,
} from '@/hooks/useOptionCategory'
import { DIM_TYPES, type DimType } from '@/components/strategy/templates/constants'
import { OptionCategorySidebar } from '@/pages/strategy/optionCategory/OptionCategorySidebar'
import { TemplateEditor } from '@/components/strategy/templates/TemplateEditor'
import { OptionCategoryCreateDialog } from '@/pages/strategy/optionCategory/OptionCategoryCreateDialog'
import { OptionCategoryDimensionsDialog } from '@/pages/strategy/optionCategory/OptionCategoryDimensionsDialog'
import {
  OPTION_CATEGORY_INFO,
  optionCategoryDetailEmptyClass,
  optionCategoryDetailMainClass,
  optionCategoryLayoutClass,
  optionCategoryPageHeaderClass,
} from '@/components/strategy/templates/optionCategoryUi'

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

  const { data: templatesData, isLoading: templatesLoading, isError: templatesError } =
    useOptionCategoryTemplates()
  const { data: dimsData } = useOptionCategoryDims()

  const dimsByType = dimsData?.by_type ?? {}
  const templates = templatesData?.items ?? []

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





  async function handleCreate() {
    const code = newCode.trim().toLowerCase().replace(/\s+/g, '_')
    if (!code) return
    try {
      // `custom` is not a code in the dim_structure dictionary, and the server
      // validates against it: this call answered 400 every time (measured on
      // DEV 2026-09-18). A new template simply has no dimensions yet.
      const { strategy_template_id } = await createTemplate({
        template_code: code,
        display_name: newName.trim() || code,
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
          ) : (
            <TemplateEditor templateId={selectedId} onDeleted={() => setSelectedId(null)} />
          )}
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
