/**
 * Options path bridge: Book R ↔ Economic ↔ Total via same-day roll adjustments.
 */

import type { SameDayRollEvent } from '@/utils/ledger/sameDayOptionRolls'
import type { ByDayRangeData } from '@/types/trading'

export type OptionsModeBridgeSummary = {
  bookR: number
  open: number
  total: number
  economic: number
  /** Σ (cashRoll − bookCloseRealized) over in-range rolls. */
  sumRollAdj: number
  /** Economic − Total (= sumRollAdj − Open). */
  econMinusTotal: number
  /** Economic − Book R (= sumRollAdj). */
  econMinusBook: number
}

export type RollWithAdj = SameDayRollEvent & { adj: number }

/** Connected close→open rolls under one underlying + right. */
export type RollBridgeChain = {
  id: string
  underlying: string
  optionRight: string
  /** Chronological contract path, e.g. "90C exp → 105C exp → …". */
  pathLabel: string
  rolls: number
  qty: number
  bookClose: number
  cashRoll: number
  adj: number
  rows: RollWithAdj[]
}

export type RollUndGroup = {
  underlying: string
  rolls: number
  qty: number
  bookClose: number
  cashRoll: number
  adj: number
  chains: RollBridgeChain[]
}

export function sumBookOptRealizedInRange(opt: Record<string, { realized?: number }>): number {
  let s = 0
  for (const c of Object.values(opt)) s += c.realized ?? 0
  return s
}

export function sumEconomicOptInRange(
  byDay: ByDayRangeData,
): number {
  const { opt, economicOptByDay } = byDay
  let s = 0
  for (const d of Object.keys(opt).sort()) {
    s += economicOptByDay?.[d]?.delta ?? (opt[d]?.realized ?? 0)
  }
  return s
}

export function rollAdjustment(r: SameDayRollEvent): number {
  return r.cashRoll - r.bookCloseRealized
}

export function buildOptionsModeBridgeSummary(params: {
  byDayRangeData: ByDayRangeData
  openUnrealized: number
  sameDayRolls: SameDayRollEvent[]
}): OptionsModeBridgeSummary {
  const bookR = sumBookOptRealizedInRange(params.byDayRangeData.opt)
  const economic = sumEconomicOptInRange(params.byDayRangeData)
  const open = params.openUnrealized
  const total = bookR + open
  const sumRollAdj = params.sameDayRolls.reduce((s, r) => s + rollAdjustment(r), 0)
  return {
    bookR,
    open,
    total,
    economic,
    sumRollAdj,
    econMinusTotal: economic - total,
    econMinusBook: economic - bookR,
  }
}

/** Short label for roll table: underlying strike right expiry. */
export function shortOptContractKey(ck: string): string {
  const parts = ck.split('|')
  if (parts.length >= 5) {
    const und = (parts[0] ?? '').trim().split(/\s+/)[0] ?? ''
    const exp = parts[2] ?? ''
    const strike = parts[3] ?? ''
    const right = (parts[4] ?? '').toUpperCase().startsWith('P') ? 'P' : 'C'
    return `${und} ${strike}${right} ${exp}`
  }
  return ck.length > 36 ? `${ck.slice(0, 34)}…` : ck
}

/** Compact strike+right+expiry without repeating underlying. */
export function shortOptLegLabel(ck: string): string {
  const parts = ck.split('|')
  if (parts.length >= 5) {
    const exp = parts[2] ?? ''
    const strike = parts[3] ?? ''
    const right = (parts[4] ?? '').toUpperCase().startsWith('P') ? 'P' : 'C'
    return `${strike}${right} ${exp}`
  }
  return shortOptContractKey(ck)
}

function chainPathLabel(rows: RollWithAdj[]): string {
  const ordered: string[] = []
  const seen = new Set<string>()
  const sorted = [...rows].sort(
    (a, b) => a.dateStr.localeCompare(b.dateStr) || a.closeExecutionId - b.closeExecutionId,
  )
  for (const r of sorted) {
    for (const ck of [r.closeContractKey, r.openContractKey]) {
      if (seen.has(ck)) continue
      seen.add(ck)
      ordered.push(shortOptLegLabel(ck))
    }
  }
  return ordered.join(' → ')
}

/**
 * Group rolls by underlying, then into bridge chains: contracts linked by
 * close→open edges (same und + right) form one connected component.
 */
