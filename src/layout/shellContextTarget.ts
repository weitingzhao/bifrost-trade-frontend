/**
 * What a right-click landed on, for the shell's context menu (design Rev .69
 * §1). Pure: the menu component reads it, the tests call it directly.
 */
import type { ContractPick } from './symbolGo'

const TICKER = /^[A-Z][A-Z.]{0,5}$/
const SYM_CLASS = ['text-entity-symbol', 'text-[var(--sk-ticker)]', 'text-[var(--color-entity-symbol)]']
const CONTRACT_CLASS = [
  'text-entity-option',
  'text-entity-contract',
  'text-[var(--sk-contract)]',
  'text-[var(--color-entity-option)]',
]
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export type ContextTarget =
  | { kind: 'sym'; sym: string; contract: string | null; x: number; y: number }
  | { kind: 'tab'; key: string; label: string; x: number; y: number }

/**
 * `RKLB 18DEC26 90C` / `RKLB 2026-12-18 90 C` → the face it opens on. A
 * contract the parser cannot read still gets the symbol's verbs and Copy.
 */
export function parseContract(text: string): ContractPick | null {
  const t = text.trim().toUpperCase().replace(/\s+/g, ' ')
  const a = /^[A-Z][A-Z.]{0,5} (\d{1,2})([A-Z]{3})(\d{2}) (\d+(?:\.\d+)?) ?([CP])$/.exec(t)
  if (a) {
    const m = MONTHS.indexOf(a[2])
    if (m < 0) return null
    const expiry = `20${a[3]}${String(m + 1).padStart(2, '0')}${a[1].padStart(2, '0')}`
    return { multi: false, expiry, strike: Number(a[4]), right: a[5] as 'C' | 'P' }
  }
  const b = /^[A-Z][A-Z.]{0,5} (\d{4})-(\d{2})-(\d{2}) (\d+(?:\.\d+)?) ?([CP])$/.exec(t)
  if (b) return { multi: false, expiry: `${b[1]}${b[2]}${b[3]}`, strike: Number(b[4]), right: b[5] as 'C' | 'P' }
  return null
}

function hasClass(el: Element, names: string[]): boolean {
  return names.some((n) => el.classList.contains(n))
}

/** What was right-clicked, if it is something this menu answers for. */
export function targetOf(e: Pick<MouseEvent, 'target' | 'clientX' | 'clientY'>): ContextTarget | null {
  const t = e.target instanceof Element ? e.target : null
  if (t == null || t.closest('input, textarea, select, [contenteditable="true"]')) return null
  const tab = t.closest<HTMLElement>('[data-ctx-tab]')
  if (tab) {
    return {
      kind: 'tab',
      key: tab.dataset.ctxTab ?? '',
      label: tab.dataset.ctxLabel ?? tab.textContent?.replace(/×$/, '').trim() ?? '',
      x: e.clientX,
      y: e.clientY,
    }
  }
  // Explicit marks: `data-ctx-sym`, and the Symbol list's own row key.
  const marked = t.closest<HTMLElement>('[data-ctx-sym], [data-dock-sym]')
  const sym = marked?.dataset.ctxSym ?? marked?.dataset.dockSym
  if (marked && sym) {
    return { kind: 'sym', sym, contract: marked.dataset.ctxContract ?? null, x: e.clientX, y: e.clientY }
  }
  // Up to two levels: the ink class sits on the text's own span or its cell.
  for (let el: Element | null = t, i = 0; el != null && i < 3; el = el.parentElement, i++) {
    const text = el.textContent?.trim() ?? ''
    if (text.length === 0 || text.length > 40) break
    // A bare name in either ink is the name: option tables print their
    // underlying in the contract ink.
    if (hasClass(el, [...SYM_CLASS, ...CONTRACT_CLASS]) && TICKER.test(text)) {
      return { kind: 'sym', sym: text, contract: null, x: e.clientX, y: e.clientY }
    }
    if (hasClass(el, CONTRACT_CLASS) && /^[A-Z][A-Z.]{0,5}\s+\S/.test(text)) {
      return { kind: 'sym', sym: text.split(/\s+/)[0], contract: text, x: e.clientX, y: e.clientY }
    }
  }
  const link = t.closest<HTMLAnchorElement>('a[href*="symbol="]')
  if (link) {
    try {
      const sym = new URL(link.href).searchParams.get('symbol')?.toUpperCase() ?? ''
      if (sym && TICKER.test(sym) && link.textContent?.trim().toUpperCase() === sym) {
        return { kind: 'sym', sym, contract: null, x: e.clientX, y: e.clientY }
      }
    } catch {
      return null
    }
  }
  return null
}
