import { describe, expect, it } from 'vitest'
import {
  TRADE_QUESTIONS,
  TRADE_QUESTION_GROUPS,
  questionsFor,
  referencedTools,
} from './tradePrompts'

describe('trade question set', () => {
  it('every question belongs to a declared group, and every group has questions', () => {
    const groups = new Set(TRADE_QUESTION_GROUPS.map((g) => g.id))
    for (const q of TRADE_QUESTIONS) expect(groups, q.id).toContain(q.group)
    for (const g of TRADE_QUESTION_GROUPS) expect(questionsFor(g.id).length, g.id).toBeGreaterThan(0)
  })

  it('ids are unique and both languages are written', () => {
    const ids = TRADE_QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of TRADE_QUESTIONS) {
      for (const lang of ['zh', 'en'] as const) {
        expect(q.label[lang].trim(), `${q.id}.label.${lang}`).not.toBe('')
        expect(q.prompt[lang].length, `${q.id}.prompt.${lang}`).toBeGreaterThan(30)
      }
    }
  })

  it('only names trade.* tools — the book is the subject and reads are the boundary', () => {
    for (const q of TRADE_QUESTIONS) {
      expect(q.tools.length, q.id).toBeGreaterThan(0)
      for (const t of q.tools) expect(t, q.id).toMatch(/^trade\./)
    }
    expect(referencedTools()).toEqual([...referencedTools()].sort())
  })

  it('any prompt that touches execution says the freeze out loud — D10', () => {
    // The set must be able to ask about trimming or hedging: that is judgement,
    // and refusing the words would make the Copilot useless for the questions
    // the Owner actually has. What it must not do is leave the reader thinking
    // the answer could be acted on by the system, so a prompt that reaches for
    // execution vocabulary carries the freeze in the same breath.
    const execWords = /order|hedge|trim|下单|对冲|减仓/i
    const disclaimer = /D10/
    for (const q of TRADE_QUESTIONS) {
      for (const lang of ['zh', 'en'] as const) {
        if (execWords.test(q.prompt[lang])) {
          expect(q.prompt[lang], `${q.id}.${lang}`).toMatch(disclaimer)
        }
      }
    }
  })
})
