/**
 * TD-50 batch 3b: the Research-engine modules go through requestJson. Each keeps failing
 * the way it did — the envelope readers throw, the 404 readers answer null / [] / their
 * empty shape, the bridge's 429 is still a `{ ok: false }` answer, dismiss is still
 * best-effort — but a refusal now reads in the server's own words. Ids, symbols and
 * messages are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveAllRun,
  batchRunObjective,
  createObjective,
  fetchObjectiveRunIfKept,
  fetchObjectives,
} from '@/api/research/harness'
import { fetchSepaCandidates, fetchTerrain, fetchTerrainIntraday } from '@/api/researchEngine'
import { deletePolicyTemplate, fetchPolicyTemplates } from '@/api/research/policyTemplate'
import { dismissCopilotWrite, executeCopilotWrite, fetchCopilotUsage } from '@/api/aiCopilot'
import { archiveCopilotSession, fetchCopilotSessions, patchCopilotSession } from '@/api/researchCopilotSessions'
import { dismissCandidate, fetchCandidates } from '@/api/research/candidates'
import { fetchSignalDecay } from '@/api/research/signalDecay'
import { fetchBridgePresets, postCopilotBridge } from '@/api/researchCopilotBridge'
import { fetchAtmIvTerm, fetchIvCone } from '@/api/research/volSurface'
import { fetchSignalHealth } from '@/api/research/similarRegime'
import { fetchNarrative } from '@/api/research/narrative'
import { fetchExhibitComposite } from '@/api/research/exhibit'
import { refreshHypothesisTrajectory } from '@/api/research/canonicalPnl'
import { fetchCandidateOutcomeRows } from '@/api/research/candidateOutcome'
import { fetchCopilotModels } from '@/api/researchCopilotModels'
import { fetchUniverseReach } from '@/api/research/universeReach'
import { fetchSymbolVerdicts } from '@/api/research/symbolVerdicts'
import { fetchSepaScreenerWide } from '@/api/research/sepaScreenerWide'
import { fetchScan } from '@/api/research/scan'
import { fetchPcrHistory } from '@/api/research/pcr'
import { fetchOrderIntents } from '@/api/research/orderIntents'
import { fetchOrchestrationStatus } from '@/api/research/orchestration'
import { fetchLensRegistry } from '@/api/research/lenses'
import { fetchLensCoverage } from '@/api/research/lensCoverage'
import { fetchResearchHealth } from '@/api/research/health'
import { fetchResearchDoc } from '@/api/research/docs'
import { fetchCopilotWrites } from '@/api/research/copilotWrites'
import { fetchCopilotTools } from '@/api/research/copilotTools'
import { fetchCopilotStanding } from '@/api/research/copilotStanding'
import { fetchAlerts } from '@/api/research/alertScan'
import { fetchIvRankHistory } from '@/api/research/ivRadar'
import { HttpError } from '@/lib/http'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  // The advisory validators warn in DEV when an invented payload does not match the schema.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const env = (data: unknown) => json({ ok: true, data })
const REFUSAL = { detail: 'Invented refusal.' }

/** One representative call per converted module (more where the module has special handling). */
const CALLS: [string, () => Promise<unknown>][] = [
  ['harness fetchObjectives', () => fetchObjectives()],
  ['harness createObjective', () => createObjective({ title: 'Invented', description: '' })],
  ['harness fetchObjectiveRunIfKept', () => fetchObjectiveRunIfKept('run-zz1')],
  ['harness approveAllRun', () => approveAllRun('run-zz1')],
  ['researchEngine fetchTerrain', () => fetchTerrain('ZZQ')],
  ['researchEngine fetchSepaCandidates', () => fetchSepaCandidates()],
  ['policyTemplate fetchPolicyTemplates', () => fetchPolicyTemplates()],
  ['policyTemplate deletePolicyTemplate', () => deletePolicyTemplate('tpl-zz1')],
  ['aiCopilot fetchCopilotUsage', () => fetchCopilotUsage()],
  ['aiCopilot executeCopilotWrite', () => executeCopilotWrite({ approval_token: 'tok-zz', tool_name: 'zz_tool', arguments: {} })],
  ['sessions fetchCopilotSessions', () => fetchCopilotSessions()],
  ['sessions archiveCopilotSession', () => archiveCopilotSession('sess-zz1')],
  ['candidates fetchCandidates', () => fetchCandidates()],
  ['candidates dismissCandidate', () => dismissCandidate('cand-zz1')],
  ['signalDecay fetchSignalDecay', () => fetchSignalDecay({ lens: 'iv_rank' })],
  ['bridge fetchBridgePresets', () => fetchBridgePresets()],
  ['bridge postCopilotBridge', () => postCopilotBridge('sess-zz1', { focus: 'portfolio_risk', depth: 'brief', target: 'generic' })],
  ['volSurface fetchIvCone', () => fetchIvCone('ZZQ')],
  ['volSurface fetchAtmIvTerm', () => fetchAtmIvTerm('ZZQ')],
  ['similarRegime fetchSignalHealth', () => fetchSignalHealth()],
  ['narrative fetchNarrative', () => fetchNarrative(7)],
  ['exhibit fetchExhibitComposite', () => fetchExhibitComposite(['iv_rank'], 'ZZQ')],
  ['canonicalPnl refreshHypothesisTrajectory', () => refreshHypothesisTrajectory('hyp-zz1')],
  ['candidateOutcome fetchCandidateOutcomeRows', () => fetchCandidateOutcomeRows()],
  ['copilot models', () => fetchCopilotModels()],
  ['universeReach', () => fetchUniverseReach()],
  ['symbolVerdicts', () => fetchSymbolVerdicts('ZZQ')],
  ['sepaScreenerWide', () => fetchSepaScreenerWide(10)],
  ['scan', () => fetchScan()],
  ['pcr', () => fetchPcrHistory('ZZQ')],
  ['orderIntents', () => fetchOrderIntents()],
  ['orchestration', () => fetchOrchestrationStatus()],
  ['lenses', () => fetchLensRegistry()],
  ['lensCoverage', () => fetchLensCoverage()],
  ['health', () => fetchResearchHealth()],
  ['docs', () => fetchResearchDoc('zz-doc')],
  ['copilotWrites', () => fetchCopilotWrites()],
  ['copilotTools', () => fetchCopilotTools()],
  ['copilotStanding', () => fetchCopilotStanding()],
  ['alertScan', () => fetchAlerts()],
  ['ivRadar fetchIvRankHistory', () => fetchIvRankHistory('ZZQ')],
]

