/**
 * Hold ⌘ (or Ctrl) for 0.9s → the shortcut sheet (design Rev .71 §3), in
 * the middle of the screen; letting go hides it. Pressing any other key
 * while holding cancels it, so ⌘K and the rest are never covered.
 *
 * Four groups, as the design lays them out, naming only what this app binds.
 */
import { useEffect, useState } from 'react'
import css from './shortcutSheet.module.css'

const SHEET: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  [
    'Anywhere',
    [
      ['Spotlight — symbol, page, command', '⌘K'],
      ['Copilot thread', '⌘J'],
      ['Sidebar', '⌘B'],
      ['Settings', '⌘,'],
      ['Close the float · popovers', 'Esc'],
      ['This sheet', 'hold ⌘'],
    ],
  ],
  [
    'Toolbar & panel',
    [
      ['Open toolbar group 1–4', '⌥1–4'],
      ['Close panel tab', '⌥W'],
      ['Previous / next tab', '⌥[  ⌥]'],
      ['Tab → float', 'drag the tab down'],
      ['Tile the float left / right', 'drag it to an edge'],
    ],
  ],
  [
    'Symbols',
    [
      ['Quick Look the row', 'Space'],
      ['Next / previous in Quick Look', '↑  ↓'],
      ['Open (the shell’s rule)', '↵'],
      ['Locked tab to compare', '⇧↵'],
      ['Symbol page', '⌘↵'],
      ['Walk the Symbol list', 'j  k'],
      ['Actions menu', 'right-click'],
      ['Open · compare · watch', 'drag the symbol'],
    ],
  ],
  [
    'Menus & lists',
    [
      ['Move', '← → ↑ ↓'],
      ['Choose', '↵'],
      ['Undo the last close', 'Undo in the toast'],
    ],
  ],
]

const HOLD_MS = 900

export function ShortcutSheet() {
  const [on, setOn] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    let timer = 0
    const hide = () => {
      window.clearTimeout(timer)
      timer = 0
      setOn(false)
    }
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        if (!timer && !e.repeat) {
          timer = window.setTimeout(() => {
            setMounted(true)
            window.requestAnimationFrame(() => setOn(true))
          }, HOLD_MS)
        }
      } else {
        hide()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') hide()
    }
    document.addEventListener('keydown', down, true)
    document.addEventListener('keyup', up, true)
    window.addEventListener('blur', hide)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', down, true)
      document.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', hide)
    }
  }, [])

  if (!mounted) return null
  return (
    <div role="dialog" aria-label="Keyboard shortcuts" aria-hidden={!on} className={css.sheet} data-on={on ? '1' : '0'} data-glass-surface="surface">
      {SHEET.map(([head, rows]) => (
        <div key={head}>
          <h4 className={css.head}>{head}</h4>
          {rows.map(([what, keys]) => (
            <div key={what} className={css.row}>
              <span>{what}</span>
              <kbd>{keys}</kbd>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
