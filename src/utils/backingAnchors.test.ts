import { describe, it, expect } from 'vitest'
import {
  BACKING_ANCHOR_ID,
  BACKING_TARGET_ANCHOR,
  backingAnchorId,
  backingHref,
  isBackingTarget,
} from './backingAnchors'

describe('backingAnchorId', () => {
  it('maps every hash to its DOM id, with or without the #', () => {
    expect(backingAnchorId('#obligations')).toBe(BACKING_ANCHOR_ID.obligations)
    expect(backingAnchorId('holdings')).toBe('backing-holdings')
    expect(backingAnchorId('#room')).toBe('backing-room')
    expect(backingAnchorId('#model')).toBe('backing-model')
  })
  it('returns null for an unknown or empty hash, including prototype names', () => {
    expect(backingAnchorId('')).toBeNull()
    expect(backingAnchorId('#')).toBeNull()
    expect(backingAnchorId('#capital')).toBeNull()
    expect(backingAnchorId('#toString')).toBeNull()
  })
})

describe('targets', () => {
  it('every cockpit target that lands on Backing has an anchor the page knows', () => {
    for (const anchor of Object.values(BACKING_TARGET_ANCHOR)) {
      expect(backingAnchorId(anchor)).not.toBeNull()
    }
    expect(BACKING_TARGET_ANCHOR.capital).toBe('model')
  })
  it('isBackingTarget narrows the alarm targets that stay on Positions out', () => {
    expect(isBackingTarget('coverage')).toBe(true)
    expect(isBackingTarget('capital')).toBe(true)
    expect(isBackingTarget('ladder')).toBe(false)
    expect(isBackingTarget('margin')).toBe(false)
    expect(isBackingTarget('constructor')).toBe(false)
  })
})

describe('backingHref', () => {
  it('is the bare path when there is nothing to carry', () => {
    expect(backingHref()).toBe('/portfolio/backing')
    expect(backingHref({ scopeSearch: '' })).toBe('/portfolio/backing')
  })
  it('composes scope, sort, symbol and anchor', () => {
    expect(backingHref({ scopeSearch: 'acct=host&expiry=202611', sort: 'cash', anchor: 'obligations' })).toBe(
      '/portfolio/backing?acct=host&expiry=202611&sort=cash#obligations',
    )
    expect(backingHref({ scopeSearch: 'acct=host', symbol: 'nvda', anchor: 'model' })).toBe(
      '/portfolio/backing?acct=host&symbol=NVDA#model',
    )
  })
  it('a symbol deep link overrides the symbol already in the scope — one key, never two', () => {
    expect(backingHref({ scopeSearch: 'symbol=GOOG', symbol: 'NVDA', anchor: 'model' })).toBe(
      '/portfolio/backing?symbol=NVDA#model',
    )
  })
})
