import type {
  ExecutionsFreshnessResponse,
  TwsFetchResponse,
  FlexFetchResponse,
  FlexUploadResponse,
  PerformanceResponse,
  RawExecutionsResponse,
} from '@/types/trading'
import type {
  ExecutionsResponse,
  PositionAttributionResponse,
  CreateExecutionBody,
  UpdateExecutionBody,
} from '@/types/positions'

const BASE = import.meta.env.VITE_API_TRADING as string

export async function fetchExecutionsFreshness(): Promise<ExecutionsFreshnessResponse> {
  const res = await fetch(`${BASE}/executions/freshness`)
  if (!res.ok) throw new Error(`Trading /executions/freshness: ${res.status}`)
  return res.json() as Promise<ExecutionsFreshnessResponse>
}

export async function postTwsFetch(days: 1 | 3 | 7): Promise<TwsFetchResponse> {
  const res = await fetch(`${BASE}/executions/fetch?days=${days}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Trading /executions/fetch: ${res.status}`)
  return res.json() as Promise<TwsFetchResponse>
}

export async function postFlexFetch(): Promise<FlexFetchResponse> {
  const res = await fetch(`${BASE}/executions/fetch-flex`, { method: 'POST' })
  if (!res.ok) throw new Error(`Trading /executions/fetch-flex: ${res.status}`)
  return res.json() as Promise<FlexFetchResponse>
}

export async function postFlexUpload(xml: string): Promise<FlexUploadResponse> {
  const res = await fetch(`${BASE}/executions/fetch-flex-upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xml }),
  })
  if (!res.ok) throw new Error(`Trading /executions/fetch-flex-upload: ${res.status}`)
  return res.json() as Promise<FlexUploadResponse>
}

export async function fetchExecutions(source: 'final' | 'tws' | 'canonical' = 'final'): Promise<ExecutionsResponse> {
  const res = await fetch(`${BASE}/executions?source=${source}`)
  if (!res.ok) throw new Error(`Trading /executions?source=${source}: ${res.status}`)
  return res.json() as Promise<ExecutionsResponse>
}

export async function fetchPositionAttribution(): Promise<PositionAttributionResponse> {
  const res = await fetch(`${BASE}/position-attribution`)
  if (!res.ok) throw new Error(`Trading /position-attribution: ${res.status}`)
  return res.json() as Promise<PositionAttributionResponse>
}

export async function createExecution(body: CreateExecutionBody): Promise<{ ok: boolean; id?: number; error?: string }> {
  const res = await fetch(`${BASE}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST /executions: ${res.status}`)
  return res.json()
}

export async function updateExecution(
  id: number,
  body: UpdateExecutionBody,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/executions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT /executions/${id}: ${res.status}`)
  return res.json()
}

export async function deleteExecution(id: number): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${BASE}/executions/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE /executions/${id}: ${res.status}`)
  return res.json()
}

export async function fetchInstancePerformance(instanceId: number): Promise<PerformanceResponse> {
  const res = await fetch(`${BASE}/performance?strategy_instance_id=${instanceId}&summary_only=true`)
  if (!res.ok) throw new Error(`Trading /performance [${instanceId}]: ${res.status}`)
  return res.json() as Promise<PerformanceResponse>
}

export async function fetchInstanceExecutions(instanceId: number): Promise<RawExecutionsResponse> {
  const res = await fetch(
    `${BASE}/executions?strategy_instance_id=${instanceId}&source_scope=performance_book&limit=500`,
  )
  if (!res.ok) throw new Error(`Trading /executions [${instanceId}]: ${res.status}`)
  return res.json() as Promise<RawExecutionsResponse>
}
