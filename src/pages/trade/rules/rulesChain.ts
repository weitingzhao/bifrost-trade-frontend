/**
 * The rulebook as one chain: Structure → Opportunity → Allocation · gate →
 * Instance.
 *
 * This is where the seven `/strategy/*` pages go (design DECISIONS 2026-09-18,
 * re-confirming the 2026-09-12 ruling). They were seven CRUD screens with no
 * way to see that a shape is used by two opportunities, that one of them is in
 * no allocation at all, and that an instance therefore ran under no gate. The
 * chain answers that by construction: pick anything and its lineage lights up
 * across all four columns.
 *
 * A **gate is a limit whose scope is an allocation** (same ruling). It is
 * defined here and its breaches land on Risk › Limits, which is why the gate
 * has no column of its own — it hangs off the allocation that applies it.
 *
 * ## What the server gives, and what it does not
 *
 * The four entities and the gate come from the Strategy API and carry their own
 * links. An **instance does not carry a state or a P&L**: the record has an
 * opportunity, an account, an opened-at and a fill count, and nothing else.
 * Both are derived here from the instance's own executions, with the Ledger's
 * cash convention so the figure is the Ledger's figure (§14.2):
 *
 * - **open / closed** — closed when every contract the instance touched is flat
 *   by its own fills. Measured 2026-09-18 on DEV: 59 closed, 30 open.
 * - **realised** — the signed cash of those fills, and only on a closed
 *   instance. An open one has legs that need a mark, and the place a mark is
 *   read is Positions; a number here that quietly meant "realised so far" would
 *   be read as the instance's P&L.
 *
 * The daemon's finer states — tight, roll due — are FSM states nothing exposes,
 * so the column says open or closed and does not invent the rest.
 */
