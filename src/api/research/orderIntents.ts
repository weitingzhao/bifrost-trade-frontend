/**
 * Order Intent Bridge API — Research Loop Wave O.
 *
 * Advisory only — D10 BLOCKED. Does not place orders.
 * Envelope: `{ ok, data, error? }`.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'

export interface OrderIntentPayload {
  hypothesis_id?: string
  strategy_template?: string
  rationale?: string
  legs?: unknown[]
  sizing_hint?: Record<string, unknown>
  risk_hint?: Record<string, unknown>
  expiry_at?: string | null
  advisory?: boolean
  d10?: string
  [key: string]: unknown
}

export interface OrderIntentDraft {
  id: string
  kind: string
  payload: OrderIntentPayload
  scope: string | null
  status: string
  generated_by: string | null
  linked_action_id: string | null
  created_at: string | null
  expires_at: string | null
}

export interface OrderIntentListResponse {
  items: OrderIntentDraft[]
  count: number
  advisory?: boolean
  d10?: string
}

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as Envelope<T> & { detail?: string }
  if (!res.ok || body.ok === false) {
    const msg = body.error ?? body.detail ?? `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`)
  }
  return body.data
}

export async function fetchOrderIntents(params?: {
  status?: string
  limit?: number
}): Promise<OrderIntentListResponse> {
  const q = new URLSearchParams()
  if (params?.status != null) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  const qs = q.toString()
  return unwrap(
    await fetch(`${researchEngineUrl('/research/order-intents')}${qs ? `?${qs}` : ''}`),
  )
}
