import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePersistedChoice } from './usePersistedChoice'
import { memoryStorage } from '@/test/memoryStorage'

const KEY = 'test-choice'
const ALLOWED = ['a', 'b'] as const

// The suite's localStorage is a partial mock; a full in-memory Storage keeps
// this test about the hook rather than about the mock.

describe('usePersistedChoice', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))

  it('starts from the fallback and remembers a change', () => {
    const { result } = renderHook(() => usePersistedChoice<'a' | 'b'>(KEY, 'a', ALLOWED))
    expect(result.current[0]).toBe('a')
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
    expect(localStorage.getItem(KEY)).toBe('b')
  })

  it('ignores a stored value that is no longer allowed', () => {
    localStorage.setItem(KEY, 'gone')
    const { result } = renderHook(() => usePersistedChoice<'a' | 'b'>(KEY, 'a', ALLOWED))
    expect(result.current[0]).toBe('a')
  })
})
