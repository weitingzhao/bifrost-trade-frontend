import { describe, expect, it } from 'vitest'
import type { CopilotModelsResponse } from '@/api/researchCopilotModels'
import { newThreadProvider, spendAgainstCap } from './deskHeader'

const catalog: CopilotModelsResponse = {
  available: [{ id: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek', family: 'DeepSeek' }],
  default: 'deepseek-chat',
  total_catalog: 15,
}

describe('spendAgainstCap', () => {
  it('adds bridge spend to chat spend and measures it against the deployment cap', () => {
    expect(spendAgainstCap({ tokens_today: 0, cost_estimate_usd: 0.5, bridge_cost_usd_today: 0.25, cap_usd: 2, remaining_usd: 1.25 })).toEqual({
      spent: 0.75,
      cap: 2,
      share: 0.375,
      over: false,
    })
  })

  it('clamps at the cap, and has no share without one', () => {
    expect(spendAgainstCap({ tokens_today: 0, cost_estimate_usd: 3, cap_usd: 2, remaining_usd: 0 })).toMatchObject({ share: 1, over: true })
    expect(spendAgainstCap({ tokens_today: 0, cost_estimate_usd: 0.1, cap_usd: 0, remaining_usd: 0 })).toMatchObject({ share: null, over: false })
  })
})

describe('newThreadProvider', () => {
  it('is ready when this deployment serves the chosen model', () => {
    expect(newThreadProvider('deepseek-chat', catalog)).toEqual({ modelLabel: 'DeepSeek Chat', provider: 'DeepSeek', state: 'ready' })
  })

  it('says not configured when the choice is off the catalog — the chat would stop, not fall back', () => {
    expect(newThreadProvider('claude-4.5-sonnet', catalog)).toEqual({
      modelLabel: 'Claude 4.5 Sonnet',
      provider: 'Anthropic',
      state: 'not_configured',
    })
  })

  it('does not claim either way without the catalog', () => {
    expect(newThreadProvider('claude-4.5-sonnet', undefined).state).toBe('unchecked')
  })
})
