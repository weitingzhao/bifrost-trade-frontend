import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalRound, inksOf, parseRoundsFromIndex, rampOf } from './design-nav-snapshot.mjs'

describe('canonicalRound', () => {
  it('maps OLDC to OLD (early round, partly overtaken by contract)', () => {
    assert.equal(canonicalRound('OLDC', 'Portfolio Positions.dc.html'), 'OLD')
  })

  it('keeps tags the app already stores', () => {
    assert.equal(canonicalRound('NEW'), 'NEW')
    assert.equal(canonicalRound('OLD'), 'OLD')
    assert.equal(canonicalRound('REDO'), 'REDO')
    assert.equal(canonicalRound('LAB'), 'LAB')
  })

  it('throws on a tag that is neither known nor aliased', () => {
    assert.throws(() => canonicalRound('WIP', 'Future Page.dc.html'), /Unknown Docs Index round tag 'WIP' on Future Page\.dc\.html/)
  })
})

describe('parseRoundsFromIndex', () => {
  const html = `
const NEW = ['本轮新建'], OLDC = ['早期轮次 · 部分被契约覆盖'], OLD = ['早期轮次 · 仍有效'];
const FILES = [
  ['Research Symbol', 'Research Symbol.dc.html', '/research/symbol', REDO, 'x'],
  ['Portfolio Positions', 'Portfolio Positions.dc.html', '/portfolio/positions', OLDC, 'x'],
  ['Trade Desk', 'Trade Desk.dc.html', '/trade/desk', OLD, 'x'],
];
`

  it('stores OLDC rows as OLD so the tracker keeps the OLD badge', () => {
    const rounds = parseRoundsFromIndex(html)
    assert.equal(rounds.get('Research Symbol.dc.html'), 'REDO')
    assert.equal(rounds.get('Portfolio Positions.dc.html'), 'OLD')
    assert.equal(rounds.get('Trade Desk.dc.html'), 'OLD')
  })

  it('does not swallow an unknown tag as null', () => {
    const bad = `['X', 'X.dc.html', '/x', WIP, 'no'],`
    assert.throws(() => parseRoundsFromIndex(bad), /Unknown Docs Index round tag 'WIP'/)
  })
})

describe('inksOf', () => {
  const dir = { profit: '#4ade80', loss: '#f87171', unrealized: '#fb923c', ticker: '#a3e635', contract: '#7dd3fc', instance: '#c084fc' }
  const R = { DIRECTION: { dark: dir, light: dir }, ACCENT: { dark: ['#a78bfa'], light: ['#6d28d9'] } }

  it('takes DIRECTION plus the accent for each theme', () => {
    const inks = inksOf(R)
    assert.equal(inks.dark.accent, '#a78bfa')
    assert.equal(inks.light.contract, '#7dd3fc')
  })

  it('fails on a hole rather than freezing a mirror that compares nothing', () => {
    const holed = { ...R, DIRECTION: { dark: { ...dir, ticker: undefined }, light: dir } }
    assert.throws(() => inksOf(holed), /dark\.ticker/)
  })
})

describe('rampOf', () => {
  const src = "const SK_VARS = ['--sk-ground', '--sk-surface', '--sk-accent'];"
  const R = { RAMP: { dark: ['#0a0b11', '#191d29'], light: ['#e9ebef', '#f4f5f8'] } }

  it('names each step by the SK_VARS entry it lands on', () => {
    const ramp = rampOf(R, src)
    assert.equal(ramp.dark['--sk-ground'], '#0a0b11')
    assert.equal(ramp.light['--sk-surface'], '#f4f5f8')
    assert.equal(Object.keys(ramp.dark).length, 2)
  })

  it('fails when the names cannot be found or a step is not a hex', () => {
    assert.throws(() => rampOf(R, 'const OTHER = []'), /SK_VARS/)
    assert.throws(() => rampOf({ RAMP: { dark: ['#0a0b11', 'transparent'], light: ['#e9ebef'] } }, src), /RAMP\.dark\[1\]/)
  })
})
