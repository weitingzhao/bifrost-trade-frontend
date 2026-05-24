import type { WorkersResponse, QueuesResponse } from '@/types/ops'

const BASE = import.meta.env.VITE_API_OPS as string

export async function fetchOpsWorkers(): Promise<WorkersResponse> {
  const res = await fetch(`${BASE}/ops/workers`)
  if (!res.ok) throw new Error(`Ops /workers: ${res.status}`)
  return res.json() as Promise<WorkersResponse>
}

export async function fetchOpsQueuesSummary(): Promise<QueuesResponse> {
  const res = await fetch(`${BASE}/ops/queues/summary`)
  if (!res.ok) throw new Error(`Ops /queues/summary: ${res.status}`)
  return res.json() as Promise<QueuesResponse>
}
