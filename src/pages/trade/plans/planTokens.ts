/**
 * Plans' token search (design Rev .138 §7): the toolbar's DS TokenSearchField.
 * Suggestions are Symbol · Structure · Source · Plan id · Contains (the
 * full text: id, symbol, structure, rationale, source). Tokens of one kind are
 * a union, kinds are an intersection. The tokens live in the URL (`q`), so a
 * filtered list is a link, and Clear N counts them.
 */
import type { SearchToken, TokenSuggestion } from '@bifrost/ui'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { planToken } from '@/utils/tradeOrigin'
import { planSourceText } from './planRows'

export type PlanTokenKind = 'sym' | 'structure' | 'source' | 'id' | 'contains'

const KIND_LABEL: Record<PlanTokenKind, string> = {
  sym: 'Symbol',
  structure: 'Structure',
  source: 'Source',
  id: 'Plan',
  contains: 'Contains',
}

const KINDS = Object.keys(KIND_LABEL) as PlanTokenKind[]

function isKind(k: string): k is PlanTokenKind {
  return (KINDS as string[]).includes(k)
}

/** `sym:AMD;contains:roll` ⇄ tokens. Unknown kinds are dropped. */
export function parsePlanTokens(q: string | null): SearchToken[] {
  if (!q) return []
  const out: SearchToken[] = []
  for (const part of q.split(';')) {
    const i = part.indexOf(':')
    const kind = part.slice(0, i)
    const value = part.slice(i + 1)
    if (i > 0 && isKind(kind) && value) out.push({ kind, value, kindLabel: KIND_LABEL[kind] })
  }
  return out
}

export function serializePlanTokens(tokens: readonly SearchToken[]): string | null {
  return tokens.length ? tokens.map((t) => `${t.kind}:${t.value.replace(/;/g, ',')}`).join(';') : null
}

function haystack(plan: StrategyPlan): string {
  return [
    planToken(plan.strategy_plan_id),
    plan.symbol,
    plan.structure_label,
    plan.rationale ?? '',
    planSourceText(plan),
  ]
    .join(' ')
    .toLowerCase()
}

function tokenMatches(plan: StrategyPlan, t: SearchToken): boolean {
  const v = t.value.toLowerCase()
  switch (t.kind) {
    case 'sym':
      return plan.symbol.toLowerCase() === v
    case 'structure':
      return plan.structure_label.toLowerCase() === v
    case 'source':
      return plan.source_kind.toLowerCase() === v
    case 'id':
      return planToken(plan.strategy_plan_id).toLowerCase() === v
    default:
      return haystack(plan).includes(v)
  }
}

/** Union within a kind, intersection across kinds. No tokens = every plan. */
export function matchesPlanTokens(plan: StrategyPlan, tokens: readonly SearchToken[]): boolean {
  const byKind = new Map<string, SearchToken[]>()
  for (const t of tokens) byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t])
  for (const group of byKind.values()) {
    if (!group.some((t) => tokenMatches(plan, t))) return false
  }
  return true
}

/** What typing `q` offers, from the plans on the page; Contains always last. */
export function suggestPlanTokens(plans: readonly StrategyPlan[], q: string, max = 8): TokenSuggestion[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const out: TokenSuggestion[] = []
  const seen = new Set<string>()
  const offer = (kind: PlanTokenKind, value: string, label?: string) => {
    const key = `${kind}:${value.toLowerCase()}`
    if (seen.has(key) || !value.toLowerCase().includes(s)) return
    seen.add(key)
    const hint = plans.filter((p) => tokenMatches(p, { kind, value })).length
    out.push({ kind, value, kindLabel: KIND_LABEL[kind], label, hint: String(hint) })
  }
  for (const p of plans) offer('sym', p.symbol)
  for (const p of plans) offer('structure', p.structure_label)
  for (const p of plans) offer('source', p.source_kind)
  for (const p of plans) offer('id', planToken(p.strategy_plan_id))
  const trimmed = out.slice(0, max - 1)
  trimmed.push({ kind: 'contains', value: q.trim(), kindLabel: KIND_LABEL.contains, label: `Text contains “${q.trim()}”` })
  return trimmed
}
