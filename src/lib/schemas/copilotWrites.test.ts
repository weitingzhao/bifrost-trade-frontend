import { describe, expect, it } from 'vitest'
import { CopilotWritesSchema } from './research'

/**
 * From `chat_writes(days=30)` inside the deployed research-api on 2026-09-26
 * (research 0.133.0), trimmed to three of its six rows. These are the D4
 * acceptance probes of 07 Sep — recorded without their thread.
 */
const REAL_RESPONSE = {
  days: 30,
  since_day_utc: '2026-08-29',
  rows: [
    {
      id: 'aal_1a07a5c6fafb90e3daf',
      tool: 'research.loop.run_objective',
      kind: 'objective',
      change: 'Run objective obj-daily-loop-stock',
      symbol: null,
      session_id: null,
      thread_title: null,
      thread_archived: null,
      status: 'approved',
      ok: null,
      error: null,
      created_at: '2026-09-07T05:34:33.445052+00:00',
      executed_at: null,
    },
    {
      id: 'aal_1a07a5c6db44eddbfa3',
      tool: 'research.loop.propose_candidate',
      kind: 'candidate',
      change: 'Candidate MSFT',
      symbol: 'MSFT',
      session_id: null,
      thread_title: null,
      thread_archived: null,
      status: 'executed',
      ok: true,
      error: null,
      created_at: '2026-09-07T05:34:32.894472+00:00',
      executed_at: '2026-09-07T05:34:33.279153+00:00',
    },
    {
      id: 'aal_1a07a273391b986fbb5',
      tool: 'research.loop.propose_candidate',
      kind: 'candidate',
      change: 'Candidate NVDA · score 62',
      symbol: 'NVDA',
      session_id: null,
      thread_title: null,
      thread_archived: null,
      status: 'executed',
      ok: true,
      error: null,
      created_at: '2026-09-07T04:36:24.654398+00:00',
      executed_at: '2026-09-07T04:36:24.768044+00:00',
    },
  ],
  total: 6,
  truncated: false,
  last_write_at: '2026-09-07T05:34:33.445052+00:00',
  db_ok: true,
}

describe('CopilotWritesSchema', () => {
  it('accepts the real response, rows without a thread included', () => {
    expect(CopilotWritesSchema.safeParse(REAL_RESPONSE).success).toBe(true)
  })

  it('accepts the empty window and the unreachable ledger', () => {
    const empty = { ...REAL_RESPONSE, days: 7, since_day_utc: '2026-09-20', rows: [], total: 0 }
    expect(CopilotWritesSchema.safeParse(empty).success).toBe(true)
    expect(CopilotWritesSchema.safeParse({ ...empty, last_write_at: null, db_ok: false }).success).toBe(true)
  })

  it('rejects a broken shape', () => {
    const noChange = { ...REAL_RESPONSE, rows: [{ ...REAL_RESPONSE.rows[0], change: null }] }
    expect(CopilotWritesSchema.safeParse(noChange).success).toBe(false)
    expect(CopilotWritesSchema.safeParse({ ...REAL_RESPONSE, total: '6' }).success).toBe(false)
    expect(CopilotWritesSchema.safeParse({ ...REAL_RESPONSE, rows: undefined }).success).toBe(false)
  })

  it('lets an added field through', () => {
    const grown = {
      ...REAL_RESPONSE,
      by_status: { executed: 4 },
      rows: REAL_RESPONSE.rows.map((r) => ({ ...r, model: 'deepseek-chat' })),
    }
    expect(CopilotWritesSchema.safeParse(grown).success).toBe(true)
  })
})
