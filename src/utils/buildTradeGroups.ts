import type {
  AttributionMarkSource,
  LivePositionRow,
  OpenOptionPosition,
  TradePositionGroup,
  PositionTradeAttribution,
  Execution,
} from '@/types/positions'
import type { AccountFilter } from '@/utils/positionsGrouping'
import { positionMatchesAccountFilter } from '@/utils/positionsGrouping'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'
import { optContractKey } from '@/utils/contractKey'
import { numericOrNull } from '@/utils/finite'

export function normalizeAvgCostPerShare(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(Number(raw))) return null
  const n = Number(raw)
  return n >= 10 ? n / 100 : n
}

export function optionExpiryMatchesFilter(expiryRaw: string, filterRaw: string): boolean {
  const f = filterRaw.replace(/\D/g, '')
  if (!f) return true
  const ex = (expiryRaw ?? '').replace(/\D/g, '')
  if (!ex) return false
  if (ex.length >= f.length) return ex.startsWith(f)
  return f.startsWith(ex)
}

function contractLabelSymbol(contractKey: string): string {
  const parts = (contractKey ?? '').split('|')
  return (parts[0] ?? '').trim()
}

/**
 * The leg's mark: the IB live position price, else the attribution row's live mid, else its
 * `price_last` — which from core 0.51.0 may be the vendor's close of `mark_date` (TD-171).
 * The row's `mark_source` / `mark_date` travel only with a price the row itself supplied;
 * undefined when IB priced the leg or the API predates them.
 */
function attributionMark(
  livePos: LivePositionRow | undefined,
  a: PositionTradeAttribution,
): { markPrice: number | null; markSource: AttributionMarkSource | null | undefined; markDate: string | null | undefined } {
  const ib = numericOrNull(livePos?.price)
  if (ib != null) return { markPrice: ib, markSource: undefined, markDate: undefined }
  const rowMark = numericOrNull(a.price_mid) ?? numericOrNull(a.price_last)
  if (rowMark == null) return { markPrice: null, markSource: undefined, markDate: undefined }
  return { markPrice: rowMark, markSource: a.mark_source, markDate: a.mark_date }
}

/**
 * "EOD 10-05" when the leg is marked at a vendor session close rather than a live quote
 * (core 0.51.0, TD-171) — the same tag TradeRecord prints beside a dated close; null otherwise.
 */
export function eodMarkLabel(pos: Pick<OpenOptionPosition, 'mark_source' | 'mark_date'>): string | null {
  if (pos.mark_source !== 'vendor_eod') return null
  const day = (pos.mark_date ?? '').slice(0, 10)
  return day.length === 10 ? `EOD ${day.slice(5)}` : 'EOD'
}

function attributionAttrType(a: PositionTradeAttribution): 'single' | 'mixed' | 'unassigned' {
  if (a.trade_id == null) return 'unassigned'
  return a.is_mixed ? 'mixed' : 'single'
}

export interface BuildTradeGroupsInput {
  attributions: PositionTradeAttribution[]
  liveOptions: LivePositionRow[]
  accountFilter: AccountFilter
  hostAccountId: string
  secondaryAccountId: string
  filterSymbol: string
  filterExpiry: string
  showOffTrack: boolean
  executionsFinal: Execution[]
}

/**
 * Legacy PositionsPage instanceGroups (L1698–1832): attribution API is the source of truth
 * for Strategy tab rows; live IB positions fill gaps; off-track optional.
 */
