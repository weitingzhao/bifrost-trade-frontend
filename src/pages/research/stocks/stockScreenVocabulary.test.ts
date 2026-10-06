/**
 * Saved screens speak `stock_screen.v2` (research 0.181.0). Research validates
 * every name strictly, so Stock screen's stages and Research's catalog must
 * hold the same conditions: a chip Research does not know cannot be saved,
 * and a condition Research knows that no chip offers is a dead word.
 *
 * `screenVocabulary.v2.json` is the catalog as Research ships it (regenerate
 * from `repositories/saved_screen.vocabulary_catalog()` when either side
 * changes); Research pins the same counts in tests/api/test_saved_screen.py.
 * All fixture values invented.
 */
import { describe, expect, it } from 'vitest'
import vocab from './screenVocabulary.v2.json'
import { STAGES, stagesWithPine } from './stockScreenStages'
import {
  describeV2,
  screenFromV1,
  screenFromV2,
  toSavedDefinitionV2,
  vocabularyGaps,
} from './stockScreenView'
import type { ScreenVocabularyV2 } from '@/api/research/savedScreens'

const V = {
  ...vocab,
  pine: { ...vocab.pine, scripts: ['supertrend', 'my_cross'] },
} as unknown as ScreenVocabularyV2

describe('Stock screen ↔ Research vocabulary (stock_screen.v2)', () => {
  it('offers exactly the conditions Research accepts, stage by stage', () => {
    for (const st of STAGES) {
      if (st.id === 'pine') continue
      const live = st.missing ? [] : st.chips.filter((c) => !c.missing).map((c) => c.id)
      const server = V.stages[st.id]?.conditions ?? []
      expect([...live].sort(), st.id).toEqual([...server].sort())
    }
    const withConditions = STAGES.filter((st) => st.id !== 'pine' && !st.missing).map((st) => st.id)
    expect(withConditions.sort()).toEqual(Object.keys(V.stages).sort())
  })

  it('agrees on each stage’s “at least N” ceiling', () => {
    for (const st of STAGES) {
      const server = V.stages[st.id]
      if (!server || (st.kind !== 'min' && st.kind !== 'agree')) continue
      expect(st.max ?? st.chips.length, st.id).toBe(server.max)
    }
  })
})

describe('v2 definitions', () => {
  const stages = stagesWithPine([
    { id: 'supertrend', label: 'Supertrend', origin: 'bifrost' },
    { id: 'my_cross', label: 'EMA cross', origin: 'user' },
  ])
  const screen = {
    on: {
      price_gt_sma50: true,
      m_sepa: true,
      m_radar: true,
      grade_a: true,
      'pine:supertrend:buy': true,
      'pine:gone_now:sell': true,
    },
    mins: { trend: 8, agree: 2, radar: 1 },
    pine: { within: 10 as const, match: 'all' as const },
  }

  it('saves stages with their N, the Pine block (off scripts included) and a savable universe', () => {
    const d = toSavedDefinitionV2(screen, stages, 'options')
    expect(d).toEqual({
      stages: {
        agree: { on: ['m_sepa', 'm_radar'], min: 2 },
        trend: { on: ['price_gt_sma50'], min: 8 },
        radar: { on: ['grade_a'] }, // radar has no "at least N": its stray min is not sent
      },
      pine: { on: ['pine:gone_now:sell', 'pine:supertrend:buy'], window: 10, match: 'all' },
      universe: 'options',
    })
    expect(toSavedDefinitionV2(screen, stages, 'sp500').universe).toBeNull()
  })

  it('reads back into the same screen', () => {
    const { screen: back, universe } = screenFromV2(toSavedDefinitionV2(screen, stages, 'watch'))
    expect(universe).toBe('watch')
    expect(back.on).toEqual({ ...screen.on, grade_a: true })
    expect(back.mins).toEqual({ trend: 8, agree: 2 })
    expect(back.pine).toEqual({ within: 10, match: 'all' })
  })

  it('names what Research would refuse, before Save', () => {
    const d = toSavedDefinitionV2(screen, stages, 'options')
    expect(vocabularyGaps(d, V)).toEqual(['pine:gone_now:sell'])
    expect(
      vocabularyGaps(
        { ...d, stages: { trend: { on: ['made_up'] } } },
        { ...V, pine: { ...V.pine, scripts: ['supertrend', 'gone_now'] } }
      )
    ).toEqual(['made_up'])
  })

  it('says a v2 screen in words, an off script marked', () => {
    const d = toSavedDefinitionV2(screen, stages, 'options')
    expect(describeV2(d, stages)).toBe(
      'Model agreement ≥ 2: SEPA, Radar · Trend template ≥ 8: P > 50 · Radar grade: A · Pine signals: gone_now ↓ (off), Supertrend ↑ within 10 · all · Option universe'
    )
  })

  it('keeps reading v1 screens, naming what has no stage here', () => {
    const { screen: s, lost } = screenFromV1({
      q: 'semis',
      paths: ['PIVOT'],
      grades: ['A'],
      min_composite: 60,
      tech: ['crs_ge_70'],
      fund: ['eps_acc_fy'],
    })
    expect(s.on).toEqual({ crs_ge_70: true, eps_acc_fy: true, m_sepa: true })
    expect(lost).toEqual(['grade A', 'composite ≥ 60', 'search “semis”'])
  })
})
