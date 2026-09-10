import { describe, it, expect } from 'vitest'
import { computeStrategyTradingDaemonLamp } from './daemonLamps'
import type { DaemonHeartbeat } from '@/types/monitor'

const alive = { daemon_alive: true } as DaemonHeartbeat

describe('computeStrategyTradingDaemonLamp', () => {
  it('degrades on an unknown group lamp rather than failing', () => {
    // `none` reaches here when the monitor status has not loaded. Coercing it
    // to red made a missing reading indistinguishable from a broker outage;
    // mapIngestLampToServiceLamp in this same file already answers yellow for
    // an unrecognised lamp.
    expect(computeStrategyTradingDaemonLamp(alive, 'none')).toBe('yellow')
  })

  it('still reports a real failure', () => {
    expect(computeStrategyTradingDaemonLamp(alive, 'red')).toBe('red')
    expect(computeStrategyTradingDaemonLamp({ daemon_alive: false } as DaemonHeartbeat, 'green'))
      .toBe('red')
  })

  it('passes healthy through', () => {
    expect(computeStrategyTradingDaemonLamp(alive, 'green')).toBe('green')
    expect(computeStrategyTradingDaemonLamp(alive, 'yellow')).toBe('yellow')
  })

  it('has nothing to say without a heartbeat', () => {
    expect(computeStrategyTradingDaemonLamp(null, 'green')).toBe('none')
    expect(computeStrategyTradingDaemonLamp(undefined, 'green')).toBe('none')
  })
})
