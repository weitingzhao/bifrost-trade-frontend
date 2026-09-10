import { describe, it, expect } from 'vitest'
import { daemonLampTextClass } from './daemonUi'

describe('daemonLampTextClass', () => {
  it('does not paint "no daemon" as a fault', () => {
    // computeIbBrokerGroupLamp answers `none` while the daemon is not running,
    // which under D10 is the standing posture — the page used to colour it with
    // the same red as a failure, every day.
    expect(daemonLampTextClass('none')).not.toContain('red')
    expect(daemonLampTextClass('none')).toContain('text-lamp-gray')
    expect(daemonLampTextClass('none')).not.toBe(daemonLampTextClass('red'))
  })

  it('takes all three live states from the lamp family, not raw palette', () => {
    expect(daemonLampTextClass('green')).toContain('text-lamp-green')
    expect(daemonLampTextClass('yellow')).toContain('text-lamp-yellow')
    expect(daemonLampTextClass('red')).toContain('text-lamp-red')
    const all = (['green', 'yellow', 'red', 'none'] as const)
      .map(daemonLampTextClass)
      .join(' ')
    expect(all).not.toMatch(/(text|bg)-(red|yellow|green)-\d{3}/)
  })

  it('keeps the numeric styling the cell relies on', () => {
    expect(daemonLampTextClass('green')).toContain('tabular-nums')
    expect(daemonLampTextClass('green')).toContain('font-mono')
  })
})
