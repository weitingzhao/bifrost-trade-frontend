/**
 * A structure as its editors hold it, and the payload an edit writes — one
 * definition shared by the edit sheet (`StructureFormSheet`) and the Desk's
 * Structure inspector (design Rev .140).
 *
 * A structure's six dimensions are not its own: they come from the linked
 * template, so the payload carries the template link and never a dim.
 */
import type {
  MetaParamItem,
  StrategyStructure,
  StrategyTemplateDetail,
  StrategyTemplateRow,
  StructureLeg,
  StructureMetaEntry,
  StructurePayload,
} from '@/types/strategy'
import { structureToPayload, wizardParamValuesFromSavedMeta } from '@/utils/strategyFormUtils'

/** The six `dim_*` a template carries, in the order every surface lists them. */
export const TEMPLATE_DIM_TYPES = ['direction', 'structure', 'coverage', 'risk', 'volatility', 'time'] as const
export type TemplateDimType = (typeof TEMPLATE_DIM_TYPES)[number]

export function templateDimAt(t: StrategyTemplateRow, dt: TemplateDimType): string | null {
  const v = t[`dim_${dt}`]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/** The template search: name, code, typical use or explanation contain the query. */
export function templateMatchesSearch(t: StrategyTemplateRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    t.display_name.toLowerCase().includes(q) ||
    t.template_code.toLowerCase().includes(q) ||
    (!!t.typical_use && t.typical_use.toLowerCase().includes(q)) ||
    (!!t.explanation && t.explanation.toLowerCase().includes(q))
  )
}

/** Values of a template's editable (non-fixed) parameters, by `meta_key`. */
export type TemplateParamValues = Record<string, string | number>

/** What a freshly picked template's editable parameters start from: their defaults. */
export function templateParamDefaults(metaParams: MetaParamItem[] | undefined | null): TemplateParamValues {
  const pv: TemplateParamValues = {}
  metaParams?.forEach((p) => {
    if (p.param_kind !== 'fixed' && p.default_value_text) pv[p.meta_key] = p.default_value_text
  })
  return pv
}

/**
 * The meta a structure on a template writes: each fixed parameter at the
 * template's default, each editable one at its value (blank ones left out).
 * A template without parameters (or one whose detail did not load) leaves the
 * structure's own meta as it is.
 */
export function buildStructureMeta(
  metaParams: MetaParamItem[] | undefined | null,
  values: TemplateParamValues,
  fallbackMeta: StructureMetaEntry[],
): StructureMetaEntry[] {
  if (!metaParams?.length) return [...fallbackMeta]
  const meta: StructureMetaEntry[] = []
  metaParams.forEach((p) => {
    if (p.param_kind === 'fixed') {
      if (p.default_value_text != null && p.default_value_text !== '') {
        meta.push({ meta_key: p.meta_key, meta_value_text: p.default_value_text })
      }
    } else {
      const v = values[p.meta_key]
      if (v !== undefined && v !== '') meta.push({ meta_key: p.meta_key, meta_value_text: String(v) })
    }
  })
  return meta
}

/** Same keys with the same values, in any order (blank keys ignored). */
export function metaEntriesEqual(a: StructureMetaEntry[], b: StructureMetaEntry[]): boolean {
  const norm = (arr: StructureMetaEntry[]) =>
    [...arr]
      .filter((m) => m.meta_key)
      .sort((x, y) => (x.meta_key ?? '').localeCompare(y.meta_key ?? ''))
      .map((m) => `${m.meta_key}:${m.meta_value_text ?? ''}`)
      .join('|')
  return norm(a) === norm(b)
}

/** Everything an edit of a structure writes. */
export interface StructureEditFields {
  name: string
  strategyTemplateId: number | undefined
  structureType: string | undefined
  legs: StructureLeg[]
  version: number | undefined
  isActive: boolean | undefined
  notes: string
  meta: StructureMetaEntry[]
}

/** The full `PUT /strategy/structures/{id}` body for an edit. */
export function structureEditPayload(f: StructureEditFields): StructurePayload {
  return {
    name: f.name.trim(),
    strategy_template_id: f.strategyTemplateId,
    structure_type: f.structureType,
    legs: f.legs,
    version: f.version ?? 1,
    is_active: f.isActive ?? true,
    notes: f.notes.trim() || undefined,
    meta: f.meta.length ? f.meta : undefined,
  }
}

/** A structure as the inspector holds it: the edit fields plus its template's parameters. */
export interface StructureFormState extends StructureEditFields {
  /** The linked template's parameters; null when its detail is not loaded (meta then stays as saved). */
  metaParams: MetaParamItem[] | null
  /** Editable parameter values (what `meta` is rebuilt from when one changes). */
  paramValues: TemplateParamValues
}

/**
 * The structure as saved. Nothing is rebuilt here — an edit of the name alone
 * writes back the legs, meta, type, version, notes and availability
 * the structure already had.
 */
export function structureToForm(
  row: StrategyStructure,
  template: Pick<StrategyTemplateDetail, 'meta_params'> | null,
): StructureFormState {
  const p = structureToPayload(row)
  const meta = p.meta ?? []
  const metaParams = template?.meta_params ?? null
  return {
    name: p.name,
    strategyTemplateId: p.strategy_template_id,
    structureType: p.structure_type,
    legs: p.legs,
    version: p.version,
    isActive: p.is_active,
    notes: p.notes ?? '',
    meta,
    metaParams,
    paramValues: wizardParamValuesFromSavedMeta(meta, metaParams ?? undefined),
  }
}

/**
 * Link another template, as the sheet does: its code becomes the structure's
 * type, its legs replace the structure's, its editable
 * parameters start at their defaults, and the meta is rebuilt from them.
 */
export function withTemplate(f: StructureFormState, t: StrategyTemplateDetail): StructureFormState {
  const paramValues = templateParamDefaults(t.meta_params)
  return {
    ...f,
    strategyTemplateId: t.strategy_template_id,
    structureType: t.template_code,
    legs: t.legs ?? [],
    metaParams: t.meta_params ?? null,
    paramValues,
    meta: buildStructureMeta(t.meta_params, paramValues, f.meta),
  }
}

/** One editable parameter changed: the meta follows. */
export function withParam(f: StructureFormState, key: string, value: string | number): StructureFormState {
  const paramValues = { ...f.paramValues, [key]: value }
  return { ...f, paramValues, meta: buildStructureMeta(f.metaParams, paramValues, f.meta) }
}

export function structureFormToPayload(f: StructureFormState): StructurePayload {
  return structureEditPayload(f)
}

/** A leg as one mono line: `SELL 1 PUT · short_put · 450 · 2026-11-20`. */
export function legLine(leg: StructureLeg): string {
  const head = [leg.direction?.toUpperCase(), leg.quantity ?? 1, leg.option_right?.toUpperCase()]
    .filter((x) => x != null && x !== '')
    .join(' ')
  const tail = [leg.role, leg.strike != null ? String(leg.strike) : null, leg.expiration].filter(
    (x): x is string => !!x,
  )
  return [head, ...tail].join(' · ')
}
