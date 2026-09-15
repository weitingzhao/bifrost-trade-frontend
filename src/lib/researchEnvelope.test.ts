import { describe, expect, it } from 'vitest'
import { ResearchHttpError } from '@/lib/auth/researchHttpError'
import { unwrapResearchEnvelope } from './researchEnvelope'

describe('unwrapResearchEnvelope', () => {
  it('throws ResearchHttpError with the HTTP status on 401', async () => {
    const res = new Response(JSON.stringify({ ok: false, error: 'nope' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
    await expect(unwrapResearchEnvelope(res, { apiLabel: 'Copilot standing' })).rejects.toSatisfy(
      (err: unknown) => err instanceof ResearchHttpError && err.status === 401,
    )
  })
})
