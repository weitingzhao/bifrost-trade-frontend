import { describe, expect, it } from 'vitest'
import type { CopilotWriteRow } from '@/api/research/copilotWrites'
import { writeDay, writeResult, writesEmptyLine, writesMeta, writeThread } from './writesTable'

// 2026-09-26 15:00 ET
const NOW = new Date('2026-09-26T19:00:00Z')

function row(over: Partial<CopilotWriteRow> = {}): CopilotWriteRow {
  return {
    id: 'aal_1',
    tool: 'research.loop.propose_candidate',
    kind: 'candidate',
    change: 'Candidate MSFT',
    symbol: 'MSFT',
    session_id: '0b8c1c9e-1111-2222-3333-444455556666',
    thread_title: 'MSFT after the print',
    thread_archived: false,
    status: 'executed',
    ok: true,
    error: null,
    created_at: '2026-09-26T13:41:00Z',
    executed_at: '2026-09-26T13:41:02Z',
    ...over,
  }
}

describe('writeDay', () => {
  it('reads the day in New York: today is null, then yesterday, then the date token', () => {
    expect(writeDay('2026-09-26T13:41:00Z', NOW)).toBeNull()
    // 00:30 UTC on the 27th is still the 26th in New York
    expect(writeDay('2026-09-27T00:30:00Z', new Date('2026-09-27T01:00:00Z'))).toBeNull()
    expect(writeDay('2026-09-25T20:00:00Z', NOW)).toBe('yesterday')
    expect(writeDay('2026-09-07T05:34:33Z', NOW)).toBe('07SEP26')
    expect(writeDay(null, NOW)).toBe('—')
  })
})

describe('writeResult', () => {
  it('names what became of each status, with the New York clock', () => {
    expect(writeResult(row())).toEqual({
      text: 'ran · 09:41',
      tone: 'green',
      title: 'Approved on the card and executed',
    })
    expect(writeResult(row({ status: 'approved', executed_at: null })).text).toBe('approved · not run · 09:41')
    expect(writeResult(row({ status: 'approved', executed_at: null })).tone).toBe('warn')
    expect(writeResult(row({ status: 'rejected' })).tone).toBe('muted')
    expect(writeResult(row({ status: 'rejected' })).text).toBe('refused · 09:41')
  })

  it('carries the error on a failure, and never calls a failed run green', () => {
    const failed = writeResult(row({ status: 'error', ok: false, error: 'objective not found' }))
    expect(failed.tone).toBe('danger')
    expect(failed.title).toBe('objective not found')
    expect(writeResult(row({ status: 'executed', ok: false })).tone).toBe('danger')
  })

  it('drops the clock when the row has no time', () => {
    expect(writeResult(row({ created_at: null, executed_at: null })).text).toBe('ran')
  })
})

describe('writeThread', () => {
  it('opens a thread and names it, with the day in front when not today', () => {
    expect(writeThread(row(), NOW)).toMatchObject({ text: 'MSFT after the print', openable: true })
    expect(writeThread(row({ created_at: '2026-09-25T20:00:00Z' }), NOW).text).toBe(
      'yesterday · MSFT after the print',
    )
    expect(writeThread(row({ thread_title: null, thread_archived: true }), NOW).text).toBe(
      'thread 0b8c1c9e · archived',
    )
  })

  it('does not offer to open a write recorded without its thread', () => {
    const t = writeThread(row({ session_id: null, thread_title: null, created_at: '2026-09-07T05:34:33Z' }), NOW)
    expect(t).toMatchObject({ text: '07SEP26 · no thread', openable: false })
  })
})

describe('writesMeta', () => {
  it('always says ran and refused, and names the rest only when there are some', () => {
    expect(writesMeta({ proposed: 0, approved: 0, executed: 0, rejected: 0, error: 0 })).toBe('today 0 ran · 0 refused')
    expect(writesMeta({ executed: 2, rejected: 1, error: 1, approved: 1 })).toBe(
      'today 2 ran · 1 refused · 1 failed · 1 not run',
    )
    expect(writesMeta(undefined)).toBe('—')
  })
})

describe('writesEmptyLine', () => {
  it('says when the last write was, or that there has never been one', () => {
    expect(writesEmptyLine({ days: 7, last_write_at: '2026-09-07T05:34:33+00:00' })).toBe(
      'No chat writes in the last 7 days. The last one was 07SEP26.',
    )
    expect(writesEmptyLine({ days: 1, last_write_at: null })).toBe(
      'No chat writes in the last 1 day. The chat has not written anything yet.',
    )
  })
})
