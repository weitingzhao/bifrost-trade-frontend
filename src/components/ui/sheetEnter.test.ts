/**
 * Enter confirms a sheet (design Rev .72 §5) — @bifrost/ui's `sheetEnter`,
 * which every DialogContent with presentation="sheet" runs on its keydown.
 * The package has no test runner; this app holds the behaviour it relies on.
 */
import { describe, expect, it, vi } from 'vitest'
import { sheetEnter } from '@bifrost/ui'

function sheet(): { dialog: HTMLElement; input: HTMLInputElement; cancel: HTMLButtonElement; primary: HTMLButtonElement } {
  document.body.innerHTML = `
    <div role="dialog" id="d">
      <input id="f" />
      <div data-slot="dialog-footer"><button id="c">Cancel</button><button id="p">Create</button></div>
    </div>`
  return {
    dialog: document.getElementById('d') as HTMLElement,
    input: document.getElementById('f') as HTMLInputElement,
    cancel: document.getElementById('c') as HTMLButtonElement,
    primary: document.getElementById('p') as HTMLButtonElement,
  }
}

/** Dispatch Enter from `at` and let the dialog's handler answer, as the component does. */
function enterFrom(at: HTMLElement, dialog: HTMLElement, init: KeyboardEventInit = {}): boolean {
  let acted = false
  const on = (e: KeyboardEvent) => {
    acted = sheetEnter(e, dialog)
  }
  dialog.addEventListener('keydown', on)
  at.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, ...init }))
  dialog.removeEventListener('keydown', on)
  return acted
}

describe('Enter confirms a sheet', () => {
  it('runs the rightmost footer button from a field', () => {
    const { dialog, input, primary } = sheet()
    const click = vi.fn()
    primary.addEventListener('click', click)
    expect(enterFrom(input, dialog)).toBe(true)
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('leaves Enter to a focused button, and does nothing for a disabled primary', () => {
    const { dialog, input, cancel, primary } = sheet()
    const click = vi.fn()
    primary.addEventListener('click', click)
    expect(enterFrom(cancel, dialog)).toBe(false)
    primary.disabled = true
    expect(enterFrom(input, dialog)).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })

  it('ignores Enter with a modifier', () => {
    const { dialog, input, primary } = sheet()
    const click = vi.fn()
    primary.addEventListener('click', click)
    expect(enterFrom(input, dialog, { shiftKey: true })).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })
})
