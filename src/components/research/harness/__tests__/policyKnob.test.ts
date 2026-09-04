import { describe, expect, it } from 'vitest'
import { parsePolicyInput } from '@/components/research/harness/PolicyKnobEditor'
import {
  EDITABLE_POLICY_FIELDS,
  isEditablePolicyField,
} from '@/api/research/harness'
import { PIPELINE_STAGES } from '@/lib/harness/harnessTrace'

/**
 * A knob that silently sends the wrong type reads as a broken editor: the value
 * passes the whitelist, fails schema validation at the API, and the reader is
 * told nothing useful. The parse is where that is decided.
 */
describe('parsePolicyInput', () => {
  it('keeps a number a number', () => {
    // "12" as a string passes the whitelist and then fails LoopPolicy.
    expect(parsePolicyInput('12', 8)).toEqual({ ok: true, value: 12 })
  })

  it('refuses a number field that was given words', () => {
    const out = parsePolicyInput('twelve', 8)
    expect(out.ok).toBe(false)
  })

  it('keeps a boolean a boolean, either case', () => {
    expect(parsePolicyInput('false', true)).toEqual({ ok: true, value: false })
    expect(parsePolicyInput('TRUE', false)).toEqual({ ok: true, value: true })
  })

  it('refuses a boolean field that was given something else', () => {
    expect(parsePolicyInput('yes', true).ok).toBe(false)
  })

  it('edits a nested group as JSON', () => {
    // layers is where the real trading style lives; flattening it would leave
    // only the shallow knobs adjustable.
    const out = parsePolicyInput('{"sepa":{"min_score":65}}', { sepa: { min_score: 70 } })
    expect(out).toEqual({ ok: true, value: { sepa: { min_score: 65 } } })
  })

  it('names the syntax problem rather than failing blankly', () => {
    const out = parsePolicyInput('{sepa:', { sepa: {} })
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.error).toContain('not valid JSON')
  })

  it('clearing a field means not set, not empty string', () => {
    // "" would be stored as a value; null is the absence the policy means.
    expect(parsePolicyInput('', 70)).toEqual({ ok: true, value: null })
    expect(parsePolicyInput('not set', 70)).toEqual({ ok: true, value: null })
  })

  it('reads a number into a field that had none', () => {
    // min_composite_score starts null; typing 60 must not arrive as "60".
    expect(parsePolicyInput('60', null)).toEqual({ ok: true, value: 60 })
  })

  it('leaves a string field alone', () => {
    expect(parsePolicyInput('stock_composite', 'sepa')).toEqual({
      ok: true,
      value: 'stock_composite',
    })
  })

  it('trims, so a stray space is not a new value', () => {
    expect(parsePolicyInput('  12  ', 8)).toEqual({ ok: true, value: 12 })
  })
})

describe('editable fields', () => {
  it('offers an editor only where a change would apply', () => {
    // patch_policy_json drops the rest at approval, so a control for one would
    // look like a change and not be one.
    expect(isEditablePolicyField('max_candidates')).toBe(true)
    expect(isEditablePolicyField('use_llm_plan')).toBe(false)
    expect(isEditablePolicyField('auto_validate')).toBe(false)
  })

  it('covers every governor the Scan stage declares', () => {
    // Scan is where the trading style actually bites — if its knobs were not
    // adjustable the feature would miss the stage that matters most.
    const scan = PIPELINE_STAGES.find((s) => s.step === 'scan_universe')!
    for (const key of scan.governedBy as readonly string[]) {
      expect(isEditablePolicyField(key), key).toBe(true)
    }
  })

  it('mirrors the backend whitelist exactly', () => {
    // Drift either way is a lie to the reader: a missing entry hides a usable
    // knob, an extra one offers a change the API will refuse.
    expect([...EDITABLE_POLICY_FIELDS].sort()).toEqual([
      'discovery_assist',
      'flag_filter',
      'layers',
      'max_candidates',
      'min_composite_score',
      'min_hit_rate',
      'option_overlay',
      'preset',
      'require_validate_pass',
      'universe_mode',
    ])
  })
})