export function groupSameDayRollsByUndAndChain(
  rolls: SameDayRollEvent[],
): RollUndGroup[] {
  const withAdj: RollWithAdj[] = rolls.map((r) => ({ ...r, adj: rollAdjustment(r) }))

  const byBucket = new Map<string, RollWithAdj[]>()
  for (const r of withAdj) {
    const key = `${r.underlying || '—'}\t${r.optionRight || '?'}`
    const arr = byBucket.get(key) ?? []
    arr.push(r)
    byBucket.set(key, arr)
  }

  const parent = new Map<string, string>()
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x)
    let p = parent.get(x)!
    while (p !== (parent.get(p) ?? p)) {
      const gp = parent.get(p) ?? p
      parent.set(p, gp)
      p = gp
    }
    return p
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  const undMap = new Map<string, RollUndGroup>()

  for (const [bucketKey, bucketRows] of byBucket) {
    const [underlying, optionRight] = bucketKey.split('\t') as [string, string]
    parent.clear()

    for (const r of bucketRows) {
      union(r.closeContractKey, r.openContractKey)
    }

    const chainsMap = new Map<string, RollWithAdj[]>()
    for (const r of bucketRows) {
      const root = find(r.closeContractKey)
      const arr = chainsMap.get(root) ?? []
      arr.push(r)
      chainsMap.set(root, arr)
    }

    const und = undMap.get(underlying) ?? {
      underlying,
      rolls: 0,
      qty: 0,
      bookClose: 0,
      cashRoll: 0,
      adj: 0,
      chains: [],
    }

    for (const [root, rows] of chainsMap) {
      rows.sort(
        (a, b) => a.dateStr.localeCompare(b.dateStr) || Math.abs(b.adj) - Math.abs(a.adj),
      )
      const chain: RollBridgeChain = {
        id: `${underlying}|${optionRight}|${root}`,
        underlying,
        optionRight,
        pathLabel: chainPathLabel(rows),
        rolls: rows.length,
        qty: rows.reduce((s, r) => s + r.qty, 0),
        bookClose: rows.reduce((s, r) => s + r.bookCloseRealized, 0),
        cashRoll: rows.reduce((s, r) => s + r.cashRoll, 0),
        adj: rows.reduce((s, r) => s + r.adj, 0),
        rows,
      }
      und.chains.push(chain)
      und.rolls += chain.rolls
      und.qty += chain.qty
      und.bookClose += chain.bookClose
      und.cashRoll += chain.cashRoll
      und.adj += chain.adj
    }

    undMap.set(underlying, und)
  }

  for (const und of undMap.values()) {
    und.chains.sort((a, b) => Math.abs(b.adj) - Math.abs(a.adj) || a.pathLabel.localeCompare(b.pathLabel))
  }

  return [...undMap.values()].sort(
    (a, b) => Math.abs(b.adj) - Math.abs(a.adj) || a.underlying.localeCompare(b.underlying),
  )
}

export type RollDayStep = {
  closeContractKey: string
  openContractKey: string
  fills: number
  qty: number
  bookClose: number
  cashRoll: number
  adj: number
  rows: RollWithAdj[]
}

/** One calendar day of rolls within a bridge chain + cash statement totals. */
export type RollDayStatement = {
  dateStr: string
  fills: number
  qty: number
  bookClose: number
  cashRoll: number
  adj: number
  steps: RollDayStep[]
}

/** Group chain fill rows by trade date, then by close→open pair. */
export function groupChainRowsByRollDay(rows: RollWithAdj[]): RollDayStatement[] {
  const byDate = new Map<string, RollWithAdj[]>()
  for (const r of rows) {
    const arr = byDate.get(r.dateStr) ?? []
    arr.push(r)
    byDate.set(r.dateStr, arr)
  }

  const days: RollDayStatement[] = []
  for (const dateStr of [...byDate.keys()].sort()) {
    const dayRows = byDate.get(dateStr)!
    const stepMap = new Map<string, RollWithAdj[]>()
    for (const r of dayRows) {
      const sk = `${r.closeContractKey}\t${r.openContractKey}`
      const arr = stepMap.get(sk) ?? []
      arr.push(r)
      stepMap.set(sk, arr)
    }
    const steps: RollDayStep[] = [...stepMap.entries()].map(([sk, srows]) => {
      const [closeContractKey, openContractKey] = sk.split('\t') as [string, string]
      return {
        closeContractKey,
        openContractKey,
        fills: srows.length,
        qty: srows.reduce((s, r) => s + r.qty, 0),
        bookClose: srows.reduce((s, r) => s + r.bookCloseRealized, 0),
        cashRoll: srows.reduce((s, r) => s + r.cashRoll, 0),
        adj: srows.reduce((s, r) => s + r.adj, 0),
        rows: srows,
      }
    })
    steps.sort((a, b) => Math.abs(b.adj) - Math.abs(a.adj))
    days.push({
      dateStr,
      fills: dayRows.length,
      qty: dayRows.reduce((s, r) => s + r.qty, 0),
      bookClose: dayRows.reduce((s, r) => s + r.bookCloseRealized, 0),
      cashRoll: dayRows.reduce((s, r) => s + r.cashRoll, 0),
      adj: dayRows.reduce((s, r) => s + r.adj, 0),
      steps,
    })
  }
  return days
}
