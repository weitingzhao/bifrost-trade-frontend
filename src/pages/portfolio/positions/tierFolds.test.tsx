import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSyncExternalStore, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { LayoutProvider, type Layout } from '@bifrost/ui'
import { useBookFold, usePressureFold } from './tierFolds'

const TALL = 1000
const SHORT = 820

/**
 * A layout class for the hook, pinned on the package's provider (D2): the
 * width class as given, the height class from the height in px.
 */
let cls: Pick<Layout, 'w' | 'h'> = { w: 'wide', h: 'tall' }
const subs = new Set<() => void>()
function setClass(w: 'compact' | 'expanded' | 'wide', h: number) {
  act(() => {
    cls = { w, h: h < 900 ? 'short' : 'tall' }
    subs.forEach((f) => f())
  })
}

function Pinned({ children }: { children: ReactNode }) {
  const override = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => cls,
  )
  return <LayoutProvider override={override}>{children}</LayoutProvider>
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/portfolio/positions']}>
    <Pinned>{children}</Pinned>
  </MemoryRouter>
)

afterEach(() => {
  sessionStorage.clear()
  cls = { w: 'wide', h: 'tall' }
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
