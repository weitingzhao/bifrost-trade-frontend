import { describe, expect, it } from 'vitest'
import {
  buildChain,
  detailOf,
  lineageOf,
  orphanOpportunities,
  plural,
  readInstances,
  visibleChain,
  type ChainData,
} from './rulesChain'
import type { Execution } from '@/types/positions'
import type {
  GateSafetyItem,
  StrategyAllocation,
  StrategyInstance,
  StrategyOpportunity,
  StrategyStructure,
} from '@/types/strategy'

function structure(p: Partial<StrategyStructure> & { strategy_structure_id: number }): StrategyStructure {
  return {
    name: `S${p.strategy_structure_id}`,
    structure_type: 'single_leg',
    structure_subtype: null,
    structure_subtype_label: null,
    strategy_template_id: null,
    template_code: null,
    template_display_name: 'Cash Secured Put',
    dim_direction: 'bullish',
    dim_structure: 'single',
    dim_coverage: 'cash',
    dim_risk: null,
    dim_volatility: null,
    dim_time: null,
    version: 1,
    is_active: true,
    created_at: null,
    updated_at: null,
    notes: null,
    legs: [],
    ...p,
  }
}

function opportunity(
  p: Partial<StrategyOpportunity> & { strategy_opportunity_id: number },
): StrategyOpportunity {
  return {
    name: `O${p.strategy_opportunity_id}`,
    strategy_structure_id: 1,
    default_gate_safety_strategy_id: 1,
    scope_type: 'explicit_symbols',
    is_active: true,
    created_at: null,
    updated_at: null,
    structure_name: 'S1',
    gate_safety_name: 'Security Gate',
    symbols: ['NVDA'],
    ...p,
  }
}

const ALLOC: StrategyAllocation = {
  strategy_allocation_id: 1,
  name: 'Test Portfolio 1',
  strategy_opportunity_ids: [1],
  gate_safety_strategy_id: 1,
  gate_safety_name: 'Security Gate',
  max_positions: 10,
  max_bp_pct: 0.5,
  is_active: true,
  created_at: null,
  updated_at: null,
}

const GATE: GateSafetyItem = {
  gate_safety_strategy_id: 1,
  name: 'Security Gate',
  version: 2,
  is_active: true,
}

function instance(p: Partial<StrategyInstance> & { strategy_instance_id: number }): StrategyInstance {
  return {
    strategy_opportunity_id: 1,
    account_id: 'U1',
    label: null,
    notes: null,
    opened_at: '2026-08-03T12:00:00Z',
    opened_at_epoch: null,
    created_at: null,
    created_at_epoch: null,
    updated_at: null,
    strategy_opportunity_name: 'O1',
    strategy_structure_id: 1,
    strategy_structure_name: 'S1',
    executions_count: 0,
    ...p,
  }
}

function fill(p: {
  instance: number
  side: 'BUY' | 'SELL'
  qty: number
  price: number
  key?: string
}): Execution {
  return {
    account_executions_id: null,
    account_id: 'U1',
    contract_key: p.key ?? 'NVDA  261218C00090000|OPT|20261218|90|C',
    symbol: 'NVDA  261218C00090000',
    sec_type: 'OPT',
    side: p.side,
    quantity: p.qty,
    price: p.price,
    commission: 0,
    strategy_instance_id: p.instance,
    trade_date: '2026-08-03',
    time: 1,
  } as unknown as Execution
}

