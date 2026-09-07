import { describe, it, expect } from 'vitest'
import { agentView, reasonFor, splitNumerics, stanceScore, stanceView } from './personaVisual'
import { candidateMarkdown, personaStageMarkdown } from './personaExport'
import type { PersonaRow } from '@/components/research/harness/HarnessPipelineStepper'

describe('stance as a position, not a word', () => {
  it('puts the four stances on one axis and keeps dissent beside caution', () => {
    expect(stanceView('support')).toMatchObject({ score: 1, tone: 'success', icon: 'check' })
    expect(stanceView('oppose')).toMatchObject({ score: -1, tone: 'danger', icon: 'ban' })
    expect(stanceView('caution').score).toBeLessThan(0)
    expect(stanceView('dissent').key).toBe('caution')
    expect(stanceView('block').key).toBe('oppose')
    // An abstention has no position. It must not read as neutral-and-therefore-fine.
    expect(stanceView('abstain')).toMatchObject({ score: null, icon: 'dash' })
    expect(stanceView(null).label).toBe('—')
    expect(stanceView('SUPPORT ').key).toBe('support')
  })

  it('leaves abstentions out of the average rather than counting them as neutral', () => {
    // Two supports and an abstention is not "mildly positive on three judges";
    // it is unanimous on the two that spoke.
    const s = stanceScore(['support', 'support', 'abstain'])
    expect(s).toMatchObject({ score: 1, counted: 2, abstained: 1 })
    expect(stanceScore(['support', 'oppose']).score).toBe(0)
    expect(stanceScore(['abstain'])).toMatchObject({ score: null, counted: 0, abstained: 1 })
    expect(stanceScore([]).score).toBeNull()
  })

  it('names what each persona was actually asked', () => {
    expect(agentView('validate').asks).toContain('block')
    expect(agentView('portfolio').icon).toBe('briefcase')
    expect(agentView('nonsense')).toMatchObject({ label: 'nonsense', icon: 'dot' })
    expect(agentView(undefined).label).toBe('—')
  })
})

describe('the sentence in the reader’s language', () => {
  it('prefers the Chinese the judge wrote, and says when it fell back', () => {
    const both = { summary: 'IV rank 19 is cold', summary_zh: 'IV rank 19 偏冷' }
    expect(reasonFor(both, 'zh')).toEqual({ text: 'IV rank 19 偏冷', translated: true })
    expect(reasonFor(both, 'en')).toEqual({ text: 'IV rank 19 is cold', translated: false })
  })

  it('falls back to English rather than showing a gap, and admits it did', () => {
    // Heuristic rows and every run made before the judges were asked for
    // Chinese have no zh field. Silently showing English while the reader has
    // chosen Chinese is fine; pretending it is the translation is not.
    const enOnly = { summary: 'no Chinese here' }
    expect(reasonFor(enOnly, 'zh')).toEqual({ text: 'no Chinese here', translated: false })
    expect(reasonFor({ summary: 'x', summary_zh: '   ' }, 'zh').translated).toBe(false)
  })

  it('reads the triage field names too', () => {
    expect(reasonFor({ why: 'thin evidence', why_zh: '证据薄弱' }, 'zh').text).toBe('证据薄弱')
    expect(reasonFor({}, 'zh')).toEqual({ text: '', translated: false })
  })
})

