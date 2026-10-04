// @vitest-environment jsdom
/**
 * Record answer waits behind the toast like Dismiss (Owner 2026-10-04 #9):
 * nothing is sent until the toast leaves, Undo sends nothing, and when some of
 * a call's drafts land and some do not, the ones that did not stay on the card
 * with the reason.
 */
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissToast, toastStore, undoToast } from '@/lib/shellNotify'
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
  clearDraftWriteFailures(['v1', 'o1', 'x1'])
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
})
