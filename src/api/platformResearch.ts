import { getOpsToken } from '@/api/ops'
import { platformApiUrl } from '@/lib/devApiUrl'

export interface ResearchCronJobTriggerResponse {
  ok: boolean
  job_name: string
  cronjob: string
  namespace: string
  started_at: string
  message?: string
  trigger_id: string
}

export async function triggerResearchCronJob(triggerId: string): Promise<ResearchCronJobTriggerResponse> {
  const token = getOpsToken().trim()
  const res = await fetch(platformApiUrl(`/research/cronjobs/${encodeURIComponent(triggerId)}/trigger`), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const text = await res.text()
  let body: ResearchCronJobTriggerResponse | { message?: string; error?: string }
  try {
    body = JSON.parse(text) as ResearchCronJobTriggerResponse
  } catch {
    throw new Error(`Platform API ${res.status}: ${text}`)
  }
  if (!res.ok) {
    const msg = body.message ?? (body as { error?: string }).error ?? text
    throw new Error(msg || `Platform API ${res.status}`)
  }
  return body as ResearchCronJobTriggerResponse
}
