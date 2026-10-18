import { describe, expect, it } from 'vitest'
import { detectDevice, dockOf, heightClass, widthClass } from './device'
import { phoneTier } from '@/layout/phoneTier'
import { phoneTabOf } from '@/layout/phone/phoneTabs'
import { dockStep, keepRule } from '@/layout/deviceRules'
import { sheetRelease } from '@bifrost/ui'

// Design Rev .163 → .164, DESIGN_CONTRACTS §18 — the numbers are the contract's.
describe('the width class is the window, not the device (§18.1)', () => {
  it('compact < 600 · medium < 1024 · expanded < 1440 · wide', () => {
    expect(widthClass(393)).toBe('compact')
    expect(widthClass(599)).toBe('compact')
    expect(widthClass(600)).toBe('medium')
    expect(widthClass(1023)).toBe('medium')
    expect(widthClass(1024)).toBe('expanded')
    expect(widthClass(1439)).toBe('expanded')
    expect(widthClass(1440)).toBe('wide')
    expect(widthClass(2560)).toBe('wide')
  })

  it('short < 900 · tall', () => {
    expect(heightClass(820)).toBe('short')
    expect(heightClass(899)).toBe('short')
    expect(heightClass(900)).toBe('tall')
  })

  it('docks a detail only on wide, and only with 1200 of content area (§18.12)', () => {
    expect(dockOf('wide', 1200)).toBe(true)
    expect(dockOf('wide', 1199)).toBe(false)
    // An expanded window never docks, however wide its content reads.
    expect(dockOf('expanded', 1300)).toBe(false)
  })
})

describe("Rev .163's device label, kept for compatibility", () => {
  it('narrower than 600 is a phone, whatever the pointer', () => {
    expect(detectDevice(393, 852, true)).toBe('phone')
    expect(detectDevice(599, 900, false)).toBe('phone')
    // An iPad split down to under 600 lays out as a phone.
    expect(detectDevice(504, 820, true)).toBe('phone')
  })

  it('an iPhone on its side is still a phone: coarse, short side under 500', () => {
    expect(detectDevice(852, 393, true)).toBe('phone')
  })

  it('any other coarse pointer is a pad; a fine one is the desk', () => {
    expect(detectDevice(1180, 820, true)).toBe('pad')
    expect(detectDevice(820, 1180, true)).toBe('pad')
    expect(detectDevice(1180, 820, false)).toBe('desk')
    expect(detectDevice(852, 393, false)).toBe('desk')
  })
})

describe('phone tiers (§18.2, registry phoneTier)', () => {
  it('act: watch the book and act on it', () => {
    for (const p of ['/home', '/portfolio/positions', '/trade/desk', '/trade/expiration', '/research/loop/decisions', '/review/proposals', '/research/event-radar', '/risk/limits', '/trade/412']) {
      expect(phoneTier(p), p).toBe('act')
    }
  })

  it('read: the reading pages, aliases included, query and trailing slash ignored', () => {
    for (const p of ['/portfolio', '/trade/fills', '/research/symbol', '/research/stocks', '/research/screener', '/home/calendar', '/review/habits', '/market/live', '/settings', '/system/status/', '/research/stocks?model=sepa']) {
      expect(phoneTier(p), p).toBe('read')
    }
  })

  it('desk: everything else', () => {
    for (const p of ['/trade/rules', '/research/backtest', '/research/pine', '/review/playbook', '/risk/sizing', '/docs/tech-stack', '/system/feedback', '/trade/desk/x']) {
      expect(phoneTier(p), p).toBe('desk')
    }
  })
})

describe('the tab a route lights (§18.4)', () => {
  it('maps layers to their tab; the day’s pages light Home; the inbox and the rest light More', () => {
    expect(phoneTabOf('/home')).toBe('home')
    expect(phoneTabOf('/market/live')).toBe('home')
    expect(phoneTabOf('/trade/expiration')).toBe('trade')
    expect(phoneTabOf('/portfolio/ledger')).toBe('portfolio')
    expect(phoneTabOf('/research/symbol')).toBe('research')
    expect(phoneTabOf('/research/loop/decisions')).toBe('more')
    expect(phoneTabOf('/risk/limits')).toBe('more')
  })
})

describe('kept columns (§18.6)', () => {
  it('hides every cell outside the list, never a spanning cell or a nested table', () => {
    const rule = keepRule('1,4,8')
    expect(rule).toContain(`[data-sr-keep="1,4,8"] tr:not([data-sr-keep="1,4,8"] td tr)`)
    expect(rule).toContain(':not(:nth-child(1)):not(:nth-child(4)):not(:nth-child(8)):not([colspan])')
    // The package's rule since D2 (@bifrost/ui ensureKeepRule).
    expect(rule.startsWith('html[data-w="compact"]')).toBe(true)
  })

  it('writes nothing for a list with no column in it', () => {
    expect(keepRule('')).toBe('')
    expect(keepRule('x,0')).toBe('')
  })
})

describe('the dock bar steps aside on a short screen (§18.11)', () => {
  it('hides after 32px down, returns after 24px up or near the top', () => {
    expect(dockStep(200, 20)).toBe('stay')
    expect(dockStep(200, 33)).toBe('hide')
    expect(dockStep(200, -25)).toBe('show')
    expect(dockStep(200, -10)).toBe('stay')
    expect(dockStep(10, 80)).toBe('show')
  })
})

describe('the sheet grip (§18.5)', () => {
  it('a tap switches detents; up past 48 is full; down past 72 drops full to half and half to closed', () => {
    expect(sheetRelease(2, false)).toBe('toggle')
    expect(sheetRelease(-49, false)).toBe('full')
    expect(sheetRelease(-30, false)).toBe('stay')
    expect(sheetRelease(73, true)).toBe('half')
    expect(sheetRelease(73, false)).toBe('close')
    expect(sheetRelease(60, false)).toBe('stay')
  })
})
