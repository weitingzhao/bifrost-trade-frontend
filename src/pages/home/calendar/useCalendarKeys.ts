/**
 * The Calendar's keys anywhere on the page, as the prototype binds them
 * (§17.9): ← → a weekday · ↑ ↓ a week · T today · [ ] a month. The grid
 * answers the same keys itself when it has focus (and Enter opens the day);
 * this is for the page with focus nowhere in particular. Text fields,
 * popovers, menus, segment controls and the top bar keep their keys.
 */
import { useEffect, useRef } from 'react'
import { isoAddDays, isWeekendIso, shiftIsoMonth } from '@bifrost/ui'

const OWNS_KEYS = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="radiogroup"]',
  '[role="tablist"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="dialog"]',
  '[data-radix-popper-content-wrapper]',
  'header[data-menubar]',
  '[data-slot="calendar-grid"]',
].join(',')

/** The next weekday from `d`, `n` days on (±1 steps over a weekend, ±7 lands on the same weekday). */
export function stepWeekday(d: string, n: number): string {
  let next = isoAddDays(d, n)
  while (isWeekendIso(next)) next = isoAddDays(next, n > 0 ? 1 : -1)
  return next
}

export function useCalendarKeys(p: {
  sel: string
  month: string
  today: string
  onSelect: (d: string) => void
  onMonth: (month: string) => void
}): void {
  const ref = useRef(p)
  useEffect(() => {
    ref.current = p
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && t !== document.body && t.closest(OWNS_KEYS)) return
      const { sel, month, today, onSelect, onMonth } = ref.current
      const move = (n: number) => {
        e.preventDefault()
        onSelect(stepWeekday(sel, n))
      }
      switch (e.key) {
        case 'ArrowLeft':
          return move(-1)
        case 'ArrowRight':
          return move(1)
        case 'ArrowUp':
          return move(-7)
        case 'ArrowDown':
          return move(7)
        case 't':
        case 'T':
          e.preventDefault()
          return onSelect(today)
        case '[':
        case ']':
          e.preventDefault()
          return onMonth(shiftIsoMonth(month, e.key === '[' ? -1 : 1))
        default:
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
