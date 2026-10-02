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
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useOptionCategoryFormOptions, useStrategyDims } from '@/hooks/useOptionCategory'
import { useTemplateDetail } from '@/hooks/useStructureManagement'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { OptionCategoryTemplateInfoSection } from './OptionCategoryTemplateInfoSection'
import { OptionCategoryLegsSection } from './OptionCategoryLegsSection'
import { OptionCategoryMetaTable } from './OptionCategoryMetaTable'
import { OptionCategoryCharacteristicsSection } from './OptionCategoryCharacteristicsSection'
import { optionCategoryDetailContentClass } from './optionCategoryUi'
import type { SaveFeedbackState } from './SaveFeedback'
import { normalTemplateCode, templateInfoPatch } from './templateInfoPatch'
import type { MetaParamPayload, StrategyTemplateDetail, TemplateLegPayload } from '@/types/positions'

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
  const [feedback, setFeedback] = useState<SaveFeedbackState>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  /** Why the server refused the delete (a 409 names the structures still using it). */
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: detailData, isLoading } = useTemplateDetail(templateId)
  const { data: dimsData } = useStrategyDims()
  const { paramKinds, legRoles, legDirs, legOrs } = useOptionCategoryFormOptions()

  const detail = edited?.id === templateId ? edited.value : (detailData ?? null)
  const setDetail = (next: StrategyTemplateDetail) => {
    if (templateId != null) setEdited({ id: templateId, value: next })
  }

  /** "Saved" fades; a refusal stays, with the server's reason, until the next save. */
  function flash(section: TemplateSection, ok: boolean, error?: unknown) {
    const message = error == null ? undefined : error instanceof Error ? error.message : String(error)
    setFeedback({ section, ok, message })
    if (ok) window.setTimeout(() => setFeedback((f) => (f?.section === section && f.ok ? null : f)), 2500)
  }

  async function afterWrite(section: TemplateSection, id: number) {
    // The list the catalogue picks from and this template's detail — the same
    // detail the Structure inspector around this editor reads.
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.templates.list('active') })
    await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.templates.detail(id) })
    setEdited(null)
    flash(section, true)
  }

  async function saveInfo() {
    if (!detail) return
    // The server keys templates by code, and a code it would reject is caught
    // here rather than after a round trip.
    const code = normalTemplateCode(detail.template_code)
    if (!code) return flash('info', false, 'the template code must be lower snake case, starting with a letter')
    try {
      // PATCH (api 0.3.0): an emptied text goes as null — a blank one is refused.
      await updateTemplate(detail.strategy_template_id, templateInfoPatch(detail, code))
      await afterWrite('info', detail.strategy_template_id)
    } catch (e) {
      flash('info', false, e)
    }
  }

  async function saveLegs() {
    if (!detail) return
    try {
      const legs: TemplateLegPayload[] = (detail.legs ?? []).map((l, i) => ({
        role: l.role,
        direction: l.direction,
        option_right: l.option_right == null ? '' : String(l.option_right),
        quantity_default: l.quantity ?? 1,
        sort_order: i,
      }))
      await replaceTemplateLegs(detail.strategy_template_id, legs)
      await afterWrite('legs', detail.strategy_template_id)
    } catch (e) {
      flash('legs', false, e)
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
    } catch (e) {
      flash('params', false, e)
    }
  }

  async function saveCharacteristics() {
    if (!detail) return
    try {
      await replaceTemplateCharacteristics(detail.strategy_template_id, detail.characteristics ?? [])
      await afterWrite('chars', detail.strategy_template_id)
    } catch (e) {
      flash('chars', false, e)
    }
  }

  async function reallyDelete() {
    if (!detail) return
    setDeleting(true)
    setDeleteError(null)
    try {
      // A template already gone (another tab) resolves too: what was asked is true.
      await deleteTemplate(detail.strategy_template_id)
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategy.templates.root })
      setEdited(null)
      setConfirmDelete(false)
      onDeleted?.()
    } catch (e) {
      // In use (409) names the structures; the dialog stays open with it.
      setDeleteError(e instanceof Error ? e.message : String(e))
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
        message={`Delete template “${detail.display_name}”? This fails if any structure references it, deactivated ones included — which is the point: a structure with no template has no dimensions.`}
        bodyExtra={
          deleteError ? (
            <p role="alert" className="m-0 text-sm text-destructive text-pretty">
              {deleteError}
            </p>
          ) : null
        }
        confirmLabel="Confirm delete"
        confirming={deleting}
        onConfirm={() => void reallyDelete()}
        onCancel={() => {
          setDeleteError(null)
          setConfirmDelete(false)
        }}
      />
    </div>
  )
}
