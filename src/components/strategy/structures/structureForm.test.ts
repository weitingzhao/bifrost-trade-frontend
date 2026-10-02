import { describe, expect, it } from 'vitest'
import type { MetaParamItem, StrategyStructure, StrategyTemplateDetail } from '@/types/strategy'
import {
  buildStructureMeta,
  legLine,
  metaEntriesEqual,
  structureEditPayload,
  structureFormToPayload,
  structureToForm,
  templateMatchesSearch,
  templateParamDefaults,
  withParam,
  withTemplate,
} from './structureForm'

// Invented fixtures — not copied from any environment.
const param = (meta_key: string, param_kind: string, default_value_text: string | null): MetaParamItem => ({
  meta_key,
  display_label: meta_key,
  default_value_text,
  param_kind,
  sort_order: 0,
})

const PARAMS: MetaParamItem[] = [param('otm_pct', 'percent', '5'), param('right', 'fixed', 'P')]

const ROW: StrategyStructure = {
  strategy_structure_id: 7,
  name: 'Sample shape',
  structure_type: 'covered_call',
  structure_subtype: 'otm',
  structure_subtype_label: null,
  strategy_template_id: 3,
  template_code: 'covered_call',
  template_display_name: 'Covered call',
  dim_direction: null,
  dim_structure: null,
  dim_coverage: null,
  dim_risk: null,
  dim_volatility: null,
  dim_time: null,
  version: 4,
  is_active: false,
  created_at: null,
  updated_at: null,
  notes: 'keep me',
  legs: [{ role: 'short_call', direction: 'sell', option_right: 'C', quantity: 1, strike: null, expiration: null }],
  metadata: { otm_pct: '8', right: 'P', extra_key: 'x' },
}

const TEMPLATE: StrategyTemplateDetail = {
  strategy_template_id: 9,
  template_code: 'bull_put_spread',
  display_name: 'Bull put spread',
  dim_direction: 'bullish',
  dim_structure: 'two-leg',
  dim_coverage: null,
  dim_risk: 'defined',
  dim_volatility: null,
  dim_time: null,
  explanation: 'Sell a put, buy a lower one.',
  typical_use: null,
  example: null,
  nature: null,
  sort_order: 1,
  is_active: true,
  legs: [
    { role: 'short_put', direction: 'sell', option_right: 'P', quantity: 1, strike: null, expiration: null },
    { role: 'long_put', direction: 'buy', option_right: 'P', quantity: 1, strike: null, expiration: null },
  ],
  meta_params: [param('width', 'number', '5'), param('kind', 'fixed', 'credit')],
  characteristics: [],
}

describe('structureToForm → structureFormToPayload', () => {
  it('writes back everything that was not edited', () => {
    const form = structureToForm(ROW, { meta_params: PARAMS })
    const payload = structureFormToPayload(form)
    expect(payload).toEqual({
      name: 'Sample shape',
      strategy_template_id: 3,
      structure_type: 'covered_call',
      structure_subtype: 'otm',
      legs: ROW.legs,
      version: 4,
      is_active: false,
      notes: 'keep me',
      meta: expect.arrayContaining([
        { meta_key: 'otm_pct', meta_value_text: '8' },
        { meta_key: 'right', meta_value_text: 'P' },
        { meta_key: 'extra_key', meta_value_text: 'x' },
      ]),
    })
    expect(payload.meta).toHaveLength(3)
  })

  it('a name edit changes the name and nothing else', () => {
    const form = structureToForm(ROW, null)
    const before = structureFormToPayload(form)
    const after = structureFormToPayload({ ...form, name: '  Renamed  ' })
    expect(after).toEqual({ ...before, name: 'Renamed' })
  })

  it('seeds editable params from the saved meta when the template loaded', () => {
    expect(structureToForm(ROW, { meta_params: PARAMS }).paramValues).toEqual({ otm_pct: 8 })
    expect(structureToForm(ROW, null).paramValues).toEqual({})
  })
})

