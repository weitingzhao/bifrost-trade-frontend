import { describe, expect, it } from 'vitest'
import { redirectTargetFor } from './redirectTarget'

describe('redirectTargetFor', () => {
  it('carries the reader’s query onto the new path', () => {
    expect(redirectTargetFor('/research/overview', '?copilot=open', '')).toBe(
      '/research/overview?copilot=open',
    )
    expect(redirectTargetFor('/research/contract-screener', '?symbol=NVDA', '')).toBe(
      '/research/contract-screener?symbol=NVDA',
    )
  })

  it('puts the target’s own parameters first and lets them win a clash', () => {
    expect(redirectTargetFor('/system/coverage?view=option', '?view=stock&q=nv', '')).toBe(
      '/system/coverage?view=option&q=nv',
    )
  })

  it('keeps the hash from whichever side names one', () => {
    expect(redirectTargetFor('/portfolio/backing#model', '?symbol=NVDA', '')).toBe(
      '/portfolio/backing?symbol=NVDA#model',
    )
    expect(redirectTargetFor('/portfolio/backing', '', '#room')).toBe('/portfolio/backing#room')
  })

  it('adds nothing when the reader carried nothing', () => {
    expect(redirectTargetFor('/system/daemon', '', '')).toBe('/system/daemon')
  })

  it('keeps repeated parameter names the reader sent', () => {
    expect(redirectTargetFor('/research/symbol', '?tab=vol&tab=flow', '')).toBe(
      '/research/symbol?tab=vol&tab=flow',
    )
  })
})
