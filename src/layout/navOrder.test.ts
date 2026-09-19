import { describe, expect, it } from 'vitest'
import { LIFECYCLE, NAV_ORDERS, navOrder, orderGroups, setNavOrder } from './navOrder'

const groups = ['Home', 'Trade', 'Portfolio', 'Risk', 'Review', 'Research'].map((label) => ({ label }))

describe('the sidebar order', () => {
  it('rests on the loop: Home, then the lifecycle chain', () => {
    // The design's resting state (shell-registry ORDERS): the spine IS the
    // dependency — research → size → trade → book → review.
    expect(orderGroups(groups, 'loop').map((g) => g.label)).toEqual([
      'Home',
      'Research',
      'Risk',
      'Trade',
      'Portfolio',
      'Review',
    ])
  })

  it('reach puts what is touched most closest, lifecycle positions unchanged', () => {
    expect(orderGroups(groups, 'reach').map((g) => g.label)).toEqual([
      'Home',
      'Trade',
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
