import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalRound, parseRoundsFromIndex } from './design-nav-snapshot.mjs'

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
