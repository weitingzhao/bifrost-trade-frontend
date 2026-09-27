/**
 * What's New (design Rev .72 §13): 1.4s after the app is up, a centred glass
 * card names the gestures a round added. ↵, Esc, the button or a click outside
 * closes it (`bifrost.whatsnew`).
 *
 * It is keyed to the round its items announce, not to the package Rev — the
 * design pins its own (`NEW_REV`). Keyed to `DESIGN_REV`, the same six items
 * came back every time a design snapshot landed. A reader who closed it at any
 * later Rev has seen these items.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { revIsNewer } from '@/lib/design/rev'
import css from './whatsNew.module.css'

const KEY = 'bifrost.whatsnew'

/** The round these items came from (design Rev .96–.97, batch K1). Move it when they change. */
const ITEMS_REV = '2026-09-26.97'

const ITEMS: readonly (readonly [string, string, string])[] = [
  ['⌥', 'The toolbar reordered', 'Lists · Live · Book · Autopilot · Copilot — and ⌥1–4 follow the positions.'],
  ['◉', 'Lit means showing', 'A toolbar tile fills only for the surface you are looking at; one that is open behind another tab keeps its running dot.'],
  ['⊞', 'Icon tabs', 'Side-panel tabs are icons now — hover for the name, middle-click to close. Nine fit before anything folds.'],
  ['⧉', 'Open in new window', 'The page menu (⋯ in the head) opens this page in its own browser window; ⌘-click on any nav row or breadcrumb does too.'],
  ['✓', 'Can I trade, in one place', 'The verdict tops the Control Center, taken as the worst of the rows below it. It left the user menu.'],
]

function seen(): boolean {
  try {
    const closed = localStorage.getItem(KEY)
    return closed != null && !revIsNewer(ITEMS_REV, closed)
  } catch {
    return true
  }
}

export function WhatsNew() {
  const [mounted, setMounted] = useState(false)
  const [on, setOn] = useState(false)
  const go = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (seen()) return
    const t = window.setTimeout(() => {
      setMounted(true)
      window.requestAnimationFrame(() => {
        setOn(true)
        go.current?.focus({ preventScroll: true })
      })
    }, 1400)
    return () => window.clearTimeout(t)
  }, [])

  const close = useCallback(() => {
    try {
      localStorage.setItem(KEY, ITEMS_REV)
    } catch {
      // Storage refused: it will say hello again next load.
    }
    setOn(false)
    window.setTimeout(() => setMounted(false), 260)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      close()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [mounted, close])

  if (!mounted) return null
  return (
    <>
      <div className={css.scrim} data-on={on ? '1' : '0'} onClick={close} aria-hidden />
      <div role="dialog" aria-label="What's new" aria-modal className={css.sheet} data-on={on ? '1' : '0'} data-glass-surface="surface">
        <div className={css.title}>What’s new in Bifröst Trade</div>
        {ITEMS.map(([glyph, head, body]) => (
          <div key={head} className={css.item}>
            <b aria-hidden>{glyph}</b>
            <div>
              <div className={css.head}>{head}</div>
              <div className={css.body}>{body}</div>
            </div>
          </div>
        ))}
        <button ref={go} type="button" className={css.go} onClick={close}>
          Continue
        </button>
      </div>
    </>
  )
}
