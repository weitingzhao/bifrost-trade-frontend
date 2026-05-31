import { fmtTs } from '@/lib/format'
import type {
  CreateOpportunityBody,
  MetaParamItem,
  StructureConstraint,
  StructureLeg,
  StructureMetaEntry,
  StructurePayload,
  StrategyOpportunityDetail,
  StrategyStructure,
} from '@/types/strategy'

export const DEFAULT_STRUCTURE_PAYLOAD: StructurePayload = {
  name: '',
  strategy_template_id: undefined,
  structure_type: '',
  legs: [],
  constraints: [],
  version: 1,
  is_active: true,
  notes: '',
  meta: [],
}

export function getStructureDisplayLabel(row: StrategyStructure): string {
  if (row.template_display_name) return row.template_display_name
  if (row.structure_subtype_label) return row.structure_subtype_label
  if (row.structure_type) return row.structure_type.replace(/_/g, ' ')
  return '—'
}

export function summarizeDimensions(row: StrategyStructure): string {
  const parts = [row.dim_direction, row.dim_structure, row.dim_volatility].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function summarizeLegs(legs: StructureLeg[] | null | undefined): string {
  if (!legs?.length) return '—'
  return legs
    .map((l) => {
      const q = l.quantity ?? 1
      const d = l.direction ?? ''
      const r = l.role ?? ''
      const o = l.option_right ?? ''
      const parts = [r, d, o].filter(Boolean)
      return `${q}× ${parts.join(' ')}`.trim() || '—'
    })
    .join(', ')
}

export function summarizeConstraints(constraints: StructureConstraint[] | null | undefined): string {
  if (!constraints?.length) return '—'
  return constraints
    .map((c) => {
      const t = (c.constraint_type ?? '').trim()
      if (!t) return ''
      const v = c.constraint_value_text ?? c.constraint_value_int ?? ''
      return `${t}: ${v}`
    })
    .filter(Boolean)
    .join(', ')
}

export function formatHistoryTs(ts: number | string | null | undefined): string {
  if (ts == null) return '—'
  if (typeof ts === 'number' && Number.isFinite(ts)) return fmtTs(ts)
  return String(ts)
}

export function summarizeStateSummary(stateSummary: unknown): string {
  if (stateSummary == null) return '—'
  if (typeof stateSummary === 'string') return stateSummary.slice(0, 120)
  try {
    const s = JSON.stringify(stateSummary)
    return s.length > 120 ? `${s.slice(0, 117)}...` : s
  } catch {
    return '—'
  }
}

function metadataToMetaEntries(metadata: StrategyStructure['metadata']): StructureMetaEntry[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  return Object.entries(metadata).map(([meta_key, v]) => ({
    meta_key,
    meta_value_text: v != null && typeof v !== 'object' ? String(v) : null,
  }))
}

export function wizardParamValuesFromSavedMeta(
  meta: StructureMetaEntry[] | undefined,
  metaParams: MetaParamItem[] | undefined,
): Record<string, string | number> {
  const byKey = new Map(
    (meta ?? []).filter((m) => m.meta_key).map((m) => [m.meta_key, m.meta_value_text]),
  )
  const out: Record<string, string | number> = {}
  for (const mp of metaParams ?? []) {
    if (mp.param_kind === 'fixed') continue
    const raw = byKey.get(mp.meta_key)
    if (raw == null || raw === '') continue
    const s = String(raw).trim()
    const n = Number(s)
    out[mp.meta_key] = s !== '' && Number.isFinite(n) ? n : String(raw)
  }
  return out
}

export function structureToPayload(row: StrategyStructure): StructurePayload {
  const legs: StructureLeg[] = Array.isArray(row.legs) ? row.legs : []
  const constraints: StructureConstraint[] = Array.isArray(row.constraints) ? row.constraints : []
  const meta = metadataToMetaEntries(row.metadata)
  const structureType = row.structure_type ?? 'custom'
  const structureSubtype =
    structureType === 'covered_call' && row.structure_subtype
      ? row.structure_subtype
      : undefined
  return {
    name: row.name,
    strategy_template_id: row.strategy_template_id ?? undefined,
    structure_type: structureType,
    structure_subtype: structureSubtype ?? null,
    legs,
    constraints,
    version:
      typeof row.version === 'number'
        ? row.version
        : typeof row.version === 'string'
          ? parseInt(String(row.version), 10) || 1
          : 1,
    is_active: row.is_active,
    notes: row.notes ?? '',
    meta,
  }
}

export function isSchemaMismatchError(msg: string): boolean {
  const s = msg.toLowerCase()
  return /leg\s*\d|requires exactly|must be/.test(s) || s.includes('schema')
}

// ── Opportunity helpers (shared with OpportunitiesPage) ───────────────────────

const SCOPE_TYPE_LABELS: Record<string, string> = {
  '': '— None',
  watchlist_stk: 'Watchlist (stocks)',
  explicit_symbols: 'Explicit symbols',
}

export function getScopeTypeLabel(key: string | null | undefined): string {
  if (key == null || key === '') return '— None'
  return SCOPE_TYPE_LABELS[key] ?? key
}

export function getScopeDisplay(
  scopeType: string | null | undefined,
  symbols: string[] | null | undefined,
): { text: string; title: string } {
  const list = symbols?.filter((s) => s != null && String(s).trim()) ?? []
  const symbolsLabel = list.length > 0 ? list.join(', ') : ''
  if (scopeType == null || scopeType === '') {
    return { text: '— None', title: '' }
  }
  if (scopeType === 'explicit_symbols') {
    const text = list.length > 0 ? symbolsLabel : 'Explicit symbols'
    return { text, title: symbolsLabel }
  }
  if (scopeType === 'watchlist_stk') {
    const text = list.length > 0 ? symbolsLabel : 'Watchlist (stocks)'
    return { text, title: list.length > 0 ? symbolsLabel : 'All watchlist STK' }
  }
  return { text: getScopeTypeLabel(scopeType), title: symbolsLabel }
}

export function opportunityDetailToPayload(row: StrategyOpportunityDetail): CreateOpportunityBody {
  return {
    name: row.name,
    strategy_structure_id: row.strategy_structure_id ?? 0,
    default_gate_safety_strategy_id: row.default_gate_safety_strategy_id ?? null,
    scope_type: row.scope_type ?? null,
    symbols: row.symbols ?? [],
    entry_conditions: row.entry_conditions ?? [],
    is_active: row.is_active,
  }
}
