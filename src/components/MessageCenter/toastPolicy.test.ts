import { describe, expect, it } from 'vitest'
import { shouldToast } from './toastPolicy'
import type { SystemMessage, SystemMessageLevel } from '@/types/messages'

function msg(topic: string, level: SystemMessageLevel): SystemMessage {
  return {
    message_id: `${topic}:${level}`,
    topic,
    level,
    title: 't',
    message: 'm',
    occurred_at: 1_700_000_000,
  }
}

describe('shouldToast', () => {
  it('interrupts for a dropped broker connection', () => {
    // `ib.connection` with status_to=disconnected is published at error level.
    expect(shouldToast(msg('ib.connection', 'error'))).toBe(true)
  })

  it('stays quiet for a slot reconnecting or coming back', () => {
    // These are the two that used to fire a toast every time and were given a
    // 30-second auto-dismiss to make them stop. They belong in the Inbox.
    expect(shouldToast(msg('ib.connection', 'warning'))).toBe(false)
    expect(shouldToast(msg('ib.connection', 'success'))).toBe(false)
    expect(shouldToast(msg('ib.connection', 'info'))).toBe(false)
  })

  it('interrupts for the result of an import you triggered, either way', () => {
    // `portfolio.tws_executions` has exactly one cause: POST /executions/fetch,
    // which is a button. Success matters as much as failure — you are standing
    // there waiting to hear whether it worked.
    expect(shouldToast(msg('portfolio.tws_executions', 'success'))).toBe(true)
    expect(shouldToast(msg('portfolio.tws_executions', 'error'))).toBe(true)
  })

  it('stays quiet for a topic nobody asked for', () => {
    expect(shouldToast(msg('some.future.topic', 'info'))).toBe(false)
    expect(shouldToast(msg('some.future.topic', 'warning'))).toBe(false)
    // …but never for an error. A new topic is silent by default and loud when
    // it breaks, which is the safe way round for a topic added later.
    expect(shouldToast(msg('some.future.topic', 'error'))).toBe(true)
  })
})
