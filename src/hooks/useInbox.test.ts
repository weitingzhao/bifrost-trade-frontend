import { describe, expect, it } from 'vitest'
import { inboxSummary, type InboxGroup, type InboxItem, type InboxLamp } from './useInbox'

function item(id: string, lamp: InboxLamp): InboxItem {
  return { id, title: id, when: '2026-09-12', lamp }
}

function group(
  id: InboxGroup['id'],
  state: InboxGroup['state'],
  items: InboxItem[] = [],
): InboxGroup {
  return { id, title: id === 'alerts' ? 'Analyze alerts' : id, source: 'x', state, items }
}

describe('inboxSummary', () => {
  it('reports nothing waiting when every source answered and none had anything', () => {
    const s = inboxSummary([group('alerts', 'ready'), group('system', 'ready'), group('platform', 'ready')])
    expect(s).toMatchObject({ count: 0, incomplete: false, checking: false, worst: null })
    expect(s.unreachable).toEqual([])
  })

  it('never reads as all-clear when a source could not be reached', () => {
    // The whole reason this is a function. A zero count plus a dead source is
    // not the same fact as a zero count, and the bell has to be able to tell
    // them apart — otherwise it goes quiet exactly when it should not.
    const s = inboxSummary([group('alerts', 'unavailable'), group('system', 'ready'), group('platform', 'ready')])
    expect(s.count).toBe(0)
    expect(s.incomplete).toBe(true)
    expect(s.unreachable).toEqual(['Analyze alerts'])
  })

  it('keeps counting what it does know while another source is dark', () => {
    const s = inboxSummary([
      group('alerts', 'unavailable'),
      group('system', 'ready', [item('a', 'red')]),
      group('platform', 'ready', [item('b', 'yellow')]),
    ])
    expect(s.count).toBe(2)
    expect(s.incomplete).toBe(true)
  })

  it('tints the badge by the worst thing in it, across groups', () => {
    expect(
      inboxSummary([
        group('alerts', 'ready', [item('a', 'yellow')]),
        group('system', 'ready', [item('b', 'red')]),
      ]).worst,
    ).toBe('red')
    expect(
      inboxSummary([
        group('alerts', 'ready', [item('a', 'gray')]),
        group('system', 'ready', [item('b', 'yellow')]),
      ]).worst,
    ).toBe('yellow')
  })

  it('is only "checking" while nothing is known at all', () => {
    expect(inboxSummary([group('alerts', 'checking'), group('system', 'ready')]).checking).toBe(true)
    // Something already arrived, so the bell has a number to show; a source
    // still loading does not make that number provisional the way an
    // unreachable one does.
    expect(
      inboxSummary([group('alerts', 'checking'), group('system', 'ready', [item('a', 'red')])]).checking,
    ).toBe(false)
  })
})
