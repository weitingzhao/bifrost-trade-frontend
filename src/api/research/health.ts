/**
 * Research API `/health` — the process's own facts, read-only.
 *
 * The Orchestration page reads one of them: which path the persona eval chain
 * takes (`persona_eval_agents`, research 0.112.0+). It is this API process's
 * flag; the harness CronJob carries its own copy. Changing it is a deployment
 * act and lives in Ops.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { ResearchHealthSchema } from '@/lib/schemas/research'

export interface ResearchHealth {
  status: string
  version: string
  /** Absent before research 0.112.0. */
  persona_eval_agents?: boolean
}

const validateHealth = withValidation<ResearchHealth>(ResearchHealthSchema, 'research/health')

export async function fetchResearchHealth(): Promise<ResearchHealth> {
  const res = await fetch(researchEngineUrl('/health'))
  if (!res.ok) throw new Error(`research health: ${res.status}`)
  return validateHealth(await res.json())
}
