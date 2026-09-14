/**
 * Dagster schedule status — `GET /research/orchestration/status`.
 *
 * Whether each Research schedule is on and how its last run ended. It carries
 * no cron and no next tick (requested of Research,
 * `REQUEST-research-copilot-desk-2026-09-13.md` ④), so a reader can say when a
 * schedule last ran but not when it will run next.
 */
import { withValidation } from '@/lib/apiValidation'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'
import { OrchestrationStatusSchema } from '@/lib/schemas/research'

export interface OrchestrationSchedule {
  name: string
  job_name: string
  /** `RUNNING` / `STOPPED`, or `unknown` when Dagster could not say. */
  status: string
  last_run_status: string | null
  last_run_ended_at: string | null
  last_run_id: string | null
}

export interface OrchestrationStatus {
  verdict?: string
  as_of?: string
  schedules: OrchestrationSchedule[]
}

const validate = withValidation<OrchestrationStatus>(OrchestrationStatusSchema, 'research/orchestration/status')

export async function fetchOrchestrationStatus(): Promise<OrchestrationStatus> {
  const res = await fetch(researchEngineUrl('/research/orchestration/status'), {
    headers: getResearchAuthHeaders(),
  })
  return validate(await unwrapResearchEnvelope(res, { apiLabel: 'Orchestration status' }))
}