describe('readInstances', () => {
  it('closes an instance when every contract it touched is flat by its own fills', () => {
    const [closed, open] = readInstances(
      [instance({ strategy_instance_id: 1 }), instance({ strategy_instance_id: 2 })],
      [
        fill({ instance: 1, side: 'SELL', qty: 1, price: 10 }),
        fill({ instance: 1, side: 'BUY', qty: 1, price: 3 }),
        fill({ instance: 2, side: 'SELL', qty: 1, price: 10 }),
      ],
    )
    expect(closed.closed).toBe(true)
    expect(open.closed).toBe(false)
  })

  it('gives a realised figure only once the instance is flat', () => {
    const [closed, open] = readInstances(
      [instance({ strategy_instance_id: 1 }), instance({ strategy_instance_id: 2 })],
      [
        fill({ instance: 1, side: 'SELL', qty: 1, price: 10 }),
        fill({ instance: 1, side: 'BUY', qty: 1, price: 3 }),
        fill({ instance: 2, side: 'SELL', qty: 1, price: 10 }),
      ],
    )
    expect(closed.realised).toBeCloseTo(700, 6)
    // Not 1000: an open instance's legs need a mark, and a partial figure under
    // "realised" is the one number a reader would act on wrongly.
    expect(open.realised).toBeNull()
  })

  it('does not call an instance with no fill at all closed', () => {
    const [none] = readInstances([instance({ strategy_instance_id: 9 })], [])
    expect(none.closed).toBe(false)
    expect(none.realised).toBeNull()
    expect(none.fills).toBe(0)
  })

  it('names an instance by its label, and falls back to its id', () => {
    const [labelled, bare] = readInstances(
      [instance({ strategy_instance_id: 1, label: 'Wheel · NVDA' }), instance({ strategy_instance_id: 2 })],
      [],
    )
    expect(labelled.label).toBe('Wheel · NVDA')
    expect(bare.label).toBe('#2')
  })
})

const DATA: ChainData = {
  structures: [structure({ strategy_structure_id: 1 }), structure({ strategy_structure_id: 2, is_active: false })],
  opportunities: [
    opportunity({ strategy_opportunity_id: 1 }),
    opportunity({ strategy_opportunity_id: 2 }),
    opportunity({ strategy_opportunity_id: 3, strategy_structure_id: 2, is_active: false }),
  ],
  allocations: [ALLOC],
  gates: [GATE],
  instances: readInstances(
    [
      instance({ strategy_instance_id: 10, strategy_opportunity_id: 1 }),
      instance({ strategy_instance_id: 11, strategy_opportunity_id: 2 }),
    ],
    [
      fill({ instance: 10, side: 'SELL', qty: 1, price: 10 }),
      fill({ instance: 10, side: 'BUY', qty: 1, price: 3 }),
      fill({ instance: 11, side: 'SELL', qty: 1, price: 10 }),
    ],
  ),
}

describe('lineageOf', () => {
  it('lights nothing when nothing is picked', () => {
    const lit = lineageOf(null, DATA)
    expect(lit.structure.size + lit.opportunity.size + lit.allocation.size + lit.instance.size).toBe(0)
  })

  it('walks up from an instance to its gate-bearing allocation', () => {
    const lit = lineageOf({ kind: 'instance', id: 10 }, DATA)
    expect([...lit.instance]).toEqual([10])
    expect([...lit.opportunity]).toEqual([1])
    expect([...lit.structure]).toEqual([1])
    expect([...lit.allocation]).toEqual([1])
  })

  it('walks down from a structure to every instance under it', () => {
    const lit = lineageOf({ kind: 'structure', id: 1 }, DATA)
    expect([...lit.opportunity].sort()).toEqual([1, 2])
    expect([...lit.instance].sort()).toEqual([10, 11])
  })

  it('leaves the allocation dark for an opportunity no allocation carries', () => {
    const lit = lineageOf({ kind: 'opportunity', id: 2 }, DATA)
    expect([...lit.opportunity]).toEqual([2])
    expect(lit.allocation.size).toBe(0)
  })
})

describe('buildChain', () => {
  it('draws the four columns in the design’s order', () => {
    expect(buildChain(DATA, null, false).map((c) => c.key)).toEqual([
      'structure',
      'opportunity',
      'allocation',
      'instance',
    ])
  })

  it('counts instances as open and closed rather than as a total', () => {
    expect(buildChain(DATA, null, false)[3].count).toBe('1 open · 1 closed')
  })

  it('flags an opportunity that no allocation carries', () => {
    const cards = buildChain(DATA, null, false)[1].cards
    expect(cards.find((c) => c.id === 1)!.tag).toBe('available')
    expect(cards.find((c) => c.id === 2)!.tag).toBe('no allocation')
    expect(cards.find((c) => c.id === 2)!.tagVariant).toBe('warning')
  })

  it('dims everything outside the lineage, and nothing when nothing is picked', () => {
    expect(buildChain(DATA, null, false).every((c) => c.cards.every((k) => k.lit))).toBe(true)
    const picked = buildChain(DATA, { kind: 'opportunity', id: 2 }, false)
    expect(picked[1].cards.find((c) => c.id === 1)!.lit).toBe(false)
    expect(picked[1].cards.find((c) => c.id === 2)!.lit).toBe(true)
  })

  it('takes every count from what the filter leaves visible', () => {
    // Active hides the inactive structure and the inactive opportunity, so the
    // structure that keeps one must not still claim the hidden one.
    const all = buildChain(DATA, null, false)
    const active = buildChain(DATA, null, true)
    expect(all[0].cards).toHaveLength(2)
    expect(active[0].cards).toHaveLength(1)
    expect(active[0].cards[0].facts).toContain('2 opportunities')
    expect(active[3].count).toBe('1 open · 0 closed')
  })
})

