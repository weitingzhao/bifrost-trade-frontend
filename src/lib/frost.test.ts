import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '@/test/memoryStorage'
import { FROST_KEY, applyFrost, frostIsOn, frostSwitch, setFrost } from './frost'
import { GLASS_KEY } from './glass'

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.frost
})

describe('the frost comparison switch', () => {
  it('is on by default', () => {
    expect(frostSwitch('')).toBe(true)
  })

  it('?frost=0 turns it off and is remembered for the next page', () => {
    expect(frostSwitch('?frost=0')).toBe(false)
    expect(localStorage.getItem(FROST_KEY)).toBe('0')
    expect(frostSwitch('')).toBe(false)
  })

  it('?frost=1 puts it back', () => {
    localStorage.setItem(FROST_KEY, '0')
    expect(frostSwitch('?frost=1')).toBe(true)
    expect(frostSwitch('')).toBe(true)
  })

  it('ignores any other value', () => {
    expect(frostSwitch('?frost=maybe')).toBe(true)
  })

  it('setFrost writes the key and repaints', () => {
    setFrost(false)
    expect(document.documentElement.dataset.frost).toBe('off')
    setFrost(true)
    expect(document.documentElement.dataset.frost).toBe('on')
  })
})

describe('solid is the kill switch', () => {
  it('Reduce transparency turns the frost off whatever the switch says', () => {
    localStorage.setItem(GLASS_KEY, 'solid')
    expect(frostIsOn('')).toBe(false)
    applyFrost(frostIsOn(''))
    expect(document.documentElement.dataset.frost).toBe('off')
  })

  it('an explicit glass choice keeps it on', () => {
    localStorage.setItem(GLASS_KEY, 'glass')
    expect(frostIsOn('')).toBe(true)
  })
})

describe('the first paint', () => {
  // index.html cannot import the module; its copy uses the same key and the
  // same parameter, and takes solid into account, so a reload never paints
  // the frost and then drops it.
  const html = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf8')

  it('reads the same key and parameter', () => {
    expect(html).toContain(`'${FROST_KEY}'`)
    expect(html).toContain(`get('frost')`)
    expect(html).toContain('r.dataset.frost')
  })

  it('turns the frost off when the surfaces are solid', () => {
    expect(html).toMatch(/!solid \? 'on' : 'off'/)
  })
})
