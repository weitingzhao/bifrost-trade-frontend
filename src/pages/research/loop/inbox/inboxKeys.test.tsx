// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inboxKeyAction, useInboxKeys, type InboxKeyEvent, type InboxKeyState } from './inboxKeys'

const ORDER = ['call:a', 'pool:b', 'draft:c']

function ev(key: string, over: Partial<InboxKeyEvent> = {}): InboxKeyEvent {
  return { key, metaKey: false, ctrlKey: false, altKey: false, target: document.body, defaultPrevented: false, ...over }
}

function st(over: Partial<InboxKeyState> = {}): InboxKeyState {
  return { order: ORDER, cur: '', openId: 'call:a', isCall: (id) => id.startsWith('call:'), hovered: null, active: document.body, ...over }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('inboxKeyAction (Rev .144)', () => {
  it('J / K walk the pending cards, starting from the open one', () => {
    expect(inboxKeyAction(ev('j'), st())).toEqual({ type: 'move', to: 'pool:b' })
    expect(inboxKeyAction(ev('k'), st({ cur: 'pool:b' }))).toEqual({ type: 'move', to: 'call:a' })
    expect(inboxKeyAction(ev('j'), st({ cur: 'draft:c' }))).toEqual({ type: 'move', to: 'draft:c' })
    // The prototype lowercases, so Shift+J moves too.
    expect(inboxKeyAction(ev('J'), st())).toEqual({ type: 'move', to: 'pool:b' })
  })

  it('A approves an open card, only opens a folded one, and records a folded call', () => {
    expect(inboxKeyAction(ev('a'), st({ cur: 'pool:b', openId: 'pool:b' }))).toEqual({ type: 'approve', id: 'pool:b' })
    expect(inboxKeyAction(ev('a'), st({ cur: 'pool:b', openId: '' }))).toEqual({ type: 'open-to-approve', id: 'pool:b' })
    expect(inboxKeyAction(ev('a'), st({ cur: 'call:a', openId: '' }))).toEqual({ type: 'approve', id: 'call:a' })
    expect(inboxKeyAction(ev('d'), st({ cur: 'draft:c' }))).toEqual({ type: 'dismiss', id: 'draft:c' })
  })

  it('answers nothing with a modifier, in a text field, in a dialog, or on an empty queue', () => {
    expect(inboxKeyAction(ev('j', { metaKey: true }), st())).toBeNull()
    expect(inboxKeyAction(ev('d', { ctrlKey: true }), st())).toBeNull()
    expect(inboxKeyAction(ev('a', { altKey: true }), st())).toBeNull()
    const input = document.createElement('input')
    document.body.append(input)
    expect(inboxKeyAction(ev('j', { target: input }), st())).toBeNull()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const inside = document.createElement('span')
    dialog.append(inside)
    document.body.append(dialog)
    expect(inboxKeyAction(ev('d', { target: inside }), st())).toBeNull()
    expect(inboxKeyAction(ev('j'), st({ order: [] }))).toBeNull()
  })

  it('Space folds the cursor card, and gives way to buttons and to Quick Look', () => {
    expect(inboxKeyAction(ev(' '), st())).toEqual({ type: 'toggle', id: 'call:a' })
    const btn = document.createElement('button')
    document.body.append(btn)
    expect(inboxKeyAction(ev(' ', { target: btn }), st())).toBeNull()
    const handle = document.createElement('span')
    handle.setAttribute('role', 'button')
    document.body.append(handle)
    expect(inboxKeyAction(ev(' ', { target: handle }), st())).toBeNull()
    // Quick Look took the key already.
    expect(inboxKeyAction(ev(' ', { defaultPrevented: true }), st())).toBeNull()
    // A candidate row under the pointer, or a marked ticker: Quick Look's.
    const table = document.createElement('table')
    table.innerHTML = '<tbody><tr><td><span>ABC</span></td></tr></tbody>'
    document.body.append(table)
    expect(inboxKeyAction(ev(' '), st({ hovered: table.querySelector('span') }))).toBeNull()
    const sym = document.createElement('span')
    sym.setAttribute('data-ctx-sym', 'ABC')
    document.body.append(sym)
    expect(inboxKeyAction(ev(' '), st({ hovered: sym }))).toBeNull()
  })
})

function Keys({ enabled, onAction }: { enabled: boolean; onAction: (a: unknown) => void }) {
  useInboxKeys({ enabled, order: ORDER, cur: '', openId: 'call:a', isCall: () => false, onAction })
  return null
}

describe('useInboxKeys', () => {
  it('binds nothing when the Inbox is not the route page', () => {
    const onAction = vi.fn()
    render(<Keys enabled={false} onAction={onAction} />)
    const e = new KeyboardEvent('keydown', { key: 'd', cancelable: true })
    window.dispatchEvent(e)
    expect(onAction).not.toHaveBeenCalled()
    expect(e.defaultPrevented).toBe(false)
  })

  it('takes J with preventDefault, so the Symbol list does not walk too', () => {
    const onAction = vi.fn()
    render(<Keys enabled onAction={onAction} />)
    const e = new KeyboardEvent('keydown', { key: 'j', cancelable: true })
    window.dispatchEvent(e)
    expect(onAction).toHaveBeenCalledWith({ type: 'move', to: 'pool:b' })
    expect(e.defaultPrevented).toBe(true)
  })

  it('is enabled by the page only outside a surface (Owner 2026-10-04 #13)', () => {
    const src = readFileSync('src/pages/research/loop/DecisionInboxPage.tsx', 'utf8')
    expect(src).toMatch(/useInboxKeys\(\{\s*enabled: !inSurface && showDecisions/)
  })
})
