import { researchHttpStatus } from '@/lib/auth/researchHttpError'

export type ResearchAuthGapKind = 'not_set' | 'expired'

/**
 * Design 2026-09-15 Q2=A: 401 + no token is empty, 401 + token is failed.
 * Classification is HTTP status, not the error message.
 */
export function classifyResearchAuthError(
  error: unknown,
  token: string | null | undefined,
): ResearchAuthGapKind | null {
  if (researchHttpStatus(error) !== 401) return null
  return token?.trim() ? 'expired' : 'not_set'
}

export function firstResearchAuthGapError(...errors: unknown[]): unknown | undefined {
  return errors.find((e) => researchHttpStatus(e) === 401)
}
