/**
 * The Journal's day is New York's (Owner 2026-10-04), and the Calendar's
 * Decisions layer dates the same artifacts the same way — so its «Open the
 * day in Journal» lands on the day it was clicked from. Fixtures invented.
 */
import { describe, expect, it } from 'vitest'
import type { AiDraft } from '@/api/researchDrafts'
import type { Hypothesis } from '@/api/researchHypothesis'
import { decisionItems } from '@/lib/calendar/decisionsLayer'
import { journalDays, journalNodes } from './journalModel'
import { groupByDay } from './NotesView'
import type { JournalNote } from '@/api/research/journal'

// 20:30 EDT on Thu 10 Sep — already Fri 11 Sep in UTC.
const EVENING = '2026-09-11T00:30:00+00:00'

const draft = {
  id: 'drf-evening',
  kind: 'policy_suggestion',
  scope: 'objective:obj-test',
  status: 'approved',
  generated_by: 'weekly_policy_review',
  linked_action_id: null,
  created_at: EVENING,
  expires_at: null,
  payload: { suggestion: { layers: { sepa: { min_score: 78 } } } },
} as unknown as AiDraft

const hypothesis = {
  id: 'hyp-evening',
  title: 'A made-up thesis',
  thesis: 'Invented for the test.',
  symbols: ['AAA'],
  tags: [],
  status: 'active',
  origin_page: 'hypotheses',
  origin_ref: null,
  linked_opportunity_ids: [],
  linked_backtest_ids: [],
  conclusion: null,
  resolution_json: null,
  retired_at: null,
  created_at: EVENING,
  updated_at: EVENING,
} as unknown as Hypothesis

function nodes() {
  return journalNodes(
    { runs: [], candidates: [], hypotheses: [hypothesis], drafts: [draft], outcomes: [] },
    () => [],
  )
}

describe('the Journal files by the New York day', () => {
  it('keeps an evening artifact on its own trading day', () => {
    const ns = nodes()
    expect(ns.map((n) => n.day)).toEqual(['2026-09-10', '2026-09-10'])
    expect(journalDays(ns)).toEqual(['2026-09-10'])
  })

  it('groups notes by the same day', () => {
    const note = { id: 'n1', body_md: 'x', refs: [], created_at: EVENING } as unknown as JournalNote
    expect(groupByDay([note]).map(([d]) => d)).toEqual(['2026-09-10'])
  })

  it('sends the Calendar’s Decisions link to the day the Journal files it under', () => {
    const items = decisionItems([draft], [hypothesis])
    const journalDay = new Set(nodes().map((n) => n.day))
    for (const it of items) {
      expect(it.d).toBe('2026-09-10')
      expect(journalDay.has(it.d)).toBe(true)
      expect(it.to).toBe(`/research/journal?view=day&day=${it.d}`)
    }
    expect(items).toHaveLength(2)
  })
})
