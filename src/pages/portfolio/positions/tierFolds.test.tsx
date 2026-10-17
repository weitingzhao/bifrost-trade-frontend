import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { refreshDevice } from '@/lib/device'
import { useBookFold, usePressureFold } from './tierFolds'

/** `?device=` keeps the forced tier here for the tab's session (lib/device). */
function setTier(tier: 'phone' | 'pad' | 'desk') {
  act(() => {
    sessionStorage.setItem('bifrost.device', tier)
    refreshDevice()
  })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/portfolio/positions']}>{children}</MemoryRouter>
)

afterEach(() => {
  sessionStorage.clear()
  act(() => refreshDevice())
})

describe('usePressureFold (Rev .163 §18.7 · §18.11)', () => {
  it('is open on the desk, as it always was', () => {
    setTier('desk')
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    expect(result.current[0]).toBe(true)
  })

  it('starts folded on a phone and on an iPad', () => {
    setTier('phone')
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    expect(result.current[0]).toBe(false)
    setTier('pad')
    expect(result.current[0]).toBe(false)
  })

  it('keeps each tier’s fold apart: opening it on the phone leaves the iPad and the desk as they were', () => {
    setTier('phone')
    const { result } = renderHook(() => usePressureFold(), { wrapper })
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    setTier('pad')
    expect(result.current[0]).toBe(false)
    setTier('desk')
    expect(result.current[0]).toBe(true)
    act(() => result.current[1](false))
    setTier('phone')
    expect(result.current[0]).toBe(true)
  })
})

describe('useBookFold (Rev .163)', () => {
  it('leaves the desk’s band uncontrolled: no open, no onOpenChange', () => {
    setTier('desk')
    const { result } = renderHook(() => useBookFold(), { wrapper })
    expect(result.current).toEqual({})
  })

  it('starts folded on a phone, and a reading can open it there', () => {
    setTier('phone')
    const { result } = renderHook(() => useBookFold(), { wrapper })
    expect(result.current.open).toBe(false)
    act(() => result.current.onOpenChange?.(true))
    expect(result.current.open).toBe(true)
    setTier('pad')
    expect(result.current.open).toBe(false)
  })
})
