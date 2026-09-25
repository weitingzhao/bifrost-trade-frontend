import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseQuery } from '@/lib/omnibar'
import { KEY_COPILOT, KEY_OMNIBAR, KEY_SIDEBAR, SHORTCUTS } from './shortcuts'

describe('the shortcut list', () => {
  it('answers `?` in the Omnibar and nothing else', () => {
    expect(parseQuery('?').mode).toBe('shortcuts')
    expect(parseQuery('?copilot').term).toBe('copilot')
    expect(parseQuery('/positions').mode).toBe('pages')
    expect(parseQuery('>toggle').mode).toBe('commands')
    // A question mark inside a term is a term, not a mode.
    expect(parseQuery('what?').mode).toBe('all')
  })

  it('describes the keys the handler actually binds', () => {
    // The list and the handler read the same constants, and this fails if the
    // handler stops using them — a help page naming a key that no longer fires
    // is worse than no help page.
    const src = readFileSync('src/lib/cockpit/keybinds.ts', 'utf8')
    expect(src).toContain('KEY_OMNIBAR')
    expect(src).toContain('KEY_COPILOT')
    expect(SHORTCUTS.find((s) => s.keys === '⌘K')?.what).toMatch(/Omnibar/)
    expect(SHORTCUTS.find((s) => s.keys === '⌘J')?.what).toMatch(/Copilot/)
    expect(KEY_OMNIBAR).toBe('k')
    expect(KEY_COPILOT).toBe('j')
  })

  it('describes what Esc actually closes, which is not the Copilot', () => {
    // §5a.8 made the side panel the companion that stays; Esc has closed the
    // top inspector and then the float since. The list said "close the
    // Copilot" until Settings went to publish it (2026-09-22).
    const esc = SHORTCUTS.find((s) => s.keys === 'Esc')
    expect(esc?.what).toMatch(/inspector/)
    expect(esc?.what).not.toMatch(/Copilot/)
    const src = readFileSync('src/lib/cockpit/keybinds.ts', 'utf8')
    expect(src).toContain('closeTopInspector')
  })

  it('lists the sidebar key, which the design system owns and the list forgot', () => {
    expect(SHORTCUTS.find((s) => s.keys === '⌘B')?.scope).toBe('Anywhere')
    expect(KEY_SIDEBAR).toBe('b')
  })

  it('says where a page-scoped key fires', () => {
    // `j / k` walks the Symbol list (Shell Spec §5a.11, Rev .56), so it fires
    // wherever the list is shown — not everywhere: hide the list and the keys
    // go with it, and a page with its own j / k keeps it. The scope says so.
    const jk = SHORTCUTS.find((s) => s.keys === 'j / k')
    expect(jk?.scope).toBe('Anywhere the list is shown')
    expect(SHORTCUTS.every((s) => s.scope.length > 0)).toBe(true)
  })
})
