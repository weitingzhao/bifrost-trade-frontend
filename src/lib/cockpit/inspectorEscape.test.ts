import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  closeTopInspector,
  inspectorEscapeDepth,
  registerInspectorEscape,
} from './inspectorEscape'

afterEach(() => {
  while (closeTopInspector()) {
    /* drain, so one test's leak is not the next test's bug */
  }
})

describe('inspector escape', () => {
  it('says when there was nothing to close', () => {
    expect(closeTopInspector()).toBe(false)
  })

  it('closes the one opened last', () => {
    const first = vi.fn()
    const second = vi.fn()
    registerInspectorEscape(first)
    registerInspectorEscape(second)

    expect(closeTopInspector()).toBe(true)
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()

    expect(closeTopInspector()).toBe(true)
    expect(first).toHaveBeenCalledOnce()
    expect(closeTopInspector()).toBe(false)
  })

  it('forgets an inspector that closed on its own', () => {
    const close = vi.fn()
    const done = registerInspectorEscape(close)
    done()
    expect(inspectorEscapeDepth()).toBe(0)
    expect(closeTopInspector()).toBe(false)
    expect(close).not.toHaveBeenCalled()
  })

  it('unregisters the right one when two panels share a handler', () => {
    const shared = vi.fn()
    const a = registerInspectorEscape(shared)
    registerInspectorEscape(shared)
    a()
    expect(inspectorEscapeDepth()).toBe(1)
  })
})
