import { describe, expect, it } from 'vitest'
import type { DailyBriefSynth } from '@/api/researchEngine'
import { asOfLine, cardCaveat, contextJoiner, mapDailyVerdict, sourceLamps } from './dailyBrief'

const card = (present: boolean, to: string) => ({
  present,
  verdict: 'x',
  lens: 'l',
  band: null,
  label: null,
  means: null,
  as_of: present ? '2026-09-04' : null,
  freshness: present ? ('fresh' as const) : ('missing' as const),
  lamp: present ? ('green' as const) : ('gray' as const),
  to,
  readings: {},
  caveats: [],
})

const synth = {
  symbol: 'NVDA',
  trade_date: '2026-09-04',
  verdict: {
    narrative: { label: 'Main narrative', text: 'NVDA range', lamp: 'green', to: '/research/scenario?view=model' },
    risk: { label: 'Key risk', text: 'IV rank 19 — Low vol regime', lamp: 'green', to: '/research/vol-regime?view=iv-rank' },
    opportunity: { label: 'Opportunity', text: 'SEPA NVDA PIVOT', lamp: 'green', to: '/research/sepa-daily-core' },
    action_hint: { label: 'View opportunity', to: '/research/sepa-daily-core' },
  },
  freshness: { terrain: 'green', gex: 'gray', events: 'yellow', sentiment: 'green' },
  cards: {
    terrain: card(true, '/research/scenario?view=model'),
    gex: card(false, '/research/dealer-levels?view=gex'),
    events: { present: true, verdict: '2 recent', lamp: 'yellow', to: '/research/event-radar', rows: [] },
    sentiment: card(true, '/research/flow'),
  },
  regime_context: null,
} as unknown as DailyBriefSynth

describe('daily brief mapping', () => {
  it('carries symbol and date into hub views, joining with & when a view is set', () => {
    const withContext = contextJoiner('NVDA', '2026-09-04')
    expect(withContext('/research/scenario?view=model')).toBe('/research/scenario?view=model&symbol=NVDA&date=2026-09-04')
    expect(withContext('/research/event-radar')).toBe('/research/event-radar?symbol=NVDA&date=2026-09-04')
    expect(contextJoiner('', null)('/research/flow')).toBe('/research/flow')
  })

  it('maps the server verdict without client-side rules and lists the present sources', () => {
    const v = mapDailyVerdict(synth, contextJoiner('NVDA', null))
    expect(v.narrative.to).toBe('/research/scenario?view=model&symbol=NVDA')
    expect(v.actionHint).toEqual({ label: 'View opportunity', to: '/research/sepa-daily-core?symbol=NVDA' })
    expect(v.sourcesUsed).toEqual(['Terrain', 'Events', 'Sentiment'])
  })

  it('orders the source lamps and stars the sentiment proxy', () => {
    expect(sourceLamps(synth)).toEqual([
      { label: 'Terrain', lamp: 'green' },
      { label: 'GEX', lamp: 'gray' },
      { label: 'Events', lamp: 'yellow' },
      { label: 'Sentiment*', lamp: 'green' },
    ])
  })

  it('states the exhibit date', () => {
    expect(asOfLine({ as_of: '2026-09-04' })).toBe('as of 2026-09-04')
    expect(asOfLine({ as_of: null })).toBeNull()
  })

  it('shows only caveats that say something about this reading', () => {
    expect(cardCaveat({ present: true, caveats: ['No settled track record for this lens yet', 'Skew percentile rests on 9 history days — thin'] })).toBe(
      'Skew percentile rests on 9 history days — thin',
    )
    expect(cardCaveat({ present: true, caveats: ['No settled track record for this lens yet'] })).toBeNull()
    expect(cardCaveat({ present: false, caveats: ['No SVI fit'] })).toBeNull()
  })
})
