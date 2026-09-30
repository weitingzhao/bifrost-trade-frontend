import { describe, expect, it } from 'vitest'
import { LIFECYCLE, NAV_ORDERS, navOrder, orderGroups, setNavOrder } from './navOrder'
import { NAV_GROUPS } from './navConfig'
import { LAYER_OF_GROUP } from '@/lib/design/layers'

// The real groups, not a hand-written list: a list written here kept saying
// 'Trade' after the menu was renamed Trading (Rev .111), so the tests stayed
// green while the sidebar lost Trading's numeral, its layer highlight and its
// place in the order.
const groups = NAV_GROUPS.map((g) => ({ label: g.label }))

describe('every sidebar group is known by name to the tables keyed on it', () => {
  it('has a lifecycle numeral, a place in both orders and a layer', () => {
    for (const { label } of groups) {
      if (label === 'Home') continue
      expect(LIFECYCLE[label], label).toBeTypeOf('number')
      expect(NAV_ORDERS.loop, label).toContain(label)
      expect(NAV_ORDERS.reach, label).toContain(label)
      expect(LAYER_OF_GROUP[label], label).toBeTypeOf('string')
    }
  })
})

describe('the sidebar order', () => {
  it('rests on the loop: Home, then the lifecycle chain', () => {
    // The design's resting state (shell-registry ORDERS): the spine IS the
    // dependency — research → size → trade → book → review.
    expect(orderGroups(groups, 'loop').map((g) => g.label)).toEqual([
      'Home',
      'Research',
      'Risk',
      'Trading',
      'Portfolio',
      'Review',
    ])
  })

  it('reach puts what is touched most closest, lifecycle positions unchanged', () => {
    expect(orderGroups(groups, 'reach').map((g) => g.label)).toEqual([
      'Home',
      'Trading',
      'Portfolio',
      'Research',
      'Risk',
      'Review',
    ])
    // The numerals never re-number: out of sequence is the information.
    expect(NAV_ORDERS.reach.map((l) => LIFECYCLE[l])).toEqual([3, 4, 1, 2, 5])
  })

  it('keeps a group it does not know at the end instead of dropping it', () => {
    const withStranger = [...groups, { label: 'Stranger' }]
    expect(orderGroups(withStranger, 'loop').map((g) => g.label)).toContain('Stranger')
  })

  it('defaults to loop and persists a switch', () => {
    expect(navOrder()).toBe('loop')
    setNavOrder('reach')
    expect(navOrder()).toBe('reach')
    setNavOrder('loop')
    expect(navOrder()).toBe('loop')
  })
})