describe('detailOf', () => {
  it('keeps the whole record, and names the active count where the filter differs', () => {
    const visible = visibleChain(DATA, true)
    const all = detailOf({ kind: 'structure', id: 1 }, DATA)!
    const filtered = detailOf({ kind: 'structure', id: 1 }, DATA, visible)!
    // Structure 1 is used by opportunities 1 and 2, both active, so the two
    // numbers agree and only one is printed.
    expect(all.lineage).toBe('2 opportunities use it')
    expect(filtered.lineage).toBe('2 opportunities use it')

    const half: ChainData = {
      ...DATA,
      opportunities: DATA.opportunities.map((o) =>
        o.strategy_opportunity_id === 2 ? { ...o, is_active: false } : o,
      ),
    }
    expect(detailOf({ kind: 'structure', id: 1 }, half, visibleChain(half, true))!.lineage).toBe(
      '2 opportunities use it · 1 active',
    )
  })

  it('says an opportunity is in no allocation rather than leaving the row blank', () => {
    const d = detailOf({ kind: 'opportunity', id: 2 }, DATA)!
    expect(d.lineage).toContain('in no allocation')
    const alloc = d.facts.find((f) => f.k === 'Allocation')!
    expect(alloc.v).toBe('none')
    expect(alloc.tone).toBe('warning')
  })

  it('says an instance ran outside rules when its opportunity has no allocation', () => {
    const inside = detailOf({ kind: 'instance', id: 10 }, DATA)!
    const outside = detailOf({ kind: 'instance', id: 11 }, DATA)!
    expect(inside.facts.find((f) => f.k === 'Gate')!.v).toBe('Security Gate')
    expect(outside.facts.find((f) => f.k === 'Gate')!.note).toContain('ran outside rules')
  })

  it('reports an open instance as open rather than as a realised figure', () => {
    expect(detailOf({ kind: 'instance', id: 11 }, DATA)!.facts.find((f) => f.k === 'Realised')!.v).toBe('open')
    expect(detailOf({ kind: 'instance', id: 10 }, DATA)!.facts.find((f) => f.k === 'Realised')!.v).toBe('700')
  })

  it('sums realised over an opportunity’s closed instances only', () => {
    const d = detailOf({ kind: 'opportunity', id: 1 }, DATA)!
    expect(d.facts.find((f) => f.k === 'Realised')!.v).toBe('700')
    expect(d.rows.map((r) => r.id)).toEqual([10])
  })

  it('is null when nothing is picked', () => {
    expect(detailOf(null, DATA)).toBeNull()
  })
})

describe('visibleChain and its counts', () => {
  it('counts orphan opportunities inside the scope it was given', () => {
    expect(orphanOpportunities(DATA)).toBe(2)
    expect(orphanOpportunities(visibleChain(DATA, true))).toBe(1)
  })

  it('drops an instance whose opportunity the filter hid', () => {
    const hidden: ChainData = {
      ...DATA,
      opportunities: DATA.opportunities.map((o) =>
        o.strategy_opportunity_id === 2 ? { ...o, is_active: false } : o,
      ),
    }
    expect(visibleChain(hidden, true).instances.map((i) => i.id)).toEqual([])
  })
})

describe('plural', () => {
  it('does not leave the reader to correct the count', () => {
    expect(plural(1, 'opportunity', 'opportunities')).toBe('1 opportunity')
    expect(plural(9, 'opportunity', 'opportunities')).toBe('9 opportunities')
    expect(plural(1, 'fill')).toBe('1 fill')
    expect(plural(0, 'fill')).toBe('0 fills')
  })
})
