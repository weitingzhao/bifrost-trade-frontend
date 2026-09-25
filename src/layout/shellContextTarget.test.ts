import { describe, expect, it } from 'vitest'
import { parseContract, targetOf } from './shellContextTarget'

/** Made-up names and strikes; nothing here is a real holding. */
function hit(html: string, selector: string) {
  document.body.innerHTML = html
  const el = document.querySelector(selector)!
  return targetOf({ target: el, clientX: 10, clientY: 20 })
}

describe('context-menu targets (design Rev .69 §1)', () => {
  it('reads an explicit mark first, with its contract', () => {
    expect(hit('<div data-ctx-sym="ABC" data-ctx-contract="ABC 18DEC26 90C"><b>x</b></div>', 'b')).toEqual({
      kind: 'sym',
      sym: 'ABC',
      contract: 'ABC 18DEC26 90C',
      x: 10,
      y: 20,
    })
  })

  it('reads the Symbol list row key as a mark', () => {
    expect(hit('<button data-dock-sym="QRS"><span>QRS</span></button>', 'span')).toMatchObject({ sym: 'QRS' })
  })

  it('reads the symbol and contract entity classes, not a colour', () => {
    expect(hit('<span class="text-entity-symbol">XYZ</span>', 'span')).toMatchObject({ kind: 'sym', sym: 'XYZ', contract: null })
    expect(hit('<span class="text-[var(--sk-ticker)]">XYZ</span>', 'span')).toMatchObject({ sym: 'XYZ' })
    expect(hit('<span class="text-entity-option">XYZ 2026-12-18 50 P</span>', 'span')).toMatchObject({
      sym: 'XYZ',
      contract: 'XYZ 2026-12-18 50 P',
    })
    expect(hit('<button class="text-[var(--color-entity-option)]">XYZ</button>', 'button')).toMatchObject({ sym: 'XYZ', contract: null })
    expect(hit('<span style="color: lime">XYZ</span>', 'span')).toBeNull()
  })

  it('takes a link only when its text is the name it carries', () => {
    expect(hit('<a href="/research/symbol?symbol=XYZ">XYZ</a>', 'a')).toMatchObject({ sym: 'XYZ' })
    expect(hit('<a href="/research/symbol?symbol=XYZ">Open the page</a>', 'a')).toBeNull()
  })

  it('answers for a panel tab, and never inside an input', () => {
    expect(hit('<button data-ctx-tab="k1" data-ctx-label="Positions">Positions ×</button>', 'button')).toMatchObject({
      kind: 'tab',
      key: 'k1',
      label: 'Positions',
    })
    expect(hit('<div data-ctx-sym="XYZ"><input /></div>', 'input')).toBeNull()
  })
})

describe('parseContract', () => {
  it('reads both spellings the app prints', () => {
    expect(parseContract('ABC 18DEC26 90C')).toEqual({ multi: false, expiry: '20261218', strike: 90, right: 'C' })
    expect(parseContract('abc 2026-01-16 12.5 p')).toEqual({ multi: false, expiry: '20260116', strike: 12.5, right: 'P' })
    expect(parseContract('ABC Dec spread')).toBeNull()
  })
})
