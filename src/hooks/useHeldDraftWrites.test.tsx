// @vitest-environment jsdom
/**
 * Record answer (Owner 2026-10-04 #9) and Approve (batch 4 follow-up) wait
 * behind the toast like Dismiss:
 * nothing is sent until the toast leaves, Undo sends nothing, and when some of
 * a call's drafts land and some do not, the ones that did not stay on the card
 * with the reason.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, runUndo, toastStore, undoToast } from '@/lib/shellNotify'
import { clearDraftWriteFailures, draftWriteFailures } from '@/lib/harness/draftWriteFailures'

const approve = vi.fn()
const dismiss = vi.fn()
vi.mock('@/api/researchDrafts', async (orig) => ({
  ...(await orig<typeof import('@/api/researchDrafts')>()),
  approveResearchDraft: (id: string) => approve(id),
  dismissResearchDraft: (id: string) => dismiss(id),
}))

const { useHeldDraftWrites } = await import('./useResearchDrafts')

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  approve.mockReset()
  dismiss.mockReset()
  clearDraftWriteFailures(['v1', 'o1', 'x1', 'b1'])
})

describe('useHeldDraftWrites', () => {
  it('holds a Record answer: the drafts leave at once and Undo sends nothing', async () => {
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.record(['v1', 'o1'], 'Answer recorded'))
    expect(result.current.isHeld('v1')).toBe(true)
    expect(result.current.isHeld('o1')).toBe(true)
    expect(approve).not.toHaveBeenCalled()
    const toast = toastStore.getState().toast
    expect(toast?.msg).toBe('Answer recorded')
    act(() => undoToast(toast!))
    await act(flush)
    expect(approve).not.toHaveBeenCalled()
    expect(result.current.isHeld('v1')).toBe(false)
  })

  it('sends one approve per draft when the toast leaves, and reports what landed', async () => {
    approve.mockImplementation(async (id: string) => ({ draft: { id } }))
    const landed = vi.fn()
    const committed = vi.fn()
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.record(['v1', 'o1'], 'Answer recorded', { onLanded: landed, onCommitted: committed }))
    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    expect(approve.mock.calls.map((c) => c[0])).toEqual(['v1', 'o1'])
    expect(landed).toHaveBeenCalledTimes(2)
    expect(committed).toHaveBeenCalledWith(['v1', 'o1'])
  })

  it('keeps a draft whose write failed on its card, with the reason', async () => {
    approve.mockImplementation(async (id: string) => {
      if (id === 'o1') throw new Error('HTTP 500')
      return { draft: { id } }
    })
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.record(['v1', 'o1'], 'Answer recorded'))
    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    await act(flush)
    expect(draftWriteFailures().o1).toEqual({ verb: 'Record answer', message: 'HTTP 500' })
    expect(draftWriteFailures().v1).toBeUndefined()
    expect(result.current.isHeld('o1')).toBe(false)
  })

  it('holds Dismiss the same way', async () => {
    dismiss.mockResolvedValue({ draft: { id: 'x1' } })
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.dismiss('x1'))
    expect(dismiss).not.toHaveBeenCalled()
    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    expect(dismiss).toHaveBeenCalledWith('x1')
  })

  it('holds an Approve: nothing is sent while the toast is up, ⌘Z sends nothing', async () => {
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.approve('b1', 'Approved b1 → Pool', { alsoHide: ['b0'] }))
    // The card and the earlier run it covers leave together.
    expect(result.current.isHeld('b1')).toBe(true)
    expect(result.current.isHeld('b0')).toBe(true)
    expect(toastStore.getState().toast?.msg).toBe('Approved b1 → Pool')
    expect(approve).not.toHaveBeenCalled()
    act(() => {
      expect(runUndo()).toBe(true)
    })
    await act(flush)
    expect(approve).not.toHaveBeenCalled()
    expect(result.current.isHeld('b1')).toBe(false)
    expect(result.current.isHeld('b0')).toBe(false)
  })

  it('sends the Approve when the toast leaves — only for the answered draft, not the ones it hid', async () => {
    approve.mockImplementation(async (id: string) => ({ draft: { id } }))
    const landed = vi.fn()
    const committed = vi.fn()
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.approve('b1', 'Approved', { alsoHide: ['b0'], onLanded: landed, onCommitted: committed }))
    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    expect(approve.mock.calls.map((c) => c[0])).toEqual(['b1'])
    expect(landed).toHaveBeenCalledWith({ draft: { id: 'b1' } })
    expect(committed).toHaveBeenCalledWith(['b1'])
  })

  it('a failed Approve comes back on its card with the reason', async () => {
    approve.mockRejectedValue(new Error('HTTP 409'))
    const committed = vi.fn()
    const { result } = renderHook(() => useHeldDraftWrites())
    act(() => result.current.approve('b1', 'Approved', { onCommitted: committed }))
    act(() => dismissToast(toastStore.getState().toast!.id))
    await act(flush)
    await act(flush)
    expect(draftWriteFailures().b1).toEqual({ verb: 'Approve', message: 'HTTP 409' })
    expect(result.current.isHeld('b1')).toBe(false)
    expect(committed).not.toHaveBeenCalled()
    expect(toastStore.getState().toast?.msg).toBe('Approve did not save — HTTP 409')
  })
})
