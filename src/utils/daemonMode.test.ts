import { describe, expect, it } from 'vitest'
import type { StatusResponse } from '@/types/monitor'
import { daemonPaperTrade } from './daemonMode'

const withSummary = (config_summary: unknown) =>
  ({ daemon: { trading: { auto_status: { config_summary } } } }) as unknown as StatusResponse

describe('daemonPaperTrade', () => {
  it('reads the mode the daemon reports about itself', () => {
    expect(daemonPaperTrade(withSummary('paper_trade=True'))).toBe(true)
    expect(daemonPaperTrade(withSummary('paper_trade = false'))).toBe(false)
  })

  it('is null when the daemon has not said', () => {
    expect(daemonPaperTrade(undefined)).toBeNull()
    expect(daemonPaperTrade(withSummary(undefined))).toBeNull()
  })
})
