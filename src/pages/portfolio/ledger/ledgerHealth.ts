import type { Execution } from '@/types/positions'
import { fmtCcy } from '@/pages/portfolio/ledger/ledgerFormat'
import { fmtUsd } from '@/lib/format'
import {
  ledgerSourceBucket,
  unlinkCounts,
  unlinkNote,
  type LedgerUnlinkBasis,
} from '@/pages/portfolio/ledger/ledgerReconcile'

export type LedgerHealthTileId = 'closed_pnl' | 'executions' | 'commissions' | 'unlinked' | 'canonical'

export type LedgerHealthTile = {
  id: LedgerHealthTileId
  label: string
  value: string
  sub: string
  tone: 'pnl' | 'ink' | 'cost' | 'amber'
  pnl: number | null
  title: string
  go: 'explain' | 'reconcile'
}

export type LedgerHealthModel = {
  tiles: LedgerHealthTile[]
  unlink: { n: number; of: number; note: string; sub: string }
  sourceCounts: { flex: number; tws: number; journal: number; manual: number; other: number }
  commissionSum: number
  commissionRows: number
  onlyTws: number
}

function sourceCountsOf(rows: Execution[]): { flex: number; tws: number; journal: number; manual: number; other: number } {
  const out = { flex: 0, tws: 0, journal: 0, manual: 0, other: 0 }
  for (const e of rows) {
    out[ledgerSourceBucket(e.source)] += 1
  }
  return out
}

function sourceSub(c: { flex: number; tws: number; journal: number; manual: number; other: number }): string {
  const parts: string[] = []
  if (c.flex) parts.push(`${c.flex} flex`)
  if (c.tws) parts.push(`${c.tws} tws`)
  if (c.journal) parts.push(`${c.journal} journal`)
  if (c.manual) parts.push(`${c.manual} manual`)
  if (c.other) parts.push(`${c.other} other`)
  return parts.length > 0 ? parts.join(' · ') : 'no rows'
}

function commissionStats(book: Execution[]): { sum: number; rows: number } {
  let sum = 0
  let rows = 0
  for (const e of book) {
    if (e.commission == null || !Number.isFinite(Number(e.commission))) continue
    rows += 1
    sum += Number(e.commission)
  }
  return { sum, rows }
}

export function buildLedgerHealth(args: {
  canon: Execution[]
  book: Execution[]
  closedPnl: number
  sinceLabel: string
  unlinkBasis: LedgerUnlinkBasis
}): LedgerHealthModel {
  const sources = sourceCountsOf(args.canon)
  const comm = commissionStats(args.book)
  const unlink = unlinkCounts(args.canon, args.unlinkBasis)
  const onlyTws = sources.tws
  const subUnlink =
    args.unlinkBasis === 'options' ? 'option fills with no instance' : 'incl. every stock fill'

  const tiles: LedgerHealthTile[] = [
    {
      id: 'closed_pnl',
      label: `Closed P&L · ${args.sinceLabel}`,
      value: fmtCcy(args.closedPnl),
      sub: 'after commissions · book scope',
      tone: 'pnl',
      pnl: args.closedPnl,
      title: 'Open the derivation',
      go: 'explain',
    },
    {
      id: 'executions',
      label: 'Executions',
      value: String(args.canon.length),
      sub: sourceSub(sources),
      tone: 'ink',
      pnl: null,
      title: 'Open the source split',
      go: 'reconcile',
    },
    {
      id: 'commissions',
      label: 'Commissions',
      value: fmtUsd(comm.sum),
      sub: `charged on ${comm.rows} book rows`,
      tone: 'cost',
      pnl: comm.sum,
      title: 'Open the derivation',
      go: 'explain',
    },
    {
      id: 'unlinked',
      label: 'Unlinked',
      value: `${unlink.n} of ${unlink.of}`,
      sub: subUnlink,
      tone: 'amber',
      pnl: null,
      title: 'Not a fault — amber, never red',
      go: 'explain',
    },
    {
      id: 'canonical',
      label: 'Canonical vs book',
      value: `${args.canon.length} / ${args.book.length}`,
      sub: onlyTws > 0 ? `${onlyTws} rows only in TWS →` : 'no TWS-only rows',
      tone: onlyTws > 0 ? 'amber' : 'ink',
      pnl: null,
      title: 'Open the diff',
      go: 'reconcile',
    },
  ]

  return {
    tiles,
    unlink: { n: unlink.n, of: unlink.of, note: unlinkNote(unlink, args.unlinkBasis), sub: subUnlink },
    sourceCounts: sources,
    commissionSum: comm.sum,
    commissionRows: comm.rows,
    onlyTws,
  }
}
