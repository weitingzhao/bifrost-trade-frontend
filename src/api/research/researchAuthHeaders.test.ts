/**
 * Every Research route these modules call carries the Research user's bearer
 * (research 0.165.0 owner-gates the writes; the reads carry it too so a later
 * tightening of GET needs no change here). `tradeFetch` passes Research
 * requests through untouched, so only an explicit header reaches the server.
 * Signed out, nothing is added and nothing throws.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { researchAuthStore } from '@/lib/auth/researchUser'

const { sent } = vi.hoisted(() => ({ sent: [] as { url: string; method: string; auth: string | null }[] }))
vi.mock('@/lib/tradeFetch', () => ({
  tradeFetch: async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    sent.push({ url, method: init.method ?? 'GET', auth: headers.get('Authorization') })
    return new Response(JSON.stringify({ ok: true, data: {} }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  },
}))

const candidates = await import('./candidates')
const hypothesis = await import('@/api/researchHypothesis')
const canonical = await import('./canonicalPnl')
const harness = await import('./harness')
const templates = await import('./policyTemplate')
const screens = await import('./savedScreens')
const backtest = await import('./backtestEvent')
const intents = await import('./orderIntents')
const outcome = await import('./candidateOutcome')

/** Each call, by what it is; the payloads are placeholders — only the headers are read. */
const CALLS: [string, () => Promise<unknown>][] = [
  ['addCandidates', () => candidates.addCandidates([] as never)],
  ['promoteCandidate', () => candidates.promoteCandidate('c-1')],
  ['dismissCandidate', () => candidates.dismissCandidate('c-1')],
  ['fetchCandidates', () => candidates.fetchCandidates()],
  ['createHypothesis', () => hypothesis.createHypothesis({} as never)],
  ['patchHypothesis', () => hypothesis.patchHypothesis('h-1', {} as never)],
  ['listHypotheses', () => hypothesis.listHypotheses()],
  ['refreshHypothesisTrajectory', () => canonical.refreshHypothesisTrajectory('h-1')],
  ['createObjective', () => harness.createObjective({} as never)],
  ['runObjective', () => harness.runObjective('o-1')],
  ['setObjectiveStatus', () => harness.setObjectiveStatus('o-1', 'paused' as never)],
  ['deleteObjective', () => harness.deleteObjective('o-1')],
  ['deleteObjectiveRun', () => harness.deleteObjectiveRun('r-1')],
  ['curateRun', () => harness.curateRun('r-1')],
  ['fetchObjectives', () => harness.fetchObjectives()],
  ['fetchObjectiveRuns', () => harness.fetchObjectiveRuns()],
  ['createPolicyTemplate', () => templates.createPolicyTemplate({} as never)],
  ['patchPolicyTemplate', () => templates.patchPolicyTemplate('t-1', {})],
  ['deletePolicyTemplate', () => templates.deletePolicyTemplate('t-1')],
  ['fetchPolicyTemplates', () => templates.fetchPolicyTemplates()],
  ['createSavedScreen', () => screens.createSavedScreen({} as never)],
  ['fetchSavedScreens', () => screens.fetchSavedScreens()],
  ['postEventQuery', () => backtest.postEventQuery({} as never)],
  ['fetchBacktestRuns', () => backtest.fetchBacktestRuns()],
  ['fetchOrderIntents', () => intents.fetchOrderIntents()],
  ['fetchCandidateOutcomeSummary', () => outcome.fetchCandidateOutcomeSummary()],
]

async function authOf(call: () => Promise<unknown>): Promise<string | null> {
  sent.length = 0
  // A placeholder answer may not parse; only the request matters here.
  await call().catch(() => undefined)
  expect(sent.length).toBeGreaterThan(0)
  return sent[0].auth
}

beforeEach(() => {
  sent.length = 0
})
afterEach(() => {
  researchAuthStore.clear()
})

describe('Research requests carry the Research user’s bearer', () => {
  it.each(CALLS)('%s sends Authorization when a user is set', async (_name, call) => {
    researchAuthStore.setCredentials('tok-made-up', 'tester')
    expect(await authOf(call)).toBe('Bearer tok-made-up')
  })

  it.each(CALLS)('%s goes without it, and without error, when signed out', async (_name, call) => {
    researchAuthStore.clear()
    expect(await authOf(call)).toBeNull()
  })
})
