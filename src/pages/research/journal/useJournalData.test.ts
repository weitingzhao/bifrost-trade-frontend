import { describe, expect, it } from 'vitest'
import { journalOutcomeQuery } from './useJournalData'

describe('journal outcome query', () => {
  it('asks /rows for every source over the day window', () => {
    expect(journalOutcomeQuery(30)).toEqual({ source: '', days: 30, limit: 500 })
  })
})