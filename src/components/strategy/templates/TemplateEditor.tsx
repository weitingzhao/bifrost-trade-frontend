/**
 * A template, edited where it is used.
 *
 * The four sections — info and dimensions, legs, parameters, characteristics —
 * were the Option Category page's whole right half. They moved here so the
 * catalog inside the Structure sheet can offer them too: choosing a template
 * sets a structure's six dimensions, and being sent to another page to correct
 * the template you just picked is the seam the design closes (the catalog has
 * no route of its own, 2026-09-12).
 *
 * One editor, two mounts. The saves are the same four calls the page has always
 * made, and the detail is held here rather than in either caller so an edit in
 * progress cannot be half-owned by a page.
 *
 * `onDeleted` is optional: the sheet offers deletion, the Option Category page
 * needs to clear its own selection afterwards.
 */
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  deleteTemplate,
  replaceTemplateCharacteristics,
  replaceTemplateLegs,
  replaceTemplateParams,
  updateTemplate,
} from '@/api/strategy'
import {
  TEMPLATES_KEY,
  TEMPLATE_DETAIL_KEY,
  useOptionCategoryDims,
  useOptionCategoryFormOptions,
  useOptionCategoryTemplateDetail,
} from '@/hooks/useOptionCategory'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { OptionCategoryTemplateInfoSection } from './OptionCategoryTemplateInfoSection'
import { OptionCategoryLegsSection } from './OptionCategoryLegsSection'
import { OptionCategoryMetaTable } from './OptionCategoryMetaTable'
import { OptionCategoryCharacteristicsSection } from './OptionCategoryCharacteristicsSection'
import { optionCategoryDetailContentClass } from './optionCategoryUi'
import type { MetaParamPayload, StrategyTemplateDetail, StructureTypeLegPayload } from '@/types/positions'

export type TemplateSection = 'info' | 'legs' | 'params' | 'chars' | 'create'

export function TemplateEditor({
  templateId,
  onDeleted,
}: {
  templateId: number | null
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  /**
   * The edit in progress, tagged with the template it belongs to. Derived
   * rather than synced: picking a different template makes the tag stop
   * matching, so the server's copy takes over with no effect to run, and a
   * save clears it so the refetched row becomes the truth again.
   */
  const [edited, setEdited] = useState<{ id: number; value: StrategyTemplateDetail } | null>(null)
  const [feedback, setFeedback] = useState<{ section: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: detailData, isLoading } = useOptionCategoryTemplateDetail(templateId)
  const { data: dimsData } = useOptionCategoryDims()
  const { paramKinds, legRoles, legDirs, legOrs } = useOptionCategoryFormOptions()

  const detail = edited?.id === templateId ? edited.value : (detailData ?? null)
  const setDetail = (next: StrategyTemplateDetail) => {
    if (templateId != null) setEdited({ id: templateId, value: next })
  }

  function flash(section: TemplateSection, ok: boolean) {
    setFeedback({ section, ok })
    window.setTimeout(() => setFeedback((f) => (f?.section === section ? null : f)), 2500)
  }

  async function afterWrite(section: TemplateSection, id: number) {
    await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
    await queryClient.invalidateQueries({ queryKey: [...TEMPLATE_DETAIL_KEY, id] })
    setEdited(null)
    flash(section, true)
  }

  async function saveInfo() {
    if (!detail) return
    const code = detail.template_code.trim().toLowerCase().replace(/\s+/g, '_')
    // The server keys templates by code, and a code it would reject is caught
    // here rather than after a round trip.
    if (!code || !/^[a-z][a-z0-9_]*$/.test(code)) return flash('info', false)
    try {
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
      await afterWrite('info', detail.strategy_template_id)
    } catch {
      flash('info', false)
    }
  }

  async function saveLegs() {
    if (!detail) return
    try {
      const legs: StructureTypeLegPayload[] = (detail.legs ?? []).map((l, i) => ({
        role: l.role,
        direction: l.direction,
        option_right: l.option_right == null ? '' : String(l.option_right),
        quantity_default: l.quantity ?? 1,
        sort_order: i,
      }))
      await replaceTemplateLegs(detail.strategy_template_id, legs)
      await afterWrite('legs', detail.strategy_template_id)
    } catch {
      flash('legs', false)
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
      await afterWrite('params', detail.strategy_template_id)
    } catch {
      flash('params', false)
    }
  }

  async function saveCharacteristics() {
    if (!detail) return
    try {
      await replaceTemplateCharacteristics(detail.strategy_template_id, detail.characteristics ?? [])
      await afterWrite('chars', detail.strategy_template_id)
    } catch {
      flash('chars', false)
    }
  }

  async function reallyDelete() {
    if (!detail) return
    setDeleting(true)
    try {
      await deleteTemplate(detail.strategy_template_id)
      await queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY })
      setEdited(null)
      setConfirmDelete(false)
      onDeleted?.()
    } catch {
      flash('info', false)
    } finally {
      setDeleting(false)
    }
  }

  if (templateId == null) return null
  if (isLoading || detail == null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className={optionCategoryDetailContentClass}>
      <OptionCategoryTemplateInfoSection
        detail={detail}
        dimsByType={dimsData?.by_type ?? {}}
        feedback={feedback}
        onDetailChange={setDetail}
        onSave={() => void saveInfo()}
        onDelete={() => setConfirmDelete(true)}
      />
      <OptionCategoryLegsSection
        detail={detail}
        legRoleOpts={legRoles.data?.options ?? []}
        legDirOpts={legDirs.data?.options ?? []}
        legOrOpts={legOrs.data?.options ?? []}
        feedback={feedback}
        onDetailChange={setDetail}
        onSave={() => void saveLegs()}
      />
      <OptionCategoryMetaTable
        detail={detail}
        paramKindOpts={paramKinds.data?.options ?? []}
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
      <ConfirmDialog
        open={confirmDelete}
        title="Delete template"
        message={`Delete template “${detail.display_name}”? This fails if any structure references it — which is the point: a structure with no template has no dimensions.`}
        confirmLabel="Confirm delete"
        confirming={deleting}
        onConfirm={() => void reallyDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
