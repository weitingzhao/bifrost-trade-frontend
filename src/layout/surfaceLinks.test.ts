import { describe, expect, it } from 'vitest'
import { equipmentTarget } from './surfaceLinks'

const O = 'http://127.0.0.1:5173'

describe('equipmentTarget — which links stay inside a surface', () => {
  it('keeps an equipment route in place', () => {
    expect(equipmentTarget(`${O}/research/loop/decisions`, O)).toBe('/research/loop/decisions')
    expect(equipmentTarget('/research/watchlist', O)).toBe('/research/watchlist')
  })

  it('hands a spine route to the frame', () => {
    expect(equipmentTarget(`${O}/portfolio/positions`, O)).toBeNull()
    expect(equipmentTarget(`${O}/research/symbol`, O)).toBeNull()
  })

  it('hands a link with a query or hash to the frame — the page reads them from the URL', () => {
    expect(equipmentTarget(`${O}/research/loop/harness?run=abc`, O)).toBeNull()
    expect(equipmentTarget(`${O}/research/loop/candidates#x`, O)).toBeNull()
  })

  it('never touches another origin', () => {
    expect(equipmentTarget('https://ops/research/watchlist', O)).toBeNull()
  })
})
