import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  MAX_REPORTS,
  driftFieldPath,
  driftUrlPath,
  reportSchemaDrift,
  resetSchemaDriftReports,
  setSchemaDriftSink,
  type SchemaDriftReport,
  type SchemaDriftSink,
} from './schemaDriftReport'
import { withValidation } from './apiValidation'

const Row = z.object({ id: z.number(), symbols: z.array(z.string()), side: z.enum(['buy', 'sell']) }).passthrough()
const List = z.object({ items: z.array(Row) }).passthrough()

function issuesOf(data: unknown) {
  const r = List.safeParse(data)
  if (r.success) throw new Error('fixture parsed')
  return r.error.issues
}

describe('schema drift reporter', () => {
  let reports: SchemaDriftReport[]
  let prev: SchemaDriftSink

  beforeEach(() => {
    reports = []
    resetSchemaDriftReports()
    prev = setSchemaDriftSink((r) => reports.push(r))
  })
  afterEach(() => {
    setSchemaDriftSink(prev)
    resetSchemaDriftReports()
  })

  it('folds array positions so one drift is one field', () => {
    expect(driftFieldPath(['items', 3, 'symbols'])).toBe('items[].symbols')
    expect(driftFieldPath([])).toBe('(root)')
  })

  it('keeps the URL path only — no origin, no query', () => {
    expect(driftUrlPath('http://192.0.2.1:30882/api/strategy/strategies/instances?account_id=U0000001')).toBe(
      '/api/strategy/strategies/instances',
    )
    expect(driftUrlPath('/api/strategy/strategies/opportunities?active_only=false')).toBe(
      '/api/strategy/strategies/opportunities',
    )
    expect(driftUrlPath(undefined)).toBeNull()
  })

  it('reports each (schema, field) once per session, names only', () => {
    const secret = 'SECRET-VALUE-9'
    const bad = { items: [{ id: secret, symbols: null, side: secret }, { id: 2, symbols: null, side: 'buy' }] }
    reportSchemaDrift('strategy/fixture', issuesOf(bad), '/api/x?account_id=U0000001')
    reportSchemaDrift('strategy/fixture', issuesOf(bad), '/api/x')

    expect(reports).toHaveLength(1)
    const [r] = reports
    expect(r.schema).toBe('strategy/fixture')
    expect(r.url).toBe('/api/x')
    expect(r.fields).toEqual([
      'items[].id (invalid_type, expected number)',
      'items[].symbols (invalid_type, expected array)',
      'items[].side (invalid_value)',
    ])
    expect(JSON.stringify(reports)).not.toContain(secret)
    expect(JSON.stringify(reports)).not.toContain('U0000001')
  })

  it('reports the same field again under another schema, and a new field under the same one', () => {
    const bad = { items: [{ id: 1, symbols: null, side: 'buy' }] }
    reportSchemaDrift('a', issuesOf(bad))
    reportSchemaDrift('b', issuesOf(bad))
    reportSchemaDrift('a', issuesOf({ items: [{ id: 'x', symbols: [], side: 'buy' }] }))
    expect(reports.map((r) => [r.schema, r.fields])).toEqual([
      ['a', ['items[].symbols (invalid_type, expected array)']],
      ['b', ['items[].symbols (invalid_type, expected array)']],
      ['a', ['items[].id (invalid_type, expected number)']],
    ])
  })

  it('stops after MAX_REPORTS with one line saying so', () => {
    const bad = { items: [{ id: 1, symbols: null, side: 'buy' }] }
    for (let i = 0; i < MAX_REPORTS + 5; i++) reportSchemaDrift(`schema-${i}`, issuesOf(bad))
    expect(reports).toHaveLength(MAX_REPORTS + 1)
    expect(reports[MAX_REPORTS].fields[0]).toMatch(/not reported/)
  })

  it('writes one console.warn per report by default', () => {
    setSchemaDriftSink(prev)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    reportSchemaDrift('strategy/fixture', issuesOf({ items: [{ id: 1, symbols: null, side: 'buy' }] }), '/api/y?q=1')
    reportSchemaDrift('strategy/fixture', issuesOf({ items: [{ id: 1, symbols: null, side: 'buy' }] }), '/api/y?q=1')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0][0]).toBe(
      '[api-schema-drift] strategy/fixture /api/y: items[].symbols (invalid_type, expected array)',
    )
    warn.mockRestore()
  })
})

describe('withValidation in production', () => {
  let reports: SchemaDriftReport[]
  let prev: SchemaDriftSink

  beforeEach(() => {
    reports = []
    resetSchemaDriftReports()
    prev = setSchemaDriftSink((r) => reports.push(r))
    vi.stubEnv('DEV', false)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    setSchemaDriftSink(prev)
    resetSchemaDriftReports()
  })

  it('passes a drifted answer through and records it', () => {
    const validate = withValidation<unknown>(List, 'strategy/fixture')
    const bad = { items: [{ id: 1, symbols: null, side: 'buy' }] }
    expect(validate(bad, '/api/strategy/strategies/fixture?active_only=false')).toBe(bad)
    expect(reports).toEqual([
      {
        schema: 'strategy/fixture',
        url: '/api/strategy/strategies/fixture',
        fields: ['items[].symbols (invalid_type, expected array)'],
      },
    ])
  })

  it('records nothing for an answer that fits', () => {
    const validate = withValidation<unknown>(List, 'strategy/fixture')
    validate({ items: [{ id: 1, symbols: [], side: 'sell' }] })
    expect(reports).toEqual([])
  })
})
