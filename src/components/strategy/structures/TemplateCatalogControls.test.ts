import { describe, expect, it } from 'vitest'
import { CATALOG_DIM_TYPES, toTemplateCode } from './TemplateCatalogControls'

describe('toTemplateCode', () => {
  it('turns what a reader types into the code the server keys templates by', () => {
    expect(toTemplateCode('Bull Put Spread')).toBe('bull_put_spread')
  })

  it('drops punctuation rather than sending a code the server will reject', () => {
    expect(toTemplateCode('  Covered Call (10% OTM) ')).toBe('covered_call_10_otm')
  })

  it('leaves an already-valid code alone, so the hint stays quiet', () => {
    expect(toTemplateCode('iron_condor')).toBe('iron_condor')
  })

  it('has nothing to offer for a name made only of punctuation', () => {
    expect(toTemplateCode('!!!')).toBe('')
  })
})

describe('the catalog dictionary', () => {
  it('lists the six dim_type enums a template picks from, in the order every surface uses', () => {
    expect([...CATALOG_DIM_TYPES]).toEqual(['direction', 'structure', 'coverage', 'risk', 'volatility', 'time'])
  })
})
