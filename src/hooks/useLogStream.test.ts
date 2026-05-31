import { describe, it, expect } from 'vitest'
import { parseLine } from './useLogStream'

// ── parseLine — standard Python log format ──────────────────────────────────

describe('parseLine — structured format', () => {
  it('parses standard Python log with brackets and comma milliseconds', () => {
    const entry = parseLine('api', '2024-01-15 12:34:56,123 [INFO] server started')
    expect(entry.ts).toBe('12:34:56')
    expect(entry.level).toBe('INFO')
    expect(entry.service).toBe('api')
    expect(entry.message).toBe('server started')
  })

  it('parses log with dot milliseconds separator', () => {
    const entry = parseLine('worker', '2024-06-01 09:00:00.456 [DEBUG] task queued')
    expect(entry.ts).toBe('09:00:00')
    expect(entry.level).toBe('DEBUG')
    expect(entry.message).toBe('task queued')
  })

  it('parses no-brackets variant', () => {
    const entry = parseLine('daemon', '2024-03-20 15:00:00 INFO heartbeat ok')
    expect(entry.ts).toBe('15:00:00')
    expect(entry.level).toBe('INFO')
    expect(entry.message).toBe('heartbeat ok')
  })

  it('parses ERROR level', () => {
    const entry = parseLine('srv', '2024-01-01 00:00:00,000 [ERROR] connection refused')
    expect(entry.level).toBe('ERROR')
  })

  it('parses WARN level', () => {
    const entry = parseLine('srv', '2024-01-01 00:00:00,000 [WARN] high latency')
    expect(entry.level).toBe('WARN')
  })

  it('normalizes WARNING to WARN', () => {
    const entry = parseLine('srv', '2024-01-01 00:00:00,000 [WARNING] reconnecting')
    expect(entry.level).toBe('WARN')
  })

  it('parses DEBUG level', () => {
    const entry = parseLine('srv', '2024-01-01 00:00:00,000 [DEBUG] tick received')
    expect(entry.level).toBe('DEBUG')
  })

  it('preserves service name in entry', () => {
    const entry = parseLine('bifrost-socket', '2024-01-01 00:00:00 INFO ok')
    expect(entry.service).toBe('bifrost-socket')
  })

  it('trims whitespace from message', () => {
    const entry = parseLine('s', '2024-01-01 00:00:00 INFO   spaced message   ')
    expect(entry.message).toBe('spaced message')
  })

  it('preserves brackets and special chars in message body', () => {
    const entry = parseLine('s', '2024-01-01 00:00:00 INFO order [12345] filled at $150.50')
    expect(entry.message).toContain('[12345]')
    expect(entry.message).toContain('$150.50')
  })
})

// ── parseLine — unstructured / fallback ──────────────────────────────────────

describe('parseLine — fallback for unstructured lines', () => {
  it('assigns level=OTHER for lines that do not match the pattern', () => {
    const entry = parseLine('api', 'some random log line without timestamp')
    expect(entry.level).toBe('OTHER')
    expect(entry.message).toBe('some random log line without timestamp')
    expect(entry.service).toBe('api')
  })

  it('handles empty string without throwing', () => {
    const entry = parseLine('api', '')
    expect(entry.level).toBe('OTHER')
    expect(entry.message).toBe('')
  })

  it('handles traceback / multi-word lines without timestamp', () => {
    const line = 'Traceback (most recent call last):'
    const entry = parseLine('worker', line)
    expect(entry.level).toBe('OTHER')
    expect(entry.message).toBe(line)
  })
})

// ── parseLine — id monotonically increases ───────────────────────────────────

describe('parseLine — entry id', () => {
  it('each call produces a strictly increasing id', () => {
    const a = parseLine('s', '2024-01-01 00:00:00 INFO a')
    const b = parseLine('s', '2024-01-01 00:00:01 INFO b')
    const c = parseLine('s', 'unstructured')
    expect(b.id).toBeGreaterThan(a.id)
    expect(c.id).toBeGreaterThan(b.id)
  })
})
