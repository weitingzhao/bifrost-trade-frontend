import { describe, expect, it } from 'vitest'
import {
  feedMassiveCommonCapHash,
  normalizeCommonCapId,
  parseFeedMassiveCommonSvcFromHash,
  resolveCommonRowIdFromHash,
} from './commonTabUtils'

describe('commonTabUtils', () => {
  it('parses common svc hash', () => {
    expect(parseFeedMassiveCommonSvcFromHash('#feed-massive-common-svc-technical-indicators')).toBe(
      'technical-indicators',
    )
    expect(parseFeedMassiveCommonSvcFromHash('#feed-massive-common-svc-market-ops')).toBe('market-ops')
  })

  it('normalizes legacy option-page aliases', () => {
    expect(normalizeCommonCapId('feed-massive-svc-technical-indicators')).toBe('technical-indicators')
    expect(normalizeCommonCapId('feed-massive-tab-market-ops')).toBe('market-ops')
  })

  it('resolves row id from legacy hash without common prefix', () => {
    expect(resolveCommonRowIdFromHash('#feed-massive-tab-technical-indicators')).toBe('technical-indicators')
    expect(resolveCommonRowIdFromHash('feed-massive-svc-market-ops')).toBe('market-ops')
  })

  it('builds cap hash', () => {
    expect(feedMassiveCommonCapHash('technical-indicators')).toBe(
      '#feed-massive-common-svc-technical-indicators',
    )
  })
})