describe('a refusal reads in the server words', () => {
  it.each(CALLS)('%s', async (_n, call) => {
    fetchMock.mockResolvedValueOnce(json(REFUSAL, 409))
    const err = await call().then(
      () => null,
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(HttpError)
    expect((err as HttpError).message).toBe('Invented refusal.')
    expect((err as HttpError).status).toBe(409)
  })
})

describe('success returns what the old code returned', () => {
  it('envelope readers return data', async () => {
    const cases: [() => Promise<unknown>, unknown][] = [
      [() => fetchObjectives(), { items: [], count: 0 }],
      [() => fetchPolicyTemplates(), { items: [] }],
      [() => fetchCandidates(), { items: [], count: 0 }],
      [() => fetchSignalDecay({ lens: 'iv_rank' }), { lens: 'iv_rank', trigger_count: 3 }],
      [() => fetchSignalHealth(), { zz: 'invented' }],
      [() => refreshHypothesisTrajectory('hyp-zz1'), { symbol: 'ZZQ', rows: [], count: 0 }],
      [() => fetchCandidateOutcomeRows(), { rows: [], count: 0 }],
      [() => fetchUniverseReach(), { zz: 1 }],
      [() => fetchSymbolVerdicts('ZZQ'), { symbol: 'ZZQ' }],
      [() => fetchScan(), { as_of: null, count: 0 }],
      [() => fetchOrderIntents(), { items: [], count: 0 }],
      [() => fetchOrchestrationStatus(), { schedules: [] }],
      [() => fetchLensRegistry(), { count: 0 }],
      [() => fetchLensCoverage(), { zz: 2 }],
      [() => fetchResearchDoc('zz-doc'), { slug: 'zz-doc' }],
      [() => fetchCopilotWrites(), { rows: [] }],
      [() => fetchCopilotTools(), { tools: [] }],
      [() => fetchCopilotStanding(), { db_ok: true }],
      [() => fetchAlerts(), { items: [], count: 0 }],
      [() => fetchBridgePresets(), { default_model: 'zz-model' }],
    ]
    for (const [call, data] of cases) {
      fetchMock.mockResolvedValueOnce(env(data))
      expect(await call()).toMatchObject(data as object)
    }
  })

  it('exhibit composite returns the exhibits', async () => {
    fetchMock.mockResolvedValueOnce(env({ symbol: 'ZZQ', lenses: ['iv_rank'], exhibits: [] }))
    expect(await fetchExhibitComposite(['iv_rank'], 'ZZQ')).toEqual([])
  })

  it('bare-payload readers return the body', async () => {
    fetchMock.mockResolvedValueOnce(json({ terrain: { regime: 'zz' }, symbol: 'ZZQ', trade_date: '2031-01-02' }))
    expect(await fetchTerrain('ZZQ')).toEqual({ terrain: { regime: 'zz' }, symbol: 'ZZQ', trade_date: '2031-01-02' })
    fetchMock.mockResolvedValueOnce(json({ tokens_today: 1, cost_estimate_usd: 0, cap_usd: 1, remaining_usd: 1 }))
    expect(await fetchCopilotUsage()).toMatchObject({ tokens_today: 1 })
    fetchMock.mockResolvedValueOnce(json({ available: [], default: null }))
    expect(await fetchCopilotModels()).toMatchObject({ available: [] })
    fetchMock.mockResolvedValueOnce(json({ status: 'ok', version: '0.0.0-zz' }))
    expect(await fetchResearchHealth()).toMatchObject({ status: 'ok' })
    fetchMock.mockResolvedValueOnce(json({ rows: [{ id: 'sess-zz1' }] }))
    expect(await fetchCopilotSessions()).toMatchObject([{ id: 'sess-zz1' }])
  })

  it('narrative returns the envelope data', async () => {
    fetchMock.mockResolvedValueOnce(env({ tags: [], count: 0 }))
    expect(await fetchNarrative(7)).toEqual({ tags: [], count: 0 })
  })

  it('sepa screener-wide maps the rows', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ ok: true, count: 1, rows: [{ symbol: 'zzq', overall_rank: 4, composite_score: 71, eval_date: '2031-01-02' }] }),
    )
    const out = await fetchSepaScreenerWide(10)
    expect(out.count).toBe(1)
    expect(out.evalDate).toBe('2031-01-02')
    expect(out.rows[0]).toMatchObject({ symbol: 'ZZQ', overall_rank: 4, composite_score: 71 })
  })

  it('atm-iv term and pcr / iv-rank history keep their shaping', async () => {
    fetchMock.mockResolvedValueOnce(
      json({ symbol: 'ZZQ', trade_date: '2031-01-02', term: [{ expiry: '2031-01-17T00:00:00', atm_iv: 0.3 }, { expiry: null, atm_iv: 0.2 }] }),
    )
    expect(await fetchAtmIvTerm('ZZQ')).toEqual({ symbol: 'ZZQ', trade_date: '2031-01-02', term: [{ expiry: '2031-01-17', atm_iv: 0.3 }] })
    fetchMock.mockResolvedValueOnce(json({ rows: [{ trade_date: '2031-01-03' }, { trade_date: '2031-01-02' }], count: 2 }))
    expect((await fetchPcrHistory('ZZQ')).map((r) => r.trade_date)).toEqual(['2031-01-02', '2031-01-03'])
    fetchMock.mockResolvedValueOnce(json({ symbol: 'ZZQ', rows: [] }))
    expect(await fetchIvRankHistory('ZZQ')).toEqual([])
  })

  it('writes send the method, JSON body and auth headers as before', async () => {
    fetchMock.mockResolvedValueOnce(env({ id: 'obj-zz1' }))
    await createObjective({ title: 'Invented', description: 'zz' })
    let [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/research/objectives')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(String(init?.body))).toEqual({ title: 'Invented', description: 'zz' })

    fetchMock.mockResolvedValueOnce(env({ run: { id: 'run-zz1' } }))
    await batchRunObjective('obj-zz1', { symbols: ['ZZQ'] })
    ;[url, init] = fetchMock.mock.calls[1]
    expect(String(url)).toContain('/research/objectives/obj-zz1/batch-run')
    expect(JSON.parse(String(init?.body))).toEqual({ curate_after: true, symbols: ['ZZQ'] })

    fetchMock.mockResolvedValueOnce(json({ session: { id: 'sess-zz1', pinned: true } }))
    expect(await patchCopilotSession('sess-zz1', { pinned: true })).toEqual({ id: 'sess-zz1', pinned: true })
    ;[, init] = fetchMock.mock.calls[2]
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(String(init?.body))).toEqual({ pinned: true })

    fetchMock.mockResolvedValueOnce(env({ deleted: true }))
    expect(await deletePolicyTemplate('tpl-zz1')).toEqual({ deleted: true })
    expect(fetchMock.mock.calls[3][1]?.method).toBe('DELETE')
  })
})

