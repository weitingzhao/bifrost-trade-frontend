import { describe, expect, it } from 'vitest'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'
import {
  exportFilename,
  messagesToHtml,
  messagesToMarkdown,
  sessionShortId,
  singleMessageMarkdown,
} from './exportSerializer'

const sampleMessages: CopilotUiMessage[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'What is my portfolio risk?',
  },
  {
    id: 'a1',
    role: 'assistant',
    content: '',
    handoff: { from: 'triage', to: 'portfolio' },
    toolCalls: [
      {
        id: 'tc1',
        name: 'trade.portfolio.risk_summary',
        arguments: { symbol: 'SPY' },
        status: 'done',
        result: {
          ok: true,
          data: { symbol: 'SPY', spot: 450.12, daily_pnl: 120.5, daily_hedge_count: 2 },
        },
      },
    ],
  },
  {
    id: 'a2',
    role: 'assistant',
    content: 'Your SPY daily P&L is **+$120.50** with 2 hedges today.',
  },
]

describe('exportSerializer', () => {
  it('builds markdown with header, handoff, tool summary, and assistant text', () => {
    const md = messagesToMarkdown(sampleMessages, {
      sessionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      sessionTitle: 'Risk check',
    })
    expect(md).toContain('# Bifrost Research Copilot Export')
    expect(md).toContain('**Session:** Risk check')
    expect(md).toContain('Agent handoff')
    expect(md).toContain('trade.portfolio.risk_summary')
    expect(md).toContain('SPY')
    expect(md).toContain('+$120.50')
  })

  it('builds self-contained HTML', () => {
    const html = messagesToHtml(sampleMessages, { sessionTitle: 'Risk check' })
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<style>')
    expect(html).toContain('Bifrost Research Copilot Export')
    expect(html).toContain('trade.portfolio.risk_summary')
    expect(html).toContain('Handoff')
  })

  it('formats export filename with short session id', () => {
    expect(sessionShortId('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe('aaaaaaaa')
    const name = exportFilename('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', new Date('2026-08-26T15:04:00'))
    expect(name).toMatch(/^bifrost-copilot-aaaaaaaa-20260826-1504\.md$/)
  })

  it('exports single assistant message', () => {
    const md = singleMessageMarkdown(sampleMessages[2]!)
    expect(md).toContain('## Assistant')
    expect(md).toContain('+$120.50')
  })
})
