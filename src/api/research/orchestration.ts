/**
 * Dagster schedule status — `GET /research/orchestration/status`.
 *
 * Whether each Research schedule is on, when it last ran, and (D4) when it
 * next fires when RUNNING (`next_tick_at` from croniter on the stored cron).
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
  /** Cron expression from Dagster (UTC), when known. */
  cron_schedule?: string | null
  /** Next fire time when status is RUNNING; omitted/null when stopped. */
  next_tick_at?: string | null
}

export interface OrchestrationStatus {
  verdict?: string
  as_of?: string
  /** The nightly batch's own standing — passthrough fields the schema keeps. */
  job_name?: string
  last_run_status?: string | null
  last_run_ended_at?: string | null
  overdue?: boolean
  detail?: string
  schedules: OrchestrationSchedule[]
}

const validate = withValidation<OrchestrationStatus>(OrchestrationStatusSchema, 'research/orchestration/status')

export async function fetchOrchestrationStatus(): Promise<OrchestrationStatus> {
  const res = await fetch(researchEngineUrl('/research/orchestration/status'), {
    headers: getResearchAuthHeaders(),
  })
  return validate(await unwrapResearchEnvelope(res, { apiLabel: 'Orchestration status' }))
}
