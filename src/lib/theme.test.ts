import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '@/test/memoryStorage'
import { applyTheme, autoTheme, readThemeMode, resolveTheme, setThemeMode, THEME_KEY } from './theme'

const at = (h: number, m = 0) => new Date(2026, 8, 23, h, m)

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.className = ''
})

describe('three modes, two themes', () => {
  it('resolves auto by the local clock — light from 07:00, dark from 19:00', () => {
    expect(autoTheme(at(6, 59))).toBe('dark')
    expect(autoTheme(at(7, 0))).toBe('light')
    expect(autoTheme(at(18, 59))).toBe('light')
    expect(autoTheme(at(19, 0))).toBe('dark')
    expect(resolveTheme('dark', at(12))).toBe('dark')
    expect(resolveTheme('light', at(23))).toBe('light')
  })

  it('reads anything it does not know as dark — the ground this app has always had', () => {
    expect(readThemeMode()).toBe('dark')
    localStorage.setItem(THEME_KEY, 'sepia')
    expect(readThemeMode()).toBe('dark')
    localStorage.setItem(THEME_KEY, 'auto')
    expect(readThemeMode()).toBe('auto')
  })

  it('stores the mode and puts the resolved theme on the document', () => {
    setThemeMode('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('light')
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

describe('the first paint', () => {
  // index.html cannot import this module, so it carries its own copy of the
  // rule. These pin the copy to the module: same key, same hours, same
  // default, so the page never paints one ground and then switches.
  const html = readFileSync(join(__dirname, '..', '..', 'index.html'), 'utf8')

  it('reads the same key and the same hours as the module', () => {
    expect(html).toContain(`'${THEME_KEY}'`)
    expect(html).toMatch(/h >= 7 && h < 19/)
  })

  it('defaults to dark when the script cannot run', () => {
    expect(html).toMatch(/<html[^>]*class="dark"/)
  })
})
