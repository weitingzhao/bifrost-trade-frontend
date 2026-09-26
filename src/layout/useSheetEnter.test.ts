import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSheetEnter } from './useSheetEnter'

function sheet(): { input: HTMLInputElement; cancel: HTMLButtonElement; primary: HTMLButtonElement } {
  document.body.innerHTML = `
    <div role="dialog">
      <input id="f" />
      <div data-slot="dialog-footer"><button id="c">Cancel</button><button id="p">Create</button></div>
    </div>`
  return {
    input: document.getElementById('f') as HTMLInputElement,
    cancel: document.getElementById('c') as HTMLButtonElement,
    primary: document.getElementById('p') as HTMLButtonElement,
  }
}

describe('Enter confirms a sheet (design Rev .72 §5)', () => {
  it('runs the rightmost footer button from a field', () => {
    renderHook(() => useSheetEnter())
    const { input, primary } = sheet()
    const click = vi.fn()
    primary.addEventListener('click', click)
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('leaves Enter to a focused button, and does nothing for a disabled primary', () => {
    renderHook(() => useSheetEnter())
    const { input, cancel, primary } = sheet()
    const click = vi.fn()
    primary.addEventListener('click', click)
    cancel.focus()
    cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    primary.disabled = true
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(click).not.toHaveBeenCalled()
  })
})
