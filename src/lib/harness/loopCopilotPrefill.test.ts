import { describe, expect, it } from 'vitest'
import {
  buildCandidateExplainPrompt,
  buildDigestAskPrompt,
  buildLoopRunReviewPrompt,
  loopCopilotUi,
} from './loopCopilotPrefill'

describe('loop Copilot prefill (D1)', () => {
  it('sends the run review through research.loop.get_run with citations', () => {
    const en = buildLoopRunReviewPrompt({ runId: 'run_abc', title: 'Daily Loop Stock Explorer' }, 'en')
    expect(en).toContain('research.loop.get_run("run_abc")')
    expect(en).toContain('citing the tool')
    expect(en).toContain('D10 observe-only')
    const zh = buildLoopRunReviewPrompt({ runId: 'run_abc', title: 'Daily Loop Stock Explorer' }, 'zh')
    expect(zh).toContain('research.loop.get_run("run_abc")')
    expect(zh).toContain('标注工具出处')
  })

  it('asks why a candidate was proposed and what would unmake it, from the run record', () => {
    const en = buildCandidateExplainPrompt({ runId: 'run_abc', symbol: 'wt', title: 'Daily Loop Stock Explorer' }, 'en')
    expect(en).toContain('why was WT proposed, and what would unmake the call?')
    expect(en).toContain('research.loop.explain_candidate("run_abc", "WT")')
    expect(en).toContain('not_measured and missing option data are coverage facts')
    const zh = buildCandidateExplainPrompt({ runId: 'run_abc', symbol: 'wt' }, 'zh')
    expect(zh).toContain('为什么提出 WT')
    expect(zh).toContain('research.loop.explain_candidate("run_abc", "WT")')
  })

  it('asks about a digest reading by reading, and will not fill in a missing one', () => {
    const params = { draftId: 'drf_1', day: '2026-09-11', symbols: ['FN', 'NVDA'] }
    const en = buildDigestAskPrompt(params, 'en')
    expect(en).toContain('daily digest for 2026-09-11 (draft drf_1). It covers 2 names: FN, NVDA.')
    expect(en).toContain('cite the lens and its as_of')
    expect(en).toContain('A missing reading is a coverage fact, not a verdict')
    expect(en).toContain("label it as today's")
    const zh = buildDigestAskPrompt({ ...params, symbols: [] }, 'zh')
    expect(zh).toContain('它覆盖 0 个标的。')
    expect(zh).toContain('不要替它补结论')
  })

  it('keeps Loop chrome in English even though prompt bodies still follow lang', () => {
    expect(loopCopilotUi.discuss).toBe('Discuss in Copilot')
    expect(loopCopilotUi.discussShort).toBe('Discuss')
    expect(loopCopilotUi.inbox).toBe('Inbox')
    expect(loopCopilotUi.awaitingBanner(2)).toBe('2 runs awaiting approval')
    expect(loopCopilotUi.review(false)).toBe('Review')
    expect(JSON.stringify(loopCopilotUi)).not.toMatch(/[\u4e00-\u9fff]/)
  })
})
