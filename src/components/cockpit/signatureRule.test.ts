import { describe, expect, it } from 'vitest'
import { signatureParts } from './signatureRule'

const READY = { asOf: '2026-09-13T00:46:00.512085Z', isPending: false, isError: false }

describe('signatureParts', () => {
  it('names the provider that actually produced the turn', () => {
    expect(
      signatureParts({ role: 'assistant', origin: 'model', model: 'deepseek-chat' }, READY),
    ).toEqual({ provider: 'DEEPSEEK', grounding: 'grounded in features asof 13 Sep' })
  })

  it('says so rather than borrowing the model selected now', () => {
    // Hydrated history: the persisted frames record no model. Signing it with
    // whatever is in the picker today would be a false claim about who wrote
    // it — the one thing this line exists to prevent.
    expect(signatureParts({ role: 'assistant', origin: 'model' }, READY)?.provider).toBe(
      'provider not recorded',
    )
  })

  it('does not sign the frontend talking to itself', () => {
    // "Write executed successfully" is our string. Attributing it to a
    // provider would be a misattribution dressed as provenance.
    expect(signatureParts({ role: 'assistant', origin: 'app' }, READY)).toBeNull()
    expect(signatureParts({ role: 'user', origin: 'model' }, READY)).toBeNull()
  })

  it('never turns an unknown batch into a date', () => {
    const pending = signatureParts(
      { role: 'assistant', origin: 'model', model: 'deepseek-chat' },
      { asOf: null, isPending: true, isError: false },
    )
    expect(pending?.grounding).toBe('checking feature freshness')

    for (const batch of [
      { asOf: null, isPending: false, isError: true },
      { asOf: null, isPending: false, isError: false },
      { asOf: undefined, isPending: false, isError: false },
    ]) {
      expect(
        signatureParts({ role: 'assistant', origin: 'model', model: 'deepseek-chat' }, batch)
          ?.grounding,
      ).toBe('feature freshness unavailable')
    }
  })

  it('falls back to the raw string for a date it cannot read', () => {
    expect(
      signatureParts(
        { role: 'assistant', origin: 'model', model: 'deepseek-chat' },
        { asOf: 'not-a-date', isPending: false, isError: false },
      )?.grounding,
    ).toBe('grounded in features asof not-a-date')
  })
})
