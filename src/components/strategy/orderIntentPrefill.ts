/**
 * A Research order intent, turned into the opportunity form's prefill.
 *
 * Shared since 2026-09-18: the Desk's Decide lane opens this form (design
 * DECISIONS 2026-09-18 — `Proposal → Opportunity 预填流`) and Strategy ›
 * Opportunity has opened it since the bridge was built. One mapping, so a
 * proposal turned into a rule from the desk and one turned into a rule from
 * the old page produce the same opportunity.
 *
 * The intent itself is advisory and carries `d10: BLOCKED` in its own
 * envelope. Writing an opportunity from it is a rulebook entry, not an order.
 */
import type { OrderIntentPayload } from '@/api/research/orderIntents'
import type { PrefillData } from '@/components/strategy/OpportunityFormModal'

export function mapIntentToPrefill(payload: OrderIntentPayload): PrefillData {
  const template = String(payload.strategy_template ?? '').trim()
  const hypId = String(payload.hypothesis_id ?? '').trim()
  const shortHyp = hypId ? hypId.slice(0, 8) : ''
  const legs = Array.isArray(payload.legs) ? (payload.legs as Array<{ symbol?: string }>) : []
  const symbolSet = new Set<string>()
  for (const leg of legs) {
    const s = leg?.symbol
    if (typeof s === 'string' && s.trim()) symbolSet.add(s.trim().toUpperCase())
  }
  const symbols = Array.from(symbolSet)
  // The form's own vocabulary, not a near-synonym: it renders the symbol list
  // only for `explicit_symbols` / `watchlist_stk`, so `symbol` / `watchlist`
  // matched no option and silently dropped the names the intent named. One or
  // many, an intent names its symbols outright — a watchlist is a standing
  // list, which is a different kind of scope and not something to infer.
  const scopeType = symbols.length > 0 ? 'explicit_symbols' : ''
  const nameParts = ['Research proposal']
  if (template) nameParts.push(template)
  if (shortHyp) nameParts.push(shortHyp)
  return {
    name: nameParts.join(' · '),
    structureId: '',
    gateSafetyId: '',
    scopeType,
    symbols,
    conditions: [],
  }
}
