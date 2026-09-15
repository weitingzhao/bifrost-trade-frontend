import { describe, expect, it } from 'vitest'
import { copilotSpendLine } from './copilotSpendLine'

describe('copilotSpendLine', () => {
  it('is PROVIDER · $x today from the usage estimate, not a guessed clock', () => {
    expect(copilotSpendLine({ providerLabel: 'Anthropic', costUsd: 0.1234 })).toBe(
      'ANTHROPIC · $0.12 today',
    )
  })

  it('says spend n/a when usage did not load, instead of $0', () => {
    expect(copilotSpendLine({ providerLabel: 'Anthropic', costUsd: null })).toBe(
      'ANTHROPIC · spend n/a',
    )
    expect(copilotSpendLine({ providerLabel: null, costUsd: undefined })).toBe('Spend n/a')
  })
})
