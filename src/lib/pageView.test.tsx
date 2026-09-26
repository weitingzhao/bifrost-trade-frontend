/**
 * A page's view, kept per route for the tab's session: restored on the way
 * back, never over a link that carries its own.
 */
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation, useSearchParams } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { pageViewKey, pickParams, readPageView, usePageViewParams, usePageViewState } from './pageView'

beforeEach(() => sessionStorage.clear())

const at = (url: string) =>
  function Wrap({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  }

describe('the key', () => {
  it('is the path and the hash, not the query — the query is the view', () => {
    expect(pageViewKey({ pathname: '/trade/fills', hash: '' })).toBe('bifrost.view:/trade/fills')
    expect(pageViewKey({ pathname: '/review', hash: '#queue?x=1' })).toBe('bifrost.view:/review#queue')
  })

  it('picks only the params a page keeps, and only those set', () => {
    expect(pickParams(new URLSearchParams('acct=U1&day=2026-09-22&other=1'), ['acct', 'day', 'sel'])).toEqual({
      acct: 'U1',
      day: '2026-09-22',
    })
  })
})

describe('usePageViewState', () => {
  it('starts from the initial value, keeps each change, and starts from it next time', () => {
    const a = renderHook(() => usePageViewState('sort', 'ticker'), { wrapper: at('/research/screener') })
    expect(a.result.current[0]).toBe('ticker')
    act(() => a.result.current[1]('score'))
    expect(readPageView('bifrost.view:/research/screener').sort).toBe('score')
    a.unmount()
    const b = renderHook(() => usePageViewState('sort', 'ticker'), { wrapper: at('/research/screener') })
    expect(b.result.current[0]).toBe('score')
  })

  it('keeps each route to itself', () => {
    const a = renderHook(() => usePageViewState('sort', 'ticker'), { wrapper: at('/research/screener') })
    act(() => a.result.current[1]('score'))
    const b = renderHook(() => usePageViewState('sort', 'ticker'), { wrapper: at('/research/ratings') })
    expect(b.result.current[0]).toBe('ticker')
  })
})

describe('usePageViewParams', () => {
  const useBoth = () => {
    usePageViewParams(['acct', 'day'])
    return useLocation()
  }

  it('restores the last params when the page is reached without any', async () => {
    const a = renderHook(useBoth, { wrapper: at('/trade/fills?acct=U1&day=2026-09-22') })
    a.unmount()
    const b = renderHook(useBoth, { wrapper: at('/trade/fills') })
    await act(async () => {})
    expect(new URLSearchParams(b.result.current.search).get('acct')).toBe('U1')
    expect(new URLSearchParams(b.result.current.search).get('day')).toBe('2026-09-22')
  })

  it('lets a link that carries its own params win', async () => {
    const a = renderHook(useBoth, { wrapper: at('/trade/fills?acct=U1') })
    a.unmount()
    const b = renderHook(useBoth, { wrapper: at('/trade/fills?acct=U2') })
    await act(async () => {})
    expect(new URLSearchParams(b.result.current.search).get('acct')).toBe('U2')
  })

  it('forgets a view cleared back to none, so the next visit starts plain', async () => {
    const useClear = () => {
      usePageViewParams(['acct', 'day'])
      const [, setParams] = useSearchParams()
      return { loc: useLocation(), setParams }
    }
    const a = renderHook(useClear, { wrapper: at('/trade/fills?acct=U1') })
    await act(async () => a.result.current.setParams({}, { replace: true }))
    expect(readPageView('bifrost.view:/trade/fills').__params).toEqual({})
    a.unmount()
    const b = renderHook(useClear, { wrapper: at('/trade/fills') })
    await act(async () => {})
    expect(b.result.current.loc.search).toBe('')
  })
})
