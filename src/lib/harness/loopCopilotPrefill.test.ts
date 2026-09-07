import { describe, expect, it } from 'vitest'
import { buildCandidateExplainPrompt, buildLoopRunReviewPrompt } from './loopCopilotPrefill'

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
})
