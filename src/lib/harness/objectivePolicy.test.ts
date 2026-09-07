import { describe, expect, it } from 'vitest'
import {
  POLICY_SECTIONS,
  OWNER_POLICY_KEYS,
  buildSuggestion,
  describeEdits,
  effectiveValue,
  getPath,
  parseFieldInput,
  setPath,
} from './objectivePolicy'

const field = (path: string) => {
  const f = POLICY_SECTIONS.flatMap((s) => s.fields).find((x) => x.path === path)
  if (!f) throw new Error(`no field ${path}`)
  return f
}

describe('objectivePolicy', () => {
  it('every field lives under an Owner-editable top-level key', () => {
    for (const f of POLICY_SECTIONS.flatMap((s) => s.fields)) {
      expect(OWNER_POLICY_KEYS).toContain(f.path.split('.')[0])
    }
  })

  it('field paths are unique', () => {
    const paths = POLICY_SECTIONS.flatMap((s) => s.fields.map((f) => f.path))
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('getPath / setPath build nested objects without touching siblings', () => {
    const p = { layers: { sepa: { min_score: 70, required: true } } }
    expect(getPath(p, 'layers.sepa.min_score')).toBe(70)
    expect(getPath(p, 'layers.momentum.min_score')).toBeUndefined()
    const next = setPath(p, 'layers.sepa.min_score', 80)
    expect(next.layers).toEqual({ sepa: { min_score: 80, required: true } })
    expect(p.layers.sepa.min_score).toBe(70)
  })

  it('effectiveValue falls back to the schema default', () => {
    expect(effectiveValue({}, field('max_candidates'))).toBe(3)
    expect(effectiveValue({ max_candidates: 8 }, field('max_candidates'))).toBe(8)
    expect(effectiveValue({}, field('flag_filter'))).toBeUndefined()
  })

  it('parses numbers within range and refuses fractions on integer knobs', () => {
    expect(parseFieldInput(field('max_candidates'), '8')).toEqual({ ok: true, value: 8 })
    expect(parseFieldInput(field('max_candidates'), '80').ok).toBe(false)
    expect(parseFieldInput(field('max_candidates'), '2.5').ok).toBe(false)
    expect(parseFieldInput(field('min_source_hit_rate'), '0.6')).toEqual({ ok: true, value: 0.6 })
    expect(parseFieldInput(field('min_composite_score'), '')).toEqual({ ok: true, value: null })
  })

  it('parses symbols and stages upper-cased', () => {
    expect(parseFieldInput(field('seed_symbols'), 'nvda, amd')).toEqual({ ok: true, value: ['NVDA', 'AMD'] })
    expect(parseFieldInput(field('layers.sepa.stage'), 'setup pivot')).toEqual({
      ok: true,
      value: ['SETUP', 'PIVOT'],
    })
    expect(parseFieldInput(field('layers.sepa.stage'), '').ok).toBe(false)
  })

  it('buildSuggestion sends only the changed sub-keys of a nested object', () => {
    expect(buildSuggestion({ 'triage.deep_judge_top_n': 5, max_candidates: 8 })).toEqual({
      triage: { deep_judge_top_n: 5 },
      max_candidates: 8,
    })
  })

  it('buildSuggestion refuses a key outside the Owner whitelist', () => {
    expect(() => buildSuggestion({ auto_validate: true })).toThrow(/auto_validate/)
  })

  it('describeEdits reads before → after in the field vocabulary', () => {
    const text = describeEdits({ max_candidates: 3 }, { max_candidates: 8, 'triage.enabled': false })
    expect(text).toBe('max_candidates 3 → 8 · triage.enabled not set → off')
  })
})
