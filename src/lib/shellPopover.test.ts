import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { omnibar, omnibarStore } from '@/lib/omnibar'
import { openShellPopover, useShellPopover } from './shellPopover'

describe('shell popovers — one at a time (design Rev .68 §1)', () => {
  afterEach(() => {
    act(() => omnibar.close())
    const { result } = renderHook(() => useShellPopover('book'))
    act(() => result.current[1](true))
    act(() => result.current[1](false))
  })

  it('opening one closes the other, as a menu bar does', () => {
    const book = renderHook(() => useShellPopover('book'))
    const control = renderHook(() => useShellPopover('control'))
    act(() => book.result.current[1](true))
    expect(book.result.current[0]).toBe(true)
    act(() => control.result.current[1](true))
    expect(book.result.current[0]).toBe(false)
    expect(control.result.current[0]).toBe(true)
  })

  it('a member closing that is not open leaves the open one alone', () => {
    const book = renderHook(() => useShellPopover('book'))
    const alerts = renderHook(() => useShellPopover('alerts'))
    act(() => alerts.result.current[1](true))
    act(() => book.result.current[1](false))
    expect(openShellPopover()).toBe('alerts')
  })

  it('the omnibar is the sixth member, both ways', () => {
    const user = renderHook(() => useShellPopover('user'))
    act(() => user.result.current[1](true))
    act(() => omnibar.open())
    expect(user.result.current[0]).toBe(false)
    act(() => user.result.current[1](true))
    expect(omnibarStore.getState().open).toBe(false)
  })
})
