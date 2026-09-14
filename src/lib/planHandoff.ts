/**
 * Plan-this handoff — Symbol / Chain → Trade › Plans.
 *
 * Shell Spec: Plan carries source · rule · contract. Advisory only (D10) —
 * this store queues a draft intent on the desk; it never places an order.
 * Plans page is still thin; the queue is the contract until that page grows.
 */
import { STORAGE_KEYS } from '@/constants/storage'

export interface PlanHandoff {
  id: string
  symbol: string
  /** Where the exit was pressed — e.g. `symbol:volatility` or `symbol:chain`. */
  source: string
  sourceLabel: string
  /** Optional lens / rule id that framed the reading. */
  rule?: string | null
  /** Optional contract key or short label (e.g. `NVDA 2026-11-20 245C`). */
  contract?: string | null
  note?: string | null
  createdAt: string
}

const MAX_HANDOFFS = 40

function readQueue(): PlanHandoff[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.planHandoffs)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PlanHandoff[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(items: PlanHandoff[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.planHandoffs, JSON.stringify(items.slice(0, MAX_HANDOFFS)))
  } catch {
    // private mode — button still navigates; page shows empty
  }
}

export function listPlanHandoffs(): PlanHandoff[] {
  return readQueue()
}

export function pushPlanHandoff(
  input: Omit<PlanHandoff, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
): PlanHandoff {
  const item: PlanHandoff = {
    id: input.id ?? `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    symbol: input.symbol.trim().toUpperCase(),
    source: input.source,
    sourceLabel: input.sourceLabel,
    rule: input.rule ?? null,
    contract: input.contract ?? null,
    note: input.note ?? null,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
  writeQueue([item, ...readQueue().filter((h) => h.id !== item.id)])
  return item
}

export function dismissPlanHandoff(id: string): void {
  writeQueue(readQueue().filter((h) => h.id !== id))
}

export function clearPlanHandoffs(): void {
  writeQueue([])
}

/** Deep link into Plans, optionally highlighting the just-queued id. */
export function plansPath(handoffId?: string): string {
  if (!handoffId) return '/trade/plans'
  return `/trade/plans?handoff=${encodeURIComponent(handoffId)}`
}
