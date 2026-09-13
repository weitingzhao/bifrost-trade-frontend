import { describe, expect, it } from 'vitest'
import { initialSidebarOpen, SHELL_SIDEBAR_EXPAND_MIN_VIEWPORT } from './shellChrome'

describe('initialSidebarOpen', () => {
  it('lets the viewport decide when the reader has not', () => {
    expect(initialSidebarOpen('', 1600)).toBe(true)
    expect(initialSidebarOpen('', SHELL_SIDEBAR_EXPAND_MIN_VIEWPORT)).toBe(true)
    expect(initialSidebarOpen('', SHELL_SIDEBAR_EXPAND_MIN_VIEWPORT - 1)).toBe(false)
    expect(initialSidebarOpen('other=1; another=2', 1200)).toBe(false)
  })

  it('never overrides a choice the reader made', () => {
    // Expanding the rail on a narrow screen is a decision, and a decision
    // undone on the next reload was not honoured.
    expect(initialSidebarOpen('sidebar_state=true', 1000)).toBe(true)
    expect(initialSidebarOpen('sidebar_state=false', 2560)).toBe(false)
  })

  it('reads the cookie among others', () => {
    expect(initialSidebarOpen('a=1; sidebar_state=false; b=2', 2000)).toBe(false)
    expect(initialSidebarOpen('bifrost_sidebar_state=false', 2000)).toBe(true)
  })
})
