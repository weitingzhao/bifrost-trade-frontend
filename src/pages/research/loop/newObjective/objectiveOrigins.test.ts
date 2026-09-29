import { describe, expect, it } from 'vitest'
import type { ResearchObjective } from '@/api/research/harness'
import type { PolicyTemplate } from '@/api/research/policyTemplate'
import type { SavedScreen } from '@/api/research/savedScreens'
import { forkBody, objectiveOrigins } from './objectiveOrigins'

const obj = (id: string, over: Partial<ResearchObjective> = {}): ResearchObjective =>
  ({ id, title: `T ${id}`, description: 'd', schedule: 'daily_open', policy_json: { preset: 'x' }, persona: 'loop_curator', status: 'active', owner_id: 'o', created_at: null, ...over }) as ResearchObjective

describe('new objective — three origins (Rev .100)', () => {
  const objectives = [obj('a'), obj('b', { schedule: 'adhoc' }), obj('c', { schedule: 'adhoc' }), obj('z', { status: 'archived' })]
  const screens = [
    { id: 's1', name: 'Tight', is_active: true, retired_at: null, created_at: '2026-01-02T00:00:00Z' },
    { id: 's2', name: 'Old', is_active: false, retired_at: '2026-01-03', created_at: '2026-01-01T00:00:00Z' },
  ] as SavedScreen[]
  const templates = [{ id: 't1', name: 'Legacy', universe_mode: 'scan_legacy', is_default: true }] as PolicyTemplate[]

  it('promotes hand-run drafts and active screens, forks standing objectives, lists templates', () => {
    const [promote, fork, template] = objectiveOrigins({
      objectives,
      runsByObjective: new Map([['b', 2], ['a', 9]]),
      records: new Map([['a', { status: 'ok', scope: 'objective', hit_rate: 0.5, judged: 4, horizon_days: 5, avg_excess: null }]]),
      screens,
      templates,
    })
    expect(promote.picks.map((p) => [p.kind, p.id, p.meta])).toEqual([
      ['draft', 'b', 'draft · 2 hand-runs'],
      ['screen', 's1', 'saved screen · since 2026-01-02'],
    ])
    expect(fork.picks.map((p) => [p.id, p.meta])).toEqual([['a', 'hit 0.50 over 4 settled']])
    expect(template.picks.map((p) => p.meta)).toEqual(['scan_legacy · default'])
  })

  it('names why a column is empty rather than drawing nothing', () => {
    const [promote] = objectiveOrigins({ objectives: [obj('a')], runsByObjective: new Map(), records: new Map(), screens: [], templates: [] })
    expect(promote.picks).toEqual([])
    expect(promote.empty).toMatch(/Nothing to promote/)
  })

  it('forks with the policy copied and the lineage recorded, dropping the source’s own origin', () => {
    const src = obj('a', { policy_json: { preset: 'x', origin: { kind: 'memory', memory_id: 'M-1' } } })
    const body = forkBody(src, '2026-01-09')
    expect(body).toMatchObject({ title: 'T a · fork', schedule: 'adhoc', persona: 'loop_curator' })
    expect(body.policy_json).toEqual({ preset: 'x', origin: { kind: 'fork', objective_id: 'a', title: 'T a', at: '2026-01-09' } })
  })
})
