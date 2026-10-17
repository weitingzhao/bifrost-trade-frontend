/**
 * One table cell, cloned into a row-detail sheet (`touchLayer.tsx`): it looks
 * like the cell, and its controls click the originals in the table.
 */
import { useLayoutEffect, useRef } from 'react'
import { CTL, pass } from './touchPass'
import css from './touchLayer.module.css'

/** Copy a cloned field's value onto the original and let its handlers hear it. */
function writeBack(original: HTMLElement, clone: HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement): void {
  if (original instanceof HTMLInputElement && clone instanceof HTMLInputElement && (clone.type === 'checkbox' || clone.type === 'radio')) {
    if (original.checked !== clone.checked) original.click()
    return
  }
  const proto = Object.getPrototypeOf(original) as object
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(original, clone.value)
  else (original as HTMLInputElement).value = clone.value
  original.dispatchEvent(new Event('input', { bubbles: true }))
  original.dispatchEvent(new Event('change', { bubbles: true }))
}

export function TouchCell({ td }: { td: Element }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    // The original can change while the sheet is open (a Decision picked in
    // the row, a reading that ticks): clone again whenever it does.
    const draw = () => {
      host.replaceChildren(...[...td.childNodes].map((n) => n.cloneNode(true)))
      host.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      // A clone carries the markup, not a field's current value: copy it over.
      const fields = 'select, input, textarea'
      const live = [...td.querySelectorAll<HTMLInputElement>(fields)]
      host.querySelectorAll<HTMLInputElement>(fields).forEach((c, i) => {
        const o = live[i]
        if (!o) return
        if (c.type === 'checkbox' || c.type === 'radio') c.checked = o.checked
        else c.value = o.value
      })
      const originals = [...td.querySelectorAll<HTMLElement>(CTL)]
      host.querySelectorAll<HTMLElement>(CTL).forEach((n, i) => {
        const o = originals[i]
        // A field is edited in place and its value written back to the original,
        // the way a person typing there would (React reads the native setter).
        if (n instanceof HTMLSelectElement || n instanceof HTMLInputElement || n instanceof HTMLTextAreaElement) {
          n.addEventListener('change', () => {
            if (!o || !o.isConnected) return
            writeBack(o, n)
          })
          return
        }
        n.addEventListener('click', (ev) => {
          ev.preventDefault()
          ev.stopPropagation()
          if (o && o.isConnected) pass(o)
        })
      })
    }
    draw()
    const mo = new MutationObserver(draw)
    mo.observe(td, { subtree: true, childList: true, characterData: true, attributes: true })
    return () => mo.disconnect()
  }, [td])
  return <div ref={ref} className={css.cell} />
}