export { readInstances, type InstanceReading } from '@/utils/strategyInstances'
import { type InstanceReading } from '@/utils/strategyInstances'
export type { ChainData } from '@/hooks/useRulesChain'
import type { ChainData } from '@/hooks/useRulesChain'
import type {
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/strategy'

export type ChainKind = 'structure' | 'opportunity' | 'allocation' | 'instance'

export interface ChainSelection {
  kind: ChainKind
  id: number
}

const KINDS: ChainKind[] = ['structure', 'opportunity', 'allocation', 'instance']

/**
 * The selection in the URL, so another page can point at a link in the chain.
 *
 * `?pick=instance:142`. Orders & Fills links a linked fill to the instance that
 * claims it, and Playbook stats links a structure row to the shape it counts —
 * neither is a real link unless the chain can be opened already lit.
 */
export function parsePick(raw: string | null | undefined): ChainSelection | null {
  const [kind, id] = String(raw ?? '').split(':')
  const n = Number(id)
  if (!KINDS.includes(kind as ChainKind) || !Number.isFinite(n)) return null
  return { kind: kind as ChainKind, id: n }
}

export function formatPick(sel: ChainSelection): string {
  return `${sel.kind}:${sel.id}`
}

/** What every card in a column carries, whichever column it is in. */
export interface ChainCard {
  kind: ChainKind
  id: number
  title: string
  sub: string
  tag: string
  tagVariant: 'success' | 'warning' | 'danger' | 'neutral'
  facts: string[]
  /** Lit by the current selection — the lineage. */
  lit: boolean
  selected: boolean
}

export interface ChainColumn {
  key: 'structure' | 'opportunity' | 'allocation' | 'instance'
  step: string
  title: string
  count: string
  cards: ChainCard[]
}

interface Lit {
  structure: Set<number>
  opportunity: Set<number>
  allocation: Set<number>
  instance: Set<number>
}

/**
 * Everything the selection is connected to.
 *
 * Walked in both directions from whatever was picked, because the question a
 * reader has is never one-way: from a structure, which instances ran under it;
 * from an instance, which gate it inherited.
 */
export function lineageOf(sel: ChainSelection | null, d: ChainData): Lit {
  const lit: Lit = {
    structure: new Set(),
    opportunity: new Set(),
    allocation: new Set(),
    instance: new Set(),
  }
  if (sel == null) return lit

  const allocsFor = (oppId: number) =>
    d.allocations.filter((a) => (a.strategy_opportunity_ids ?? []).includes(oppId))
  const instancesFor = (oppId: number) => d.instances.filter((i) => i.opportunityId === oppId)

  const addOpportunity = (oppId: number) => {
    lit.opportunity.add(oppId)
    const o = d.opportunities.find((x) => x.strategy_opportunity_id === oppId)
    if (o?.strategy_structure_id != null) lit.structure.add(o.strategy_structure_id)
    for (const a of allocsFor(oppId)) lit.allocation.add(a.strategy_allocation_id)
    for (const i of instancesFor(oppId)) lit.instance.add(i.id)
  }

  if (sel.kind === 'instance') {
    const i = d.instances.find((x) => x.id === sel.id)
    if (i == null) return lit
    lit.instance.add(i.id)
    lit.opportunity.add(i.opportunityId)
    const o = d.opportunities.find((x) => x.strategy_opportunity_id === i.opportunityId)
    const structureId = o?.strategy_structure_id ?? i.structureId
    if (structureId != null) lit.structure.add(structureId)
    for (const a of allocsFor(i.opportunityId)) lit.allocation.add(a.strategy_allocation_id)
    return lit
  }

  if (sel.kind === 'opportunity') {
    addOpportunity(sel.id)
    return lit
  }

  if (sel.kind === 'structure') {
    lit.structure.add(sel.id)
    for (const o of d.opportunities.filter((x) => x.strategy_structure_id === sel.id)) {
      addOpportunity(o.strategy_opportunity_id)
    }
    return lit
  }

  const a = d.allocations.find((x) => x.strategy_allocation_id === sel.id)
  if (a == null) return lit
  lit.allocation.add(a.strategy_allocation_id)
  for (const oid of a.strategy_opportunity_ids ?? []) addOpportunity(oid)
  return lit
}

function legCount(s: StrategyStructure): string {
  const n = s.legs?.length ?? 0
  return n === 0 ? 'no legs recorded' : `${n} leg${n === 1 ? '' : 's'}`
}

/** `explicit_symbols` → the symbols themselves; a watchlist scope names the list. */
function scopeOf(o: StrategyOpportunity): string {
  if (o.symbols?.length) return o.symbols.join(' · ')
  return o.scope_type ? o.scope_type.replace(/_/g, ' ') : 'no scope recorded'
}

/**
 * What the Show filter leaves visible.
 *
 * Every count on the page is taken from this, not from the whole table. A
 * structure that reads "9 opportunities" beside a column showing 7 is not a
 * subtlety the reader is supposed to resolve — the filter is the page's stated
 * scope, so it is the scope of the arithmetic too.
 */
export function visibleChain(d: ChainData, activeOnly: boolean): ChainData {
  if (!activeOnly) return d
  const opportunities = d.opportunities.filter((o) => o.is_active)
  const oppIds = new Set(opportunities.map((o) => o.strategy_opportunity_id))
  return {
    structures: d.structures.filter((s) => s.is_active),
    opportunities,
    allocations: d.allocations.filter((a) => a.is_active),
    gates: d.gates,
    instances: d.instances.filter((i) => !i.closed && oppIds.has(i.opportunityId)),
  }
}

/** `1 opportunity` · `9 opportunities` — a count the reader does not have to correct. */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Opportunities no allocation carries, within the given scope. */
export function orphanOpportunities(d: ChainData): number {
  const allocated = new Set(d.allocations.flatMap((a) => a.strategy_opportunity_ids ?? []))
  return d.opportunities.filter((o) => !allocated.has(o.strategy_opportunity_id)).length
}

/**
 * Two stores, two questions — kept apart on purpose.
 *
 * `strategy_allocation.is_active` says an allocation is **on the books**: it may
 * be picked, and a plan under an inactive one runs outside the rules. The
 * settings row the daemon loads (`POST /config/active-strategy`) says which one
 * it actually **runs** on its next start. They are written by different calls
 * and can disagree — two allocations can both be on the books while the daemon
 * is on one of them — so a card that printed "active · the daemon runs this"
 * from the row flag alone was attributing a daemon behaviour to a rulebook
 * field. It now says which is which.
 */
export interface DaemonPick {
  /** What the daemon's own config points at. Null when nothing is set. */
  allocationId: number | null
}

export function buildChain(
  full: ChainData,
  sel: ChainSelection | null,
  activeOnly: boolean,
  daemon?: DaemonPick,
): ChainColumn[] {
  const d = visibleChain(full, activeOnly)
  const lit = lineageOf(sel, d)
  const dim = (on: boolean) => sel != null && !on

  const oppsByStructure = new Map<number, number>()
  for (const o of d.opportunities) {
    if (o.strategy_structure_id == null) continue
    oppsByStructure.set(o.strategy_structure_id, (oppsByStructure.get(o.strategy_structure_id) ?? 0) + 1)
  }
  const allocatedOpps = new Set(d.allocations.flatMap((a) => a.strategy_opportunity_ids ?? []))

  const structures: ChainCard[] = d.structures
    .map((s) => ({
      kind: 'structure' as const,
      id: s.strategy_structure_id,
      title: s.name,
      sub: s.template_display_name ?? s.structure_type?.replace(/_/g, ' ') ?? 'no template linked',
      tag: s.is_active ? 'available' : 'off',
      tagVariant: s.is_active ? ('success' as const) : ('neutral' as const),
      facts: [
        legCount(s),
        s.dim_structure ?? 'no dimension',
        plural(oppsByStructure.get(s.strategy_structure_id) ?? 0, 'opportunity', 'opportunities'),
      ],
      lit: lit.structure.has(s.strategy_structure_id),
      selected: sel?.kind === 'structure' && sel.id === s.strategy_structure_id,
    }))

  const opportunities: ChainCard[] = d.opportunities.map((o) => {
      const inAllocation = allocatedOpps.has(o.strategy_opportunity_id)
      return {
        kind: 'opportunity' as const,
        id: o.strategy_opportunity_id,
        title: o.name,
        sub: scopeOf(o),
        // The reading that matters most on this column: an opportunity in no
        // allocation is one the daemon was never told to run.
        tag: inAllocation ? (o.is_active ? 'available' : 'off') : 'no allocation',
        tagVariant: inAllocation
          ? o.is_active
            ? ('success' as const)
            : ('neutral' as const)
          : ('warning' as const),
        facts: [
          o.structure_name ?? 'no structure',
          o.gate_safety_name ? `default gate ${o.gate_safety_name}` : 'no default gate',
        ],
      lit: lit.opportunity.has(o.strategy_opportunity_id),
      selected: sel?.kind === 'opportunity' && sel.id === o.strategy_opportunity_id,
    }
  })

  const allocations: ChainCard[] = d.allocations.map((a) => {
      const gate = d.gates.find((g) => g.gate_safety_strategy_id === a.gate_safety_strategy_id)
      const limits: string[] = []
      if (a.max_positions != null) limits.push(`max ${a.max_positions} positions`)
      if (a.max_bp_pct != null) limits.push(`${Math.round(a.max_bp_pct * 100)}% BP`)
      return {
        kind: 'allocation' as const,
        id: a.strategy_allocation_id,
        title: a.name,
        sub: gate
          ? `gate ${gate.name} · v${gate.version}${limits.length ? ` · ${limits.join(' · ')}` : ''}`
          : `no gate${limits.length ? ` · ${limits.join(' · ')}` : ''}`,
        tag: a.is_active ? 'on the books' : 'off the books',
        tagVariant: a.is_active ? ('success' as const) : ('neutral' as const),
        facts: [
          plural((a.strategy_opportunity_ids ?? []).length, 'opportunity', 'opportunities'),
          daemon?.allocationId === a.strategy_allocation_id
            ? 'the daemon runs this'
            : a.is_active
              ? 'on the books · not what the daemon runs'
              : 'plans under it run outside rules',
        ],
      lit: lit.allocation.has(a.strategy_allocation_id),
      selected: sel?.kind === 'allocation' && sel.id === a.strategy_allocation_id,
    }
  })

  const instances: ChainCard[] = d.instances.map((i) => ({
      kind: 'instance' as const,
      id: i.id,
      title: `${i.label} · ${i.symbolish}`,
      sub: `${i.opportunityName}${i.openedOn ? ` · opened ${i.openedOn}` : ''}`,
      tag: i.closed ? 'closed' : 'open',
      tagVariant: i.closed ? ('neutral' as const) : ('success' as const),
      facts: [
        plural(i.fills, 'fill'),
        i.closed ? 'flat by its own fills' : 'marked on Positions',
      ],
      lit: lit.instance.has(i.id),
      selected: sel?.kind === 'instance' && sel.id === i.id,
    }))

  const openN = d.instances.filter((i) => !i.closed).length
  const closedN = d.instances.length - openN

  return [
    { key: 'structure', step: 'shape', title: 'Structures', count: String(structures.length), cards: structures },
    { key: 'opportunity', step: 'when', title: 'Opportunities', count: String(opportunities.length), cards: opportunities },
    { key: 'allocation', step: 'run', title: 'Allocations · gates', count: String(allocations.length), cards: allocations },
    { key: 'instance', step: 'running', title: 'Instances', count: `${openN} open · ${closedN} closed`, cards: instances },
  ].map((c) => ({ ...c, cards: c.cards.map((k) => ({ ...k, lit: !dim(k.lit) })) })) as ChainColumn[]
}

export interface ChainFact {
  k: string
  v: string
  note: string
  tone?: 'success' | 'warning' | 'danger'
}

export interface ChainDetail {
  kind: ChainKind
  title: string
  lineage: string
  facts: ChainFact[]
  /** Instances under the selection, for the table beneath the facts. */
  rows: InstanceReading[]
}

/**
 * The record behind whatever was picked — the whole of it, not the filtered view.
 *
 * A structure is worth reading *because* of its closed history, so the detail
 * does not inherit the Show filter. It does have to say so: "9 opportunities
 * use it" three inches under a card reading "2 opportunities" is a
 * contradiction unless the second number is named. Where the two differ, both
 * are stated.
 */
export function detailOf(
  sel: ChainSelection | null,
  d: ChainData,
  visible?: ChainData,
  daemon?: DaemonPick,
): ChainDetail | null {
  if (sel == null) return null
  const v = visible ?? d
  /** `9 opportunities use it · 2 active` when the filter hides some. */
  const withActive = (all: number, active: number, one: string, many: string) =>
    all === active ? plural(all, one, many) : `${plural(all, one, many)} · ${active} active`

  if (sel.kind === 'structure') {
    const s = d.structures.find((x) => x.strategy_structure_id === sel.id)
    if (s == null) return null
    const opps = d.opportunities.filter((o) => o.strategy_structure_id === s.strategy_structure_id)
    const rows = d.instances.filter((i) => opps.some((o) => o.strategy_opportunity_id === i.opportunityId))
    return {
      kind: 'structure',
      title: s.name,
      lineage: withActive(
        opps.length,
        v.opportunities.filter((o) => o.strategy_structure_id === s.strategy_structure_id).length,
        'opportunity uses it',
        'opportunities use it',
      ),
      facts: [
        { k: 'Legs', v: String(s.legs?.length ?? 0), note: s.structure_type?.replace(/_/g, ' ') ?? 'no type' },
        { k: 'Template', v: s.template_display_name ?? '—', note: 'the Option Category catalog — a field on the structure, not a page' },
        { k: 'Dimensions', v: [s.dim_direction, s.dim_structure, s.dim_coverage].filter(Boolean).join(' · ') || '—', note: 'direction · structure · coverage, from the template' },
        { k: 'Version', v: `v${s.version}`, note: s.is_active ? 'available to new opportunities' : 'inactive — existing opportunities keep it' },
      ],
      rows,
    }
  }

  if (sel.kind === 'opportunity') {
    const o = d.opportunities.find((x) => x.strategy_opportunity_id === sel.id)
    if (o == null) return null
    const allocs = d.allocations.filter((a) => (a.strategy_opportunity_ids ?? []).includes(o.strategy_opportunity_id))
    const rows = d.instances.filter((i) => i.opportunityId === o.strategy_opportunity_id)
    const closed = rows.filter((i) => i.closed)
    const realised = closed.reduce((a, i) => a + (i.realised ?? 0), 0)
    return {
      kind: 'opportunity',
      title: o.name,
      lineage:
        allocs.length > 0
          ? `${o.structure_name ?? 'no structure'} · in ${allocs.map((a) => a.name).join(', ')}`
          : `${o.structure_name ?? 'no structure'} · in no allocation`,
      facts: [
        { k: 'Scope', v: scopeOf(o), note: 'the symbols the daemon may act on' },
        allocs.length > 0
          ? { k: 'Allocation', v: allocs.map((a) => a.name).join(', '), note: 'the gate it inherits comes from here' }
          : {
              k: 'Allocation',
              v: 'none',
              note: 'nothing tells the daemon to run this, and an instance under it inherits no gate',
              tone: 'warning' as const,
            },
        {
          k: 'Instances',
          v: String(rows.length),
          note: `${rows.length - closed.length} open · ${closed.length} closed · every one of them, whatever the filter shows`,
        },
        {
          k: 'Realised',
          v: closed.length === 0 ? '—' : String(Math.round(realised)),
          note: closed.length === 0 ? 'no closed instance yet' : 'closed instances only, fills-based',
          tone: closed.length === 0 ? undefined : realised >= 0 ? ('success' as const) : ('danger' as const),
        },
      ],
      rows,
    }
  }

  if (sel.kind === 'allocation') {
    const a = d.allocations.find((x) => x.strategy_allocation_id === sel.id)
    if (a == null) return null
    const gate = d.gates.find((g) => g.gate_safety_strategy_id === a.gate_safety_strategy_id)
    const oppIds = a.strategy_opportunity_ids ?? []
    const rows = d.instances.filter((i) => oppIds.includes(i.opportunityId))
    return {
      kind: 'allocation',
      title: a.name,
      lineage: oppIds
        .map((id) => d.opportunities.find((o) => o.strategy_opportunity_id === id)?.name ?? `#${id}`)
        .join(' · '),
      facts: [
        {
          k: 'On the books',
          v: a.is_active ? 'active' : 'inactive',
          note: a.is_active
            ? 'it may be picked — this is the rulebook flag, not what the daemon is on'
            : 'plans under it run outside rules',
          tone: a.is_active ? ('success' as const) : ('warning' as const),
        },
        {
          k: 'The daemon runs',
          // "another" would claim a different allocation exists; when nothing
          // is set, nothing is set.
          v:
            daemon?.allocationId == null
              ? 'nothing'
              : daemon.allocationId === a.strategy_allocation_id
                ? 'this one'
                : 'another',
          note:
            daemon?.allocationId == null
              ? 'nothing is set — the daemon has no allocation to load on its next start'
              : daemon.allocationId === a.strategy_allocation_id
                ? 'its config points here, and it loads that on its next start'
                : `its config points at #${daemon.allocationId} — Set active writes this one there`,
          tone:
            daemon?.allocationId === a.strategy_allocation_id ? ('success' as const) : ('warning' as const),
        },
        {
          k: 'Gate',
          v: gate ? `${gate.name} · v${gate.version}` : '—',
          note: gate
            ? 'a limit set whose scope is this allocation — its hits land on Risk › Limits'
            : 'no gate, so nothing bounds what runs under it',
          tone: gate ? undefined : ('warning' as const),
        },
        { k: 'Max positions', v: a.max_positions == null ? '—' : String(a.max_positions), note: 'what bounds the Instances column' },
        { k: 'Max BP', v: a.max_bp_pct == null ? '—' : `${Math.round(a.max_bp_pct * 100)}%`, note: 'share of buying power this allocation may use' },
        { k: 'Opportunities', v: String(oppIds.length), note: 'each with its own conditions' },
        {
          k: 'Instances',
          v: String(rows.length),
          note: `${rows.filter((i) => !i.closed).length} open · every one of them, whatever the filter shows`,
        },
      ],
      rows,
    }
  }

  const i = d.instances.find((x) => x.id === sel.id)
  if (i == null) return null
  const o = d.opportunities.find((x) => x.strategy_opportunity_id === i.opportunityId)
  const allocs = d.allocations.filter((a) => (a.strategy_opportunity_ids ?? []).includes(i.opportunityId))
  const gate = allocs
    .map((a) => d.gates.find((g) => g.gate_safety_strategy_id === a.gate_safety_strategy_id))
    .find(Boolean)
  return {
    kind: 'instance',
    title: `${i.label} · ${i.symbolish}`,
    lineage: `${i.structureName} → ${i.opportunityName} → ${allocs.length ? allocs.map((a) => a.name).join(', ') : 'no allocation'}`,
    facts: [
      {
        k: 'Realised',
        v: i.realised == null ? 'open' : String(Math.round(i.realised)),
        note: i.realised == null ? 'still open — its legs are marked on Positions' : 'flat by its own fills, fees included',
        tone: i.realised == null ? undefined : i.realised >= 0 ? ('success' as const) : ('danger' as const),
      },
      { k: 'Opened', v: i.openedOn ?? '—', note: `${i.fills} fill${i.fills === 1 ? '' : 's'} linked` },
      { k: 'Structure', v: i.structureName, note: o?.structure_name === i.structureName ? 'as the opportunity specifies' : 'recorded on the instance' },
      {
        k: 'Gate',
        v: gate ? gate.name : '—',
        note: gate ? `inherited from ${allocs[0]?.name}` : 'ran outside rules — no allocation carries this opportunity',
        tone: gate ? undefined : ('warning' as const),
      },
    ],
    rows: [],
  }
}
