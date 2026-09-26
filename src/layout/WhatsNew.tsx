/**
 * What's New (design Rev .72 §13): once per design Rev, 1.4s after the app
 * is up, a centred glass card names the gestures this round added. ↵, Esc,
 * the button or a click outside closes it, and it does not come back until
 * the next Rev (`bifrost.whatsnew`).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { DESIGN_REV } from '@/lib/design/designRoutes.generated'
import css from './whatsNew.module.css'

const KEY = 'bifrost.whatsnew'

const ITEMS: readonly (readonly [string, string, string])[] = [
  ['⌘', 'Hold ⌘ for every shortcut', 'Keep ⌘ pressed for a second to see what the keyboard can do here.'],
  ['␣', 'Quick Look', 'Hover a row with a symbol or contract and press Space — ↑ ↓ to walk, ↵ to open.'],
  ['⋯', 'Right-click a symbol', 'Open it, compare in a locked tab, add to Watch or copy — from any ticker on any page.'],
  ['⇲', 'Drag to act', 'Drag a symbol to the bar above the toolbar; drag a panel tab down to float it; drag the float to an edge to tile it.'],
  ['↶', 'Undo closes', 'Closed a tab by mistake? The toast offers Undo for five seconds.'],
  ['◐', 'Transparency · contrast · text size', 'In the user menu, under Appearance.'],
]

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === DESIGN_REV
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
      localStorage.setItem(KEY, DESIGN_REV)
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
