/**
 * Numeric fields step (design Rev .72 §7). Focus any field whose value reads
 * as a number — `12`, `1.25`, `$84,000`, `33%` — and a − ⋮ + capsule floats
 * at its right edge: press to step, hold to repeat, drag the grip between
 * them to scrub; ⇧ is ×10. ↑ ↓ step as well, even in a text field. The step
 * is the value's last decimal place (or the field's own `step`); the `$`,
 * the thousands commas and the `%` are kept.
 *
 * One capsule for the whole app rather than a component per field: every
 * numeric input steps the same way today, without each page moving to a new
 * field. The value is written the way typing writes it (the native setter
 * and an `input` event), so a React-controlled field sees an ordinary change.
 * The top bar, popovers, Spotlight and the sidebar are left alone.
 */
import { useEffect, useRef, useState } from 'react'
import { NUMERIC, stepValue } from './numberStep'
import css from './numberStepper.module.css'

const SKIP = 'header[data-menubar], [data-radix-popper-content-wrapper], [data-spotlight], [data-sidebar], [cmdk-root]'

function isNumeric(el: Element | null): el is HTMLInputElement {
  return (
    el instanceof HTMLInputElement &&
    /^(text|number|)$/i.test(el.type) &&
    !el.readOnly &&
    !el.disabled &&
    el.closest(SKIP) == null &&
    NUMERIC.test(el.value.trim())
  )
}

function write(el: HTMLInputElement, v: string): void {
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  set?.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function step(el: HTMLInputElement, n: number): void {
  const v = stepValue(el.value, n, el.step)
  if (v != null) write(el, v)
}

export function NumberStepper() {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const cur = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const place = (el: HTMLInputElement) => {
      const r = el.getBoundingClientRect()
      setAt({ x: r.right - 62, y: r.top + r.height / 2 - 11 })
    }
    const onFocus = (e: FocusEvent) => {
      if (!isNumeric(e.target as Element)) return
      cur.current = e.target as HTMLInputElement
      place(cur.current)
    }
    const onBlur = (e: FocusEvent) => {
      if (e.target !== cur.current) return
      window.setTimeout(() => {
        if (document.activeElement !== cur.current) {
          cur.current = null
          setAt(null)
        }
      }, 120)
    }
    const onScroll = () => {
      if (cur.current) place(cur.current)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      const a = document.activeElement
      if (!isNumeric(a) || a.type === 'number') return
      e.preventDefault()
      step(a, (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1))
    }
    document.addEventListener('focusin', onFocus, true)
    document.addEventListener('focusout', onBlur, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('focusin', onFocus, true)
      document.removeEventListener('focusout', onBlur, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [])

  // Press to step, hold to repeat (after 380ms, every 60ms).
  const press = (dir: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault()
    const el = cur.current
    if (!el) return
    const k = dir * (e.shiftKey ? 10 : 1)
    step(el, k)
    let t = window.setTimeout(function again() {
      if (cur.current) step(cur.current, k)
      t = window.setTimeout(again, 60)
    }, 380)
    const stop = () => {
      window.clearTimeout(t)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointerup', stop)
  }

  // Drag the grip: one step per 4px, ⇧ ×10.
  const scrub = (e: React.PointerEvent<HTMLElement>) => {
    e.preventDefault()
    if (!cur.current) return
    const grip = e.currentTarget
    grip.setPointerCapture(e.pointerId)
    let lx = e.clientX
    const move = (m: PointerEvent) => {
      const d = Math.trunc((m.clientX - lx) / 4)
      if (d && cur.current) {
        step(cur.current, d * (m.shiftKey ? 10 : 1))
        lx += d * 4
      }
    }
    const up = () => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', up)
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', up)
  }

  if (!at) return null
  return (
    <div className={css.pad} style={{ left: at.x, top: at.y }} data-glass-surface="raised">
      <button type="button" tabIndex={-1} aria-label="Decrease" onPointerDown={press(-1)}>
        −
      </button>
      <i aria-hidden onPointerDown={scrub} />
      <button type="button" tabIndex={-1} aria-label="Increase" onPointerDown={press(1)}>
        +
      </button>
    </div>
  )
}
