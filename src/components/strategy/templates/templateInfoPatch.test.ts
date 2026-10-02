/**
 * The template editor's Info save (api 0.3.0 PATCH): a blank text is refused by
 * the server, so an emptied box is sent as null. Values are invented.
 */
import { describe, expect, it } from 'vitest'
import type { StrategyTemplateDetail } from '@/types/positions'
import { normalTemplateCode, templateInfoPatch } from './templateInfoPatch'

const DETAIL: StrategyTemplateDetail = {
  strategy_template_id: 4,
  template_code: 'covered_call',
  display_name: 'Covered call',
  dim_direction: 'neutral',
  dim_structure: '',
  dim_coverage: null,
  dim_risk: null,
  dim_volatility: null,
  dim_time: null,
  explanation: '',
  typical_use: '   ',
  example: 'Own 100, sell one call',
  nature: null,
  sort_order: 3,
  is_active: true,
  legs: [],
  meta_params: [],
  characteristics: [],
}

describe('templateInfoPatch', () => {
  it('sends null for every emptied text, never ""', () => {
    const body = templateInfoPatch(DETAIL, 'covered_call')
    expect(body).toMatchObject({
      explanation: null,
      typical_use: null,
      nature: null,
      dim_structure: null,
      example: 'Own 100, sell one call',
      dim_direction: 'neutral',
    })
    expect(Object.values(body).some((v) => typeof v === 'string' && v.trim() === '')).toBe(false)
  })

  it('keeps the required fields as they are — a blank name is the server’s to refuse', () => {
    const body = templateInfoPatch({ ...DETAIL, display_name: '' }, 'covered_call')
    expect(body).toMatchObject({ template_code: 'covered_call', display_name: '', sort_order: 3, is_active: true })
  })
})

describe('normalTemplateCode', () => {
  it('lower-snakes a code and refuses one the server would', () => {
    expect(normalTemplateCode(' Covered Call ')).toBe('covered_call')
    expect(normalTemplateCode('9lives')).toBeNull()
    expect(normalTemplateCode('  ')).toBeNull()
  })
})
