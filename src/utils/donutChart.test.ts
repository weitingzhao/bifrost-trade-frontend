import { describe, it, expect } from 'vitest'
import { assignColor, buildAssetMixSegments, buildSymbolDonutSegments } from './donutChart'

describe('assignColor', () => {
  it('cycles through palette', () => {
    const c0 = assignColor(0)
    const c12 = assignColor(12)
    expect(c0).toBe(c12)
    expect(assignColor(1)).not.toBe(c0)
  })
})

describe('buildAssetMixSegments', () => {
  it('builds segments from positions', () => {
    const stocks = [
      { position: 10, price: 100, avgCost: 90, category: 'Tech' },
      { position: 5, price: 50, avgCost: 45, category: 'Fixed Income' },
      { position: 20, price: 10, avgCost: 10, category: 'Money Market' },
    ] as any[]
    const options = [
      { position: -2, price: 5, avgCost: 3 },
    ] as any[]

    const segs = buildAssetMixSegments(stocks, options, 5000)
    expect(segs.length).toBeGreaterThanOrEqual(3)

    const stock = segs.find((s) => s.label === 'Stock')
    expect(stock).toBeDefined()
    expect(stock!.value).toBe(1000)

    const fi = segs.find((s) => s.label === 'Fixed Income')
    expect(fi).toBeDefined()
    expect(fi!.value).toBe(250)
  })

  it('handles empty inputs', () => {
    const segs = buildAssetMixSegments([], [], 0)
    expect(segs).toHaveLength(0)
  })
})

describe('buildSymbolDonutSegments', () => {
  it('groups by symbol sorted by market value', () => {
    const stocks = [
      { symbol: 'AAPL', position: 10, price: 150, avgCost: 130 },
      { symbol: 'AAPL', position: 5, price: 150, avgCost: 130 },
      { symbol: 'NVDA', position: 2, price: 900, avgCost: 800 },
    ] as any[]

    const segs = buildSymbolDonutSegments(stocks)
    expect(segs).toHaveLength(2)
    expect(segs[0].label).toBe('AAPL')
    expect(segs[0].value).toBe(2250)
    expect(segs[1].label).toBe('NVDA')
    expect(segs[1].value).toBe(1800)
  })
})