describe('fallbacks and special handling are unchanged', () => {
  it('404 readers answer their empty shape', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'run not found' }, 404))
    expect(await fetchObjectiveRunIfKept('run-zz1')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ detail: 'No market terrain for symbol' }, 404))
    expect(await fetchTerrain('ZZQ')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ detail: 'Not Found' }, 404))
    expect(await fetchTerrainIntraday('ZZQ', '2031-01-02')).toEqual({ rows: [], count: 0, symbol: 'ZZQ', trade_date: '2031-01-02' })
    fetchMock.mockResolvedValueOnce(json({ detail: 'Not Found' }, 404))
    expect(await fetchSepaCandidates({ trade_date: '2031-01-02' })).toEqual({ trade_date: '2031-01-02', candidates: [], count: 0 })
    fetchMock.mockResolvedValueOnce(json({ detail: 'No ATM IV rows for symbol' }, 404))
    expect(await fetchIvCone('ZZQ')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ detail: 'No atm-iv rows for symbol' }, 404))
    expect(await fetchAtmIvTerm('ZZQ')).toBeNull()
    fetchMock.mockResolvedValueOnce(json({ detail: 'No pcr rows for symbol' }, 404))
    expect(await fetchPcrHistory('ZZQ')).toEqual([])
    fetchMock.mockResolvedValueOnce(json({ detail: 'No iv-percentile rows for symbol' }, 404))
    expect(await fetchIvRankHistory('ZZQ')).toEqual([])
  })

  it('a failure the server gives no reason for names the API and the status', async () => {
    const cases: [() => Promise<unknown>, string][] = [
      [() => fetchTerrain('ZZQ'), 'Research Engine: HTTP 500'],
      [() => fetchPolicyTemplates(), 'Policy templates: HTTP 500'],
      [() => archiveCopilotSession('sess-zz1'), 'archive: HTTP 500'],
      [() => fetchIvCone('ZZQ'), 'research /research/volatility/iv-cone: HTTP 500'],
      [() => fetchResearchHealth(), 'research health: HTTP 500'],
      [() => fetchNarrative(7), 'narrative: HTTP 500'],
    ]
    for (const [call, text] of cases) {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }))
      await expect(call()).rejects.toThrow(text)
    }
  })

  it('execute hands a 2xx ok: false back to the caller', async () => {
    const body = { ok: false, data: { result: { ok: false, error: 'zz tool refused' }, action: null } }
    fetchMock.mockResolvedValueOnce(json(body))
    expect(await executeCopilotWrite({ approval_token: 'tok-zz', tool_name: 'zz_tool', arguments: {} })).toEqual(body)
  })

  it('the bridge rate limit is still an answer with its wait', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: { error: 'bridge_rate_limit', retry_after_sec: 17 } }, 429))
    expect(await postCopilotBridge('sess-zz1', { focus: 'portfolio_risk', depth: 'brief', target: 'generic' })).toEqual({
      ok: false,
      error: 'bridge_rate_limit',
      retry_after_sec: 17,
    })
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
    expect(await postCopilotBridge('sess-zz1', { focus: 'portfolio_risk', depth: 'brief', target: 'generic' })).toEqual({
      ok: false,
      error: 'bridge_rate_limit',
      retry_after_sec: 60,
    })
  })

  it('dismiss stays best-effort', async () => {
    fetchMock.mockResolvedValueOnce(json(REFUSAL, 409))
    await expect(dismissCopilotWrite({ tool_name: 'zz_tool' })).resolves.toBeUndefined()
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(dismissCopilotWrite({ tool_name: 'zz_tool' })).resolves.toBeUndefined()
  })
})
