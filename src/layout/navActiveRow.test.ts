/**
 * Which row lights, and which row owns a page that has none.
 *
 * Both came out of cancelling the Objectives fold (Owner 2026-09-21, design
 * Rev 2026-09-20.1): once an objective had no menu row of its own, the
 * question "what lights while I stand here" had no answer, and chasing it
 * turned up a second page with the same problem for a different reason.
 */
import { describe, expect, it } from 'vitest'
import type { ShellNavItem } from '@bifrost/ui'
import { matchActiveRow, navRowFor } from './routeRegistry'

describe('navRowFor', () => {
  it('sends an objective to the Console, which is its roster', () => {
    // The menu does not carry objectives any more, so prefix matching finds
    // nothing and the whole tree would render dark.
    expect(navRowFor('/research/loop/objectives/obj-daily-loop-stock')).toBe(
      '/research/loop/harness',
    )
  })

  it('leaves every page that has a row of its own alone', () => {
    for (const p of ['/research/loop/harness', '/portfolio/ledger', '/risk', '/']) {
      expect(navRowFor(p)).toBe(p)
    }
  })

  it('does not claim a path that merely looks similar', () => {
    // `/research/loop/objectives` without an id is not an objective page.
    expect(navRowFor('/research/loop/objectives')).toBe('/research/loop/objectives')
  })
})

describe('matchActiveRow', () => {
  const pinRow: ShellNavItem = {
    id: 'pin:/research/loop/objectives/obj-a',
    label: 'Daily Loop',
    to: '/research/loop/objectives/obj-a',
  }
  const homeRow: ShellNavItem = { id: 'home:/research/loop/harness', label: 'Autopilot', to: '/research/loop/harness' }

  it('lights a pinned row by identity, not by path', () => {
    // The matcher reads `to` before `id`, and a pin row has both — so it
    // compared `pin:/x` against `/x` and matched nothing. Pinning a page made
    // the whole tree go dark on it, which is the opposite of a shortcut.
    expect(matchActiveRow(pinRow, 'pin:/research/loop/objectives/obj-a')).toBe(true)
  })

  it('leaves the home row dark while the pin is the one lit', () => {
    // Two lit rows for one page is the thing the `pin:` id exists to avoid.
    expect(matchActiveRow(homeRow, 'pin:/research/loop/objectives/obj-a')).toBe(false)
  })

  it('does not light a different pin', () => {
    expect(matchActiveRow(pinRow, 'pin:/portfolio/ledger')).toBe(false)
  })

  it('falls back to path matching when nothing is pinned', () => {
    expect(matchActiveRow(homeRow, '/research/loop/harness')).toBe(true)
    expect(matchActiveRow(homeRow, '/portfolio/ledger')).toBe(false)
  })

  it('still lights a parent through its children', () => {
    const parent: ShellNavItem = {
      id: 'home:/research/loop/harness',
      label: 'Autopilot',
      to: '/research/loop/harness',
      children: [{ id: '/research/loop/decisions', label: 'Decision Inbox', to: '/research/loop/decisions' }],
    }
    expect(matchActiveRow(parent, '/research/loop/decisions')).toBe(true)
  })
})