describe('picking the figures out of the prose', () => {
  it('finds the numbers a reader needs and leaves the words alone', () => {
    const parts = splitNumerics('IV rank 19 (cold), ~925 shares, ~$170k at 245/255, high 236.54.')
    const nums = parts.filter((p) => p.numeric).map((p) => p.text.trim())
    expect(nums).toEqual(['19', '~925', '~$170k', '245/255', '236.54'])
    expect(parts.map((p) => p.text).join('')).toBe(
      'IV rank 19 (cold), ~925 shares, ~$170k at 245/255, high 236.54.',
    )
  })

  it('leaves a digit that is part of a name alone', () => {
    // "gpt-4o-mini" and "SEPA79" are identifiers; highlighting inside them
    // would scatter emphasis across the sentence.
    const parts = splitNumerics('gpt-4o-mini read SEPA79 and scored 0.55')
    expect(parts.filter((p) => p.numeric).map((p) => p.text.trim())).toEqual(['0.55'])
  })

  it('is lossless and safe on empty input', () => {
    expect(splitNumerics('')).toEqual([])
    const plain = splitNumerics('no figures at all')
    expect(plain).toEqual([{ text: 'no figures at all', numeric: false }])
  })
})

const row: PersonaRow = {
  symbol: 'NVDA',
  net: 'caution',
  validate: 'caution',
  blocked: false,
  agreement: 'dissent',
  models: [
    { model: 'deepseek-chat', net: 'caution', validate: 'caution', ok: true, fallback: false, elapsed_ms: 1, cost_usd: 0.1, error: null },
    { model: 'gpt-4o-mini', net: 'support', validate: 'abstain', ok: true, fallback: false, elapsed_ms: 1, cost_usd: 0.01, error: null },
  ],
  verdicts: [
    { agent: 'analyze', source: 'agent', stance: 'caution', confidence: null, summary: 'IV rank 19 (cold) | negative VRP', summary_zh: 'IV rank 19 偏冷 | VRP 为负', model: 'deepseek-chat' },
    { agent: 'portfolio', source: 'agent', stance: 'oppose', confidence: 0.6, summary: 'Already the largest position', summary_zh: null, model: 'deepseek-chat' },
  ],
}

const ctx = {
  runId: 'run_1a07c0fe66e48109e',
  objective: 'Daily Loop Stock Explorer',
  asOf: '2026-09-07',
  considered: 3475,
  proposed: 8,
}

describe('taking the judgement somewhere else', () => {
  it('carries who said it, what they were asked, and what they were looking at', () => {
    const md = candidateMarkdown(row)
    expect(md).toContain('## NVDA')
    expect(md).toContain('- Net stance: **caution**')
    expect(md).toContain('- Judges: **dissent**')
    expect(md).toContain('- gpt-4o-mini: support / validate abstain')
    expect(md).toContain('| Judge | Asked | Stance | Confidence | Reasoning | 中文 |')
    // One judge wrote Chinese and one did not; the column appears once and the
    // row that has none says so rather than trailing an empty cell.
    expect(md).toContain('| deepseek-chat | portfolio | oppose | 0.60 | Already the largest position | — |')
    // A pipe inside the prose would break the table wherever it is pasted.
    expect(md).toContain('IV rank 19 (cold) \\| negative VRP')
    expect(md).toContain('IV rank 19 偏冷 \\| VRP 为负')
  })

  it('heads the export with enough context to be readable on its own', () => {
    const md = personaStageMarkdown([row], ctx)
    expect(md).toContain('# Research loop judgement — Daily Loop Stock Explorer')
    expect(md).toContain('- Run: `run_1a07c0fe66e48109e`')
    expect(md).toContain('- Funnel: 3,475 considered → 8 proposed')
    expect(md).toContain('## NVDA')
  })

  it('omits the Chinese column when no judge wrote one', () => {
    const enOnly = { ...row, verdicts: row.verdicts.map((v) => ({ ...v, summary_zh: null })) }
    const md = candidateMarkdown(enOnly)
    expect(md).toContain('| Judge | Asked | Stance | Confidence | Reasoning |')
    expect(md).not.toContain('中文')
  })

  it('says so plainly when there is nothing to export', () => {
    expect(personaStageMarkdown([], ctx)).toContain('_No candidates were judged._')
    expect(candidateMarkdown({ ...row, verdicts: [] })).toContain(
      '_No per-persona verdicts recorded._',
    )
  })
})
