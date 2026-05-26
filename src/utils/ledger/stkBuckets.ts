import type { StatusResponse, IbPositionRow } from '@/types/monitor'
import type { Execution } from '@/types/positions'

export type StkLedgerBucket = 'stocks' | 'fixed_income' | 'cash_like'
export type PerformanceCalendarAssetTab = 'options' | StkLedgerBucket

export function stkContractKey(symbol: string, accountId: string): string {
  return `${accountId.trim()}|${symbol.trim().toUpperCase()}|STK|||`
}

export function buildPositionCategoryByAccountContract(
  status: StatusResponse | null | undefined,
): Map<string, string> {
  const map = new Map<string, string>()
  if (!status?.portfolio?.accounts) return map

  for (const acct of status.portfolio.accounts) {
    const aid = acct.account_id ?? ''
    for (const pos of acct.positions ?? []) {
      const ck = pos.contract_key?.trim()
      if (!ck) continue
      const cat = (pos.category ?? '').trim()
      if (cat) map.set(`${aid}|${ck}`, cat)
    }
  }
  return map
}

export function serializePositionCategoryKey(
  status: StatusResponse | null | undefined,
): string {
  const map = buildPositionCategoryByAccountContract(status)
  const entries = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}|${v}`)
  return entries.join('\n')
}

function classifyCategory(cat: string): StkLedgerBucket {
  const lower = cat.toLowerCase()
  if (lower.includes('fixed income') || lower.includes('fix income')) return 'fixed_income'
  if (
    lower.includes('cash like') ||
    lower.includes('cash-like') ||
    lower.includes('cash equivalent') ||
    lower.includes('money market')
  ) {
    return 'cash_like'
  }
  return 'stocks'
}

export function getStkLedgerBucketForExecution(
  ex: Execution,
  positionCategoryByAccountContract: Map<string, string>,
): StkLedgerBucket | null {
  if (ex.sec_type !== 'STK') return null
  const key = `${ex.account_id}|${stkContractKey(ex.symbol, ex.account_id)}`
  const simpleKey = `${ex.account_id}|${ex.contract_key?.trim() ?? stkContractKey(ex.symbol, ex.account_id)}`
  const cat = positionCategoryByAccountContract.get(simpleKey)
    ?? positionCategoryByAccountContract.get(key)
    ?? '—'
  return classifyCategory(cat)
}

function getStkBucketForPosition(pos: IbPositionRow): StkLedgerBucket {
  const secType = pos.secType ?? ''
  if (secType !== 'STK') return 'stocks'
  const cat = (pos.category ?? '').trim() || '—'
  return classifyCategory(cat)
}

export function sumStkUnrealizedPnlForBucket(
  status: StatusResponse | null | undefined,
  bucket: StkLedgerBucket,
): number | null {
  if (!status?.portfolio?.accounts) return null
  let total = 0
  let found = false

  for (const acct of status.portfolio.accounts) {
    for (const pos of acct.positions ?? []) {
      if ((pos.secType ?? '') !== 'STK') continue
      if (getStkBucketForPosition(pos) !== bucket) continue
      if (pos.unrealized_pnl != null) {
        total += pos.unrealized_pnl
        found = true
      }
    }
  }
  return found ? total : null
}

export function sumStkPositionMarketValueForBucket(
  status: StatusResponse | null | undefined,
  bucket: StkLedgerBucket,
): number | null {
  if (!status?.portfolio?.accounts) return null
  let total = 0
  let found = false

  for (const acct of status.portfolio.accounts) {
    for (const pos of acct.positions ?? []) {
      if ((pos.secType ?? '') !== 'STK') continue
      if (getStkBucketForPosition(pos) !== bucket) continue
      const qty = pos.position ?? 0
      const price = pos.price ?? 0
      const mv = Math.abs(qty * price)
      if (mv > 0) {
        total += mv
        found = true
      }
    }
  }
  return found ? total : null
}

export function buildStkPositionSnapshotMap(
  status: StatusResponse | null | undefined,
): Map<string, { position: number; avgCost: number; price: number | null }> {
  const map = new Map<string, { position: number; avgCost: number; price: number | null }>()
  for (const acct of status?.portfolio?.accounts ?? []) {
    const aid = (acct.account_id ?? '').trim()
    for (const pos of acct.positions ?? []) {
      if ((pos.secType ?? '').toUpperCase() !== 'STK') continue
      const ck = pos.contract_key?.trim()
      if (!ck || !aid) continue
      const position = Number(pos.position ?? 0)
      const avgCost = Number(pos.avgCost ?? 0)
      const price = pos.price != null ? Number(pos.price) : null
      if (Number.isFinite(position) && Number.isFinite(avgCost)) {
        map.set(`${aid}|${ck}`, { position, avgCost, price })
      }
    }
  }
  return map
}

export function buildStkUnrealizedBySymbolAccount(
  status: StatusResponse | null | undefined,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const acct of status?.portfolio?.accounts ?? []) {
    const aid = (acct.account_id ?? '').trim()
    for (const pos of acct.positions ?? []) {
      if ((pos.secType ?? '').toUpperCase() !== 'STK') continue
      const sym = pos.symbol?.trim().toUpperCase()
      if (!sym || !aid) continue
      const u = Number(pos.unrealized_pnl ?? 0)
      if (Number.isFinite(u)) map.set(`${aid}|${sym}`, u)
    }
  }
  return map
}
