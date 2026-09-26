/**
 * The held write behind a toast's Undo: it goes out exactly once when the
 * toast leaves without Undo, and never when Undo is pressed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, notify, notifyHeld, toastStore, undoToast } from './shellNotify'

afterEach(() => {
  const t = toastStore.getState().toast
  if (t) dismissToast(t.id)
})

describe('notifyHeld', () => {
  it('writes once when the toast times out', () => {
    const commit = vi.fn()
    const undo = vi.fn()
    notifyHeld('Dropped', { commit, undo })
    const t = toastStore.getState().toast!
    expect(commit).not.toHaveBeenCalled()
    dismissToast(t.id)
    dismissToast(t.id)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(undo).not.toHaveBeenCalled()
  })

  it('never writes when Undo is pressed, and puts things back', () => {
    const commit = vi.fn()
    const undo = vi.fn()
    notifyHeld('Dropped', { commit, undo })
    const t = toastStore.getState().toast!
    undoToast(t)
    dismissToast(t.id)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
    expect(toastStore.getState().toast).toBeNull()
  })

  it('writes at once when the next toast replaces it, since its Undo is gone', () => {
    const commit = vi.fn()
    notifyHeld('Dropped', { commit, undo: () => {} })
    notify('Something else')
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('writes when the tab goes away', () => {
    const commit = vi.fn()
    notifyHeld('Dropped', { commit, undo: () => {} })
    window.dispatchEvent(new Event('pagehide'))
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
