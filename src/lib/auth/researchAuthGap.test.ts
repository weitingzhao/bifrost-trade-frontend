import { describe, expect, it } from 'vitest'
import { ResearchHttpError } from './researchHttpError'
import { classifyResearchAuthError } from './researchAuthGap'

describe('classifyResearchAuthError', () => {
  it('treats 401 without a token as not_set', () => {
    expect(classifyResearchAuthError(new ResearchHttpError(401, 'whatever'), null)).toBe('not_set')
    expect(classifyResearchAuthError(new ResearchHttpError(401, 'sessions HTTP 401'), '')).toBe('not_set')
  })

  it('treats 401 with a token as expired', () => {
    expect(classifyResearchAuthError(new ResearchHttpError(401, 'sessions HTTP 401'), 'tok')).toBe(
      'expired',
    )
  })

  it('leaves other statuses as real failures', () => {
    expect(classifyResearchAuthError(new ResearchHttpError(500, 'boom'), null)).toBeNull()
    expect(classifyResearchAuthError(new Error('401 authorization required'), null)).toBeNull()
    expect(classifyResearchAuthError(new Error('authorization required'), 'tok')).toBeNull()
  })
})
