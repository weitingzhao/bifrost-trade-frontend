import type { LivePositionRow, OpenOptionPosition, InstancePositionGroup, PositionInstanceAttribution, Execution } from '@/types/positions'
import type { AccountFilter } from '@/utils/positionsGrouping'
import { positionMatchesAccountFilter } from '@/utils/positionsGrouping'
import { buildOffTrackPositions } from '@/utils/offTrackPositions'

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

function attributionAttrType(a: PositionInstanceAttribution): 'single' | 'mixed' | 'unassigned' {
  if (a.strategy_instance_id == null) return 'unassigned'
  return a.is_mixed ? 'mixed' : 'single'
}

export interface BuildInstanceGroupsInput {
  attributions: PositionInstanceAttribution[]
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
export function buildInstanceGroups(input: BuildInstanceGroupsInput): InstancePositionGroup[] {
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

  const byInstance = new Map<string, Bucket>()

  const addToInstance = (
    instId: number | null,
    instLabel: string | null,
    oppName: string | null,
    oppId: number | null,
    openedAt: number | null,
    pos: OpenOptionPosition,
  ) => {
    const key = instId != null ? String(instId) : '__unassigned__'
    const existing = byInstance.get(key)
    if (existing) {
      existing.positions.push(pos)
      if (existing.oppId == null && oppId != null) existing.oppId = oppId
    } else {
      byInstance.set(key, {
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
    const markPrice =
      livePos?.price != null && Number.isFinite(Number(livePos.price))
        ? Number(livePos.price)
        : a.price_mid != null && Number.isFinite(Number(a.price_mid))
          ? Number(a.price_mid)
          : a.price_last != null && Number.isFinite(Number(a.price_last))
            ? Number(a.price_last)
            : null
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
      unrealized_pnl: pnl,
      pool_label: 'On',
      account_id: acct,
      position: livePos,
      attribution_type: attributionAttrType(a),
      attribution_ratio: a.attribution_ratio,
      strategy_instance_id: a.strategy_instance_id,
      strategy_instance_label: a.strategy_instance_label,
      strategy_opportunity_name: a.strategy_opportunity_name,
    }
    addToInstance(
      a.strategy_instance_id,
      a.strategy_instance_label,
      a.strategy_opportunity_name,
      a.strategy_opportunity_id,
      a.strategy_instance_opened_at_epoch,
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
      ck || `${symbol}|OPT|${expiry}|${strike}|${(pos.right ?? '').toUpperCase().slice(0, 1)}`

    addToInstance(null, null, null, null, null, {
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
      addToInstance(null, null, null, null, null, p)
    }
  }

  const result: InstancePositionGroup[] = []
  for (const [, group] of byInstance) {
    group.positions.sort((a, b) => {
      const cmpSym = a.symbol.localeCompare(b.symbol)
      if (cmpSym !== 0) return cmpSym
      const cmpExp = a.expiry.localeCompare(b.expiry)
      if (cmpExp !== 0) return cmpExp
      return a.strike - b.strike
    })
    const totalPnl = group.positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
    result.push({
      strategy_instance_id: group.id,
      strategy_instance_label: group.label,
      strategy_opportunity_name: group.oppName,
      strategy_opportunity_id: group.oppId,
      strategy_instance_opened_at_epoch: group.openedAt,
      positions: group.positions,
      total_unrealized_pnl: totalPnl,
    })
  }

  result.sort((a, b) => {
    if (a.strategy_instance_id == null && b.strategy_instance_id != null) return 1
    if (a.strategy_instance_id != null && b.strategy_instance_id == null) return -1
    return (a.strategy_instance_label ?? '').localeCompare(b.strategy_instance_label ?? '')
  })

  return result
}