describe('withTemplate', () => {
  it('links the template as the sheet does: its code, its legs, defaults, subtype cleared', () => {
    const form = withTemplate(structureToForm(ROW, { meta_params: PARAMS }), TEMPLATE)
    const p = structureFormToPayload(form)
    expect(p.strategy_template_id).toBe(9)
    expect(p.structure_type).toBe('bull_put_spread')
    expect(p.structure_subtype).toBeNull()
    expect(p.legs).toEqual(TEMPLATE.legs)
    expect(p.meta).toEqual([
      { meta_key: 'width', meta_value_text: '5' },
      { meta_key: 'kind', meta_value_text: 'credit' },
    ])
    // Not touched by a template change.
    expect(p.name).toBe('Sample shape')
    expect(p.version).toBe(4)
    expect(p.is_active).toBe(false)
    expect(p.notes).toBe('keep me')
  })

  it('a template without params keeps the structure’s meta', () => {
    const bare = { ...TEMPLATE, meta_params: [] }
    const form = structureToForm(ROW, null)
    expect(withTemplate(form, bare).meta).toEqual(form.meta)
  })
})

describe('withParam', () => {
  it('rebuilds the meta from the template params', () => {
    const form = withParam(structureToForm(ROW, { meta_params: PARAMS }), 'otm_pct', 12)
    expect(form.meta).toEqual([
      { meta_key: 'otm_pct', meta_value_text: '12' },
      { meta_key: 'right', meta_value_text: 'P' },
    ])
  })
})

describe('helpers lifted from the sheet', () => {
  it('buildStructureMeta drops blank editable values and falls back without params', () => {
    expect(buildStructureMeta(PARAMS, { otm_pct: '' }, [])).toEqual([{ meta_key: 'right', meta_value_text: 'P' }])
    const saved = [{ meta_key: 'a', meta_value_text: '1' }]
    const out = buildStructureMeta(undefined, {}, saved)
    expect(out).toEqual(saved)
    expect(out).not.toBe(saved)
  })

  it('templateParamDefaults takes non-fixed defaults only', () => {
    expect(templateParamDefaults(PARAMS)).toEqual({ otm_pct: '5' })
    expect(templateParamDefaults(undefined)).toEqual({})
  })

  it('metaEntriesEqual ignores order and blank keys', () => {
    expect(
      metaEntriesEqual(
        [
          { meta_key: 'b', meta_value_text: '2' },
          { meta_key: 'a', meta_value_text: '1' },
        ],
        [
          { meta_key: 'a', meta_value_text: '1' },
          { meta_key: '', meta_value_text: 'x' },
          { meta_key: 'b', meta_value_text: '2' },
        ],
      ),
    ).toBe(true)
  })

  it('structureEditPayload trims and omits empty notes / meta', () => {
    const p = structureEditPayload({
      name: ' n ',
      strategyTemplateId: 1,
      structureType: 'x',
      structureSubtype: null,
      legs: [],
      version: undefined,
      isActive: undefined,
      notes: '  ',
      meta: [],
    })
    expect(p).toEqual({
      name: 'n',
      strategy_template_id: 1,
      structure_type: 'x',
      structure_subtype: null,
      legs: [],
      version: 1,
      is_active: true,
      notes: undefined,
      meta: undefined,
    })
  })

  it('templateMatchesSearch looks at name, code and description', () => {
    expect(templateMatchesSearch(TEMPLATE, 'PUT spr')).toBe(true)
    expect(templateMatchesSearch(TEMPLATE, 'bull_put')).toBe(true)
    expect(templateMatchesSearch(TEMPLATE, 'lower one')).toBe(true)
    expect(templateMatchesSearch(TEMPLATE, 'calendar')).toBe(false)
    expect(templateMatchesSearch(TEMPLATE, '  ')).toBe(true)
  })

  it('legLine reads as one mono line', () => {
    expect(legLine(TEMPLATE.legs[0])).toBe('SELL 1 P · short_put')
    expect(legLine({ role: null, direction: 'buy', option_right: 'C', quantity: 2, strike: 450, expiration: '2026-11-20' })).toBe(
      'BUY 2 C · 450 · 2026-11-20',
    )
  })
})
