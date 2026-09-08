/**
 * The Copilot's standing today — level 2 in one read.
 *
 * What the brief said, how many conversations were had, what the chat asked
 * to write and what was allowed, and what it cost. The Autopilot had this
 * shape first; the Research home shows the two beside each other.
 */
import { withValidation } from '@/lib/apiValidation'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'
import { CopilotStandingSchema } from '@/lib/schemas/research'
import type { CopilotUsage } from '@/api/aiCopilot'

export interface CopilotBriefToday {
  draft_id: string | null
  status: string | null
  created_at: string | null
  headline: string
  model?: string | null
}

export interface CopilotRecentSession {
  id: string
  title: string
  updated_at: string | null
  model?: string | null
  turns?: number | null
}

export interface CopilotStanding {
  day_utc: string | null
  brief: CopilotBriefToday | null
  sessions: { today: number; recent: CopilotRecentSession[] }
  approvals: Record<string, number>
  usage: CopilotUsage
  db_ok?: boolean
}

const validate = withValidation<CopilotStanding>(CopilotStandingSchema, 'research/copilot/standing')

export async function fetchCopilotStanding(): Promise<CopilotStanding> {
  const res = await fetch(researchEngineUrl('/research/copilot/standing'), {
    headers: getResearchAuthHeaders(),
  })
  return validate(await unwrapResearchEnvelope(res, { apiLabel: 'Copilot standing' }))
}
