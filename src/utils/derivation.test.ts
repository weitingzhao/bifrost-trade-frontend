import { describe, it, expect } from 'vitest'
import { derivationFields, derivationRows, feedsOf, formulaInputs, formulaTokens, type Derivation } from './derivation'

const d: Derivation = {
  title: 't',
  intro: '',
  roots: ['A', 'D'],
  variables: {
    A: { name: 'A', source: 'page', value: '1', meaning: '', formula: '1 − {B}' },
    B: { name: 'B', source: 'broker', value: '2', meaning: '', formula: '{X} ÷ {Y}' },
    D: { name: 'D', source: 'broker', value: '4', meaning: '', formula: '{E} × 4' },
    E: { name: 'E', source: 'broker', value: '5', meaning: '', formula: '{X} − {Z}' },
    X: { name: 'X', source: 'broker', value: 'x', meaning: '' },
    Y: { name: 'Y', source: 'broker', value: 'y', meaning: '' },
    Z: { name: 'Z', source: 'broker', value: 'z', meaning: '' },
  },
}

describe('formula parsing', () => {
  it('splits a formula into text and the variables it names', () => {
    expect(formulaTokens('1 − {Cushion}')).toEqual([
      { kind: 'text', text: '1 − ' },
      { kind: 'var', name: 'Cushion' },
    ])
    expect(formulaInputs('{ExcessLiquidity} ÷ {NetLiquidation}')).toEqual(['ExcessLiquidity', 'NetLiquidation'])
    expect(formulaInputs(undefined)).toEqual([])
    // Parsing twice in a row must not be tripped up by the regex's own state.
    expect(formulaInputs('{A} × 4')).toEqual(['A'])
    expect(formulaInputs('{A} × 4')).toEqual(['A'])
  })
})

describe('derivation walks', () => {
  it('lists computed variables as a tree, each once, and leaves as the fields line in first-use order', () => {
    expect(derivationRows(d)).toEqual([
      { name: 'A', depth: 0 },
      { name: 'B', depth: 1 },
      { name: 'D', depth: 0 },
      { name: 'E', depth: 1 },
    ])
    expect(derivationFields(d)).toEqual(['X', 'Y', 'Z'])
  })
  it('says where a figure goes next', () => {
    expect(feedsOf(d, 'X')).toEqual(['B', 'E'])
    expect(feedsOf(d, 'A')).toEqual([])
  })
})