export function buildTradeGroups(input: BuildTradeGroupsInput): TradePositionGroup[] {
  const {
    attributions,
    liveOptions,
    accountFilter,
    hostAccountId,
    secondaryAccountId,
    filterSymbol,
    filterExpiry,
    showOffTrack,
    executionsFinal,
  } = input

  const symFilter = filterSymbol.trim().toUpperCase()
  const expFilter = filterExpiry.trim()

  const livePositionMap = new Map<string, LivePositionRow>()
  for (const pos of liveOptions) {
    const key = `${(pos.account_id ?? '').trim()}\x00${(pos.contract_key ?? '').trim()}`
    livePositionMap.set(key, pos)
  }

  type Bucket = {
    id: number | null
    label: string | null
    oppName: string | null
    oppId: number | null
    openedAt: number | null
    positions: OpenOptionPosition[]
  }

  const byTrade = new Map<string, Bucket>()

  const addToTrade = (
    instId: number | null,
    instLabel: string | null,
    oppName: string | null,
    oppId: number | null,
    openedAt: number | null,
    pos: OpenOptionPosition,
  ) => {
    const key = instId != null ? String(instId) : '__unassigned__'
    const existing = byTrade.get(key)
    if (existing) {
      existing.positions.push(pos)
      if (existing.oppId == null && oppId != null) existing.oppId = oppId
    } else {
      byTrade.set(key, {
        id: instId,
        label: instLabel,
        oppName,
        oppId,
        openedAt,
        positions: [pos],
      })
    }
  }

  const positionsHandledByAttribution = new Set<string>()

  for (const a of attributions) {
    if ((a.sec_type ?? '').toUpperCase() !== 'OPT') continue
    const acct = (a.account_id ?? '').trim()
    const ck = (a.contract_key ?? '').trim()
    if (!positionMatchesAccountFilter(acct, accountFilter, hostAccountId, secondaryAccountId)) continue
    if (symFilter && (a.symbol ?? '').toUpperCase() !== symFilter) continue
    if (expFilter && !optionExpiryMatchesFilter((a.expiry ?? '').trim(), expFilter)) continue

    positionsHandledByAttribution.add(`${acct}\x00${ck}`)

    const livePos = livePositionMap.get(`${acct}\x00${ck}`)
    const { markPrice, markSource, markDate } = attributionMark(livePos, a)
    const avgCostPerShare =
      livePos?.avgCost != null
        ? normalizeAvgCostPerShare(Number(livePos.avgCost))
        : normalizeAvgCostPerShare(a.avg_cost)
    const estQty = a.open_qty_est
    const pnl =
      markPrice != null && avgCostPerShare != null
        ? (markPrice - avgCostPerShare) * estQty * 100
        : (a.unrealized_pnl_est ?? 0)

    const pos: OpenOptionPosition = {
      kind: 'live',
      contract_key: ck,
      symbol: (a.symbol ?? contractLabelSymbol(ck)).toUpperCase(),
      strike: a.strike ?? 0,
      expiry: a.expiry ?? '',
      right: (a.option_right ?? '').toUpperCase().slice(0, 1),
      qty: estQty,
      avg_cost: avgCostPerShare,
      mark_price: markPrice,
      ...(markSource !== undefined ? { mark_source: markSource, mark_date: markDate ?? null } : {}),
      unrealized_pnl: pnl,
      pool_label: 'On',
      account_id: acct,
      position: livePos,
      attribution_type: attributionAttrType(a),
      attribution_ratio: a.attribution_ratio,
      trade_id: a.trade_id,
      trade_label: a.trade_label,
      strategy_opportunity_name: a.strategy_opportunity_name,
    }
    addToTrade(
      a.trade_id,
      a.trade_label,
      a.strategy_opportunity_name,
      a.strategy_opportunity_id,
      a.trade_opened_at_epoch,
      pos,
    )
  }

  for (const pos of liveOptions) {
    const acct = (pos.account_id ?? '').trim()
    const ck = (pos.contract_key ?? '').trim()
    if (positionsHandledByAttribution.has(`${acct}\x00${ck}`)) continue
    if (!positionMatchesAccountFilter(acct, accountFilter, hostAccountId, secondaryAccountId)) continue

    const expiry = pos.lastTradeDateOrContractMonth ?? pos.expiry ?? ''
    const strike = Number(pos.strike) || 0
    const symbol = (pos.symbol ?? '').toUpperCase()
    if (symFilter && symbol !== symFilter) continue
    if (expFilter && !optionExpiryMatchesFilter(expiry, expFilter)) continue

    const qty = Number(pos.position) || 0
    const avgCostPerShare = normalizeAvgCostPerShare(pos.avgCost)
    const markPrice = pos.price != null && Number.isFinite(Number(pos.price)) ? Number(pos.price) : null
    const pnl =
      markPrice != null && avgCostPerShare != null
        ? (markPrice - avgCostPerShare) * qty * 100
        : Number(pos.unrealized_pnl) || 0
    const contractKey =
      ck || optContractKey(symbol, expiry, strike, pos.right)

    addToTrade(null, null, null, null, null, {
      kind: 'live',
      contract_key: contractKey,
      symbol,
      strike,
      expiry,
      right: (pos.right ?? '').toUpperCase().slice(0, 1),
      qty,
      avg_cost: avgCostPerShare,
      mark_price: markPrice,
      unrealized_pnl: pnl,
      pool_label: 'On',
      account_id: acct,
      position: pos,
      attribution_type: 'unassigned',
    })
  }

  if (showOffTrack) {
    const offTrack = buildOffTrackPositions(executionsFinal, filterSymbol, filterExpiry)
    for (const p of offTrack) {
      addToTrade(null, null, null, null, null, p)
    }
  }

  const result: TradePositionGroup[] = []
  for (const [, group] of byTrade) {
    group.positions.sort((a, b) => {
      const cmpSym = a.symbol.localeCompare(b.symbol)
      if (cmpSym !== 0) return cmpSym
      const cmpExp = a.expiry.localeCompare(b.expiry)
      if (cmpExp !== 0) return cmpExp
      return a.strike - b.strike
    })
    const totalPnl = group.positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
    result.push({
      trade_id: group.id,
      trade_label: group.label,
      strategy_opportunity_name: group.oppName,
      strategy_opportunity_id: group.oppId,
      trade_opened_at_epoch: group.openedAt,
      positions: group.positions,
      total_unrealized_pnl: totalPnl,
    })
  }

  result.sort((a, b) => {
    if (a.trade_id == null && b.trade_id != null) return 1
    if (a.trade_id != null && b.trade_id == null) return -1
    return (a.trade_label ?? '').localeCompare(b.trade_label ?? '')
  })

  return result
}
