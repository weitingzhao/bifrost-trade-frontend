import type { OpportunitiesResponse, StructuresResponse } from '@/types/positions'

const BASE = import.meta.env.VITE_API_STRATEGY as string

export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const res = await fetch(`${BASE}/opportunities`)
  if (!res.ok) throw new Error(`Strategy /opportunities: ${res.status}`)
  return res.json() as Promise<OpportunitiesResponse>
}

export async function fetchStructures(): Promise<StructuresResponse> {
  const res = await fetch(`${BASE}/structures`)
  if (!res.ok) throw new Error(`Strategy /structures: ${res.status}`)
  return res.json() as Promise<StructuresResponse>
}
