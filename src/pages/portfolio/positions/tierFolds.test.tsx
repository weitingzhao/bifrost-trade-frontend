import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { refreshDevice } from '@/lib/device'
import { useBookFold, usePressureFold } from './tierFolds'

const TALL = 1000
const SHORT = 820
const innerHeight0 = window.innerHeight

/**
 * A layout class for the hook: `?layout=` keeps the width class for the tab's
 * session (lib/device); the height class is the window's own.
 */
function setClass(w: 'compact' | 'expanded' | 'wide', h: number) {
  act(() => {
    sessionStorage.setItem('bifrost.layout', w)
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: h })
    refreshDevice()
  })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/portfolio/positions']}>{children}</MemoryRouter>
)

afterEach(() => {
  sessionStorage.clear()
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: innerHeight0 })
  act(() => refreshDevice())
})

describe('usePressureFold (Rev .164 §18.7 · §18.11)', () => {
  it('is open on a tall screen above compact, as it always was — the desk, and an iPad Pro 13″ upright', () => {
    setClass('wide', TALL)
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    expect(result.current[0]).toBe(true)
    setClass('expanded', TALL)
    expect(result.current[0]).toBe(true)
  })

  it('starts folded on compact and on a short screen', () => {
    setClass('compact', TALL)
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    expect(result.current[0]).toBe(false)
    setClass('expanded', SHORT)
    expect(result.current[0]).toBe(false)
    // A short laptop on the desk is short too.
    setClass('wide', SHORT)
    expect(result.current[0]).toBe(false)
  })

  it('keeps each class’s fold apart: opening it on compact leaves short and tall as they were', () => {
    setClass('compact', TALL)
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    setClass('expanded', SHORT)
    expect(result.current[0]).toBe(false)
    setClass('wide', TALL)
    expect(result.current[0]).toBe(true)
    act(() => result.current[1](false))
    setClass('compact', TALL)
    expect(result.current[0]).toBe(true)
  })
})

describe('useBookFold (Rev .164)', () => {
  it('leaves a tall screen’s band uncontrolled: no open, no onOpenChange', () => {
    setClass('wide', TALL)
    const { result } = renderHook(() => useBookFold(), { wrapper })
    expect(result.current).toEqual({})
  })

  it('starts folded on compact, and a reading can open it there', () => {
    setClass('compact', TALL)
    const { result } = renderHook(() => useBookFold(), { wrapper })
    expect(result.current.open).toBe(false)
    act(() => result.current.onOpenChange?.(true))
    expect(result.current.open).toBe(true)
    setClass('expanded', SHORT)
    expect(result.current.open).toBe(false)
  })
})
