import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseQuery } from '@/lib/omnibar'
import { KEY_COPILOT, KEY_OMNIBAR, SHORTCUTS } from './shortcuts'

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

  it('says where a page-scoped key fires', () => {
    // `j / k` only works on Symbol. A list that offered it everywhere would be
    // wrong on every other page.
    const jk = SHORTCUTS.find((s) => s.keys === 'j / k')
    expect(jk?.scope).toBe('Symbol')
    expect(SHORTCUTS.every((s) => s.scope.length > 0)).toBe(true)
  })
})
