import { describe, expect, it, vi } from 'vitest'
import { errorFromUpdateResult, syncOppositeLegAttribution } from './executionUpdateResult'

describe('errorFromUpdateResult', () => {
  it('is silent on ok', () => {
    expect(errorFromUpdateResult({ ok: true })).toBeNull()
  })

  it('surfaces the server error instead of treating a failed PUT as success', () => {
    expect(errorFromUpdateResult({ ok: false, error: 'instance not found' })).toBe('instance not found')
    expect(errorFromUpdateResult({ ok: false })).toBe('Update failed')
  })
})

describe('syncOppositeLegAttribution', () => {
  it('does not report success when updateExecution returns ok: false', async () => {
    const update = vi.fn().mockResolvedValue({ ok: false, error: 'row locked' })
    const result = await syncOppositeLegAttribution(update, 42, {
      opportunity_id: 7,
      instance_id: 11,
    })
    expect(result).toEqual({ ok: false, error: 'row locked' })
    expect(update).toHaveBeenCalledWith(42, {
      strategy_opportunity_id: 7,
      strategy_instance_id: 11,
    })
  })

  it('reports a request that never reached the API instead of throwing past the row', async () => {
    const update = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(
      syncOppositeLegAttribution(update, 42, { opportunity_id: 7, instance_id: 11 }),
    ).resolves.toEqual({ ok: false, error: 'Failed to fetch' })
  })

  it('reports ok when the PUT succeeds', async () => {
    const update = vi.fn().mockResolvedValue({ ok: true })
    await expect(
      syncOppositeLegAttribution(update, 42, { opportunity_id: 7, instance_id: 11 }),
    ).resolves.toEqual({ ok: true })
  })
})
