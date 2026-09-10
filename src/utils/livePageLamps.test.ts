import { describe, it, expect } from 'vitest'
import {
  computeLiveNavLamp,
  computeMarketStreamsLamp,
  computeOpenOrdersLamp,
} from './livePageLamps'

describe('lamps with nothing to read', () => {
  it('does not light the sidebar red before the monitor query resolves', () => {
    // useMonitorStatus hands `undefined` on the first render of every page, so
    // this branch ran constantly. It answered 'red' while its own title said
    // "cannot determine".
    const { color, title } = computeLiveNavLamp(undefined, false)
    expect(color).toBe('none')
    expect(color).not.toBe('red')
    expect(title).toMatch(/cannot determine/i)
  })

  it('answers the same for a null status', () => {
    expect(computeLiveNavLamp(null, false).color).toBe('none')
  })

  it('agrees with the two sibling lamps in this file', () => {
    expect(computeMarketStreamsLamp(undefined)).toBe('none')
    expect(computeOpenOrdersLamp(undefined)).toBe('none')
    expect(computeLiveNavLamp(undefined, false).color).toBe('none')
  })
})
