import { describe, expect, it } from 'vitest'
import {
  caseHeadline,
  caseMeta,
  categoryTagVariant,
  hasTradeRef,
  noteWhen,
  outcomeTone,
  ruleMeta,
  tabHint,
} from './playbookModel'

// Fixtures are invented — the DEV playbook store held zero rows when this
// page was walked (2026-09-18), so there was nothing real to copy anyway.

describe('tabHint', () => {
  it('says nothing until the active list has answered — no unread zeros', () => {
    expect(tabHint('rules', {})).toBeNull()
    expect(tabHint('notes', {})).toBeNull()
    expect(tabHint('cases', {})).toBeNull()
  })

  it('counts only active rules and keeps retired ones out of the claim', () => {
    const rules = [
      { id: 'a', title: 't', category: 'risk', body_md: 'b' },
      { id: 'b', title: 't', category: 'risk', body_md: 'b', active: false },
    ]
    expect(tabHint('rules', { rules })).toBe('1 active — retired ones keep their history')
  })

  it('reads the other tabs from their own lists', () => {
    expect(tabHint('notes', { notes: [] })).toBe('0 notes — observations not yet rules')
    expect(tabHint('cases', { cases: [{ id: 'c', lessons_md: 'x' }] })).toBe(
      '1 case studies — click to open lessons',
    )
    expect(tabHint('search', {})).toBe('searches rules and notes')
  })
})

describe('rule and note stamps', () => {
  it('stamps the design\u2019s added date from created_at, falling back to updated', () => {
    expect(ruleMeta({ created_at: '2026-08-12T08:00:00Z', updated_at: '2026-09-12T08:00:00Z' })).toBe(
      'added 2026-08-12',
    )
    expect(ruleMeta({ updated_at: '2026-09-12T08:00:00Z' })).toBe('updated 2026-09-12')
    expect(ruleMeta({})).toBeNull()
  })

  it('lands each category on the design\u2019s ink via an existing tag variant', () => {
    expect(categoryTagVariant('risk')).toBe('danger')
    expect(categoryTagVariant('sizing')).toBe('warning')
    expect(categoryTagVariant('entry')).toBe('info')
    expect(categoryTagVariant('exit')).toBe('info')
    expect(categoryTagVariant('hedge')).toBe('strategy')
    expect(categoryTagVariant('regime')).toBe('strategy')
    expect(categoryTagVariant('general')).toBe('neutral')
    expect(categoryTagVariant('whatever')).toBe('neutral')
  })

  it('reads today as a time and any other day as the date', () => {
    const now = '2026-09-18T20:00:00Z'
    expect(noteWhen('2026-09-18T08:55:12Z', now)).toBe('today 08:55Z')
    expect(noteWhen('2026-09-12T08:55:12Z', now)).toBe('2026-09-12')
    expect(noteWhen(undefined, now)).toBeNull()
  })
})

describe('cases', () => {
  it('tones LOSS as a loss and everything else — scratch included — as the book working', () => {
    expect(outcomeTone('LOSS −$999')).toBe('loss')
    expect(outcomeTone('WIN +$1')).toBe('win')
    expect(outcomeTone('SCRATCH −$12')).toBe('win')
    expect(outcomeTone(null)).toBe('win')
  })

  it('reads headline and lede out of the one field the case has', () => {
    const md = '## Gap through the short put\n\n- The crush never covers the gap.\n- **Rule** came from this.'
    expect(caseHeadline(md)).toEqual({
      title: 'Gap through the short put',
      lede: 'The crush never covers the gap. Rule came from this.',
    })
    expect(caseHeadline('  \n \n')).toEqual({ title: '(empty case)', lede: '' })
  })

  it('stamps the filing day and knows when a trade reference exists', () => {
    expect(caseMeta({ created_at: '2026-01-31T00:00:00Z' })).toBe('filed 2026-01-31')
    expect(caseMeta({})).toBeNull()
    expect(hasTradeRef({ trade_ref: { execution_id: 7 } })).toBe(true)
    expect(hasTradeRef({ trade_ref: {} })).toBe(false)
    expect(hasTradeRef({})).toBe(false)
  })
})
