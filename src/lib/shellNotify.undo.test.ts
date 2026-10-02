import { afterEach, describe, expect, it } from 'vitest'
import { clearUndo, notify, pushUndo, runUndo, toastStore, undoDepth, undoToast } from './shellNotify'

afterEach(() => {
  clearUndo()
  const t = toastStore.getState().toast
  if (t) undoToast({ ...t, undo: undefined })
})

describe('the page undo stack (§17.5)', () => {
  it('undoes the latest change first', () => {
    const log: string[] = []
    pushUndo('a', () => log.push('a'), 0)
    pushUndo('b', () => log.push('b'), 10_000)
    expect(runUndo()).toBe(true)
    expect(runUndo()).toBe(true)
    expect(runUndo()).toBe(false)
    expect(log).toEqual(['b', 'a'])
  })

  it('merges a run of typing in one field into one step', () => {
    const log: string[] = []
    pushUndo('plan:qty', () => log.push('first'), 0)
    pushUndo('plan:qty', () => log.push('second'), 1_000)
    pushUndo('plan:qty', () => log.push('third'), 2_400)
    expect(undoDepth()).toBe(1)
    runUndo()
    // The step keeps the snapshot taken before the run started.
    expect(log).toEqual(['first'])
  })

  it('starts a new step after 1.5s of quiet, or in another field', () => {
    pushUndo('plan:qty', () => undefined, 0)
    pushUndo('plan:qty', () => undefined, 1_600)
    pushUndo('plan:strike', () => undefined, 1_700)
    expect(undoDepth()).toBe(3)
  })

  it("takes the toast's Undo first while it is up", () => {
    const log: string[] = []
    pushUndo('plan:qty', () => log.push('edit'), 0)
    notify('Deleted draft', { undo: () => log.push('toast') })
    runUndo()
    expect(log).toEqual(['toast'])
    runUndo()
    expect(log).toEqual(['toast', 'edit'])
  })
})
