/**
 * An opportunity as its form holds it, and the payload it writes — one
 * definition of a valid opportunity, shared by the create / edit sheet
 * (`OpportunityFormModal`) and the Desk's inspector (design Rev .140).
 *
 * The form keeps ids as strings (they come from pickers); `''` means none.
 */
import type { CreateOpportunityBody, EntryCondition, EntryConditionInput, StrategyOpportunityDetail } from '@/types/strategy'

export interface OpportunityFormState {
  name: string
  /** `''` = no structure picked (the server refuses that). */
  structureId: string
  /** `''` = no default gate. */
  gateSetId: string
  /** `''` · `watchlist_stk` · `explicit_symbols` (see `OPPORTUNITY_SCOPE_TYPES`). */
  scopeType: string
  symbols: string[]
  conditions: EntryConditionInput[]
  /** Available — on the books. Not every surface edits it; every write carries it. */
  isActive: boolean
}

export const EMPTY_OPPORTUNITY_FORM: OpportunityFormState = {
  name: '',
  structureId: '',
  gateSetId: '',
  scopeType: '',
  symbols: [],
  conditions: [],
  isActive: true,
}

/** The row "Add condition" starts from. */
export function newEntryCondition(): EntryConditionInput {
  return { condition_type: 'iv_min', value_text: null, value_numeric: null }
}

/** A stored condition into the form: a missing type reads as none picked (`''`), which the payload drops. */
export function conditionToInput(c: EntryCondition): EntryConditionInput {
  return { condition_type: c.condition_type ?? '', value_text: c.value_text, value_numeric: c.value_numeric }
}

/** Scope types that carry a symbol list; any other scope sends none. */
export function scopeTakesSymbols(scopeType: string): boolean {
  return scopeType === 'explicit_symbols' || scopeType === 'watchlist_stk'
}

/** Switching scope drops the symbols when the new scope has no list. */
export function withScopeType(f: OpportunityFormState, scopeType: string): OpportunityFormState {
  return { ...f, scopeType, symbols: scopeTakesSymbols(scopeType) ? f.symbols : [] }
}

export function opportunityToForm(d: StrategyOpportunityDetail): OpportunityFormState {
  return {
    name: d.name,
    structureId: d.strategy_structure_id != null ? String(d.strategy_structure_id) : '',
    gateSetId: d.default_gate_safety_strategy_id != null ? String(d.default_gate_safety_strategy_id) : '',
    scopeType: d.scope_type ?? '',
    symbols: d.symbols ?? [],
    conditions: (d.entry_conditions ?? []).map(conditionToInput),
    isActive: d.is_active === true,
  }
}

/** Why the server would refuse this draft, or null when it is writable. */
export function opportunityFormProblem(f: Pick<OpportunityFormState, 'name' | 'structureId'>): string | null {
  if (!f.name.trim()) return 'Name is required.'
  if (!f.structureId) return 'Structure is required.'
  return null
}

export function opportunityFormToPayload(f: OpportunityFormState): CreateOpportunityBody {
  const scope = (f.scopeType || '').trim() || null
  const symbols =
    scope === 'explicit_symbols'
      ? f.symbols.map((s) => s.trim()).filter(Boolean)
      : scope === 'watchlist_stk'
        ? f.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean)
        : []
  const entryConditions = f.conditions
    .filter((c) => (c.condition_type ?? '').trim())
    .map((c) => ({
      condition_type: c.condition_type.trim(),
      value_text: c.value_text?.trim() || null,
      value_numeric: c.value_numeric ?? null,
    }))
  return {
    name: f.name.trim(),
    strategy_structure_id: Number(f.structureId),
    default_gate_safety_strategy_id: f.gateSetId ? Number(f.gateSetId) : null,
    scope_type: scope,
    symbols,
    entry_conditions: entryConditions,
    is_active: f.isActive,
  }
}

/** Symbols as one line of text: `AMD · NVDA`. */
export function symbolsToText(symbols: string[]): string {
  return symbols.join(' · ')
}

/** Text back to symbols — split on `·`, commas or spaces, upper-cased as the form types them. */
export function textToSymbols(text: string): string[] {
  return text
    .split(/[\s,·]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}
