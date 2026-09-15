import { describe, expect, it, vi } from 'vitest'
import { stopMenuEscapeFromClosingDock } from './menuEscape'

describe('stopMenuEscapeFromClosingDock', () => {
  it('stops the event so the dock keybind on window never sees it', () => {
    const stopPropagation = vi.fn()
    stopMenuEscapeFromClosingDock({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })
})
