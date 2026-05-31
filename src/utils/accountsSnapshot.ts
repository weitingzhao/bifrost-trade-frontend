import type { IbAccountSnapshot } from '@/types/monitor'
import type { StatusResponse } from '@/types/monitor'
import {
  ibPositionMarketValue,
  isLedgerCashLikeCategory,
  isLedgerFixedIncomeCategory,
} from '@/utils/stockCategories'

export function getNetLiq(a: IbAccountSnapshot): number {
  const v = a.summary?.NetLiquidation
  if (v == null) return 0
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

export function ibParsedTotalCashValue(account: IbAccountSnapshot): number {
  const cashRaw = account.summary?.TotalCashValue
  if (cashRaw == null) return 0
  const n = parseFloat(String(cashRaw))
  return Number.isFinite(n) ? n : 0
}

function cashLikeStkMv(account: IbAccountSnapshot): number {
  let mv = 0
  for (const pos of account.positions ?? []) {
    const st = (pos.secType ?? '').toUpperCase()
    if (st !== 'STK') continue
    if (isLedgerCashLikeCategory(String(pos.category ?? ''))) mv += ibPositionMarketValue(pos)
  }
  return mv
}

export function positionsGrossMarketValue(account: IbAccountSnapshot): number {
  let s = 0
  for (const pos of account.positions ?? []) {
    s += ibPositionMarketValue(pos)
  }
  return s
}

function fixedIncomeMv(account: IbAccountSnapshot): number {
  let mv = 0
  for (const pos of account.positions ?? []) {
    if (isLedgerFixedIncomeCategory(String(pos.category ?? ''))) mv += ibPositionMarketValue(pos)
  }
  return mv
}

function stkMarketValueExFiExCashLike(account: IbAccountSnapshot): number {
  let mv = 0
  for (const pos of account.positions ?? []) {
    const st = (pos.secType ?? '').toUpperCase()
    if (st !== 'STK') continue
    const cat = String(pos.category ?? '')
    if (isLedgerFixedIncomeCategory(cat)) continue
    if (isLedgerCashLikeCategory(cat)) continue
    mv += ibPositionMarketValue(pos)
  }
  return mv
}

export function totalCashIncludingCashLikePositions(account: IbAccountSnapshot): number {
  return ibParsedTotalCashValue(account) + cashLikeStkMv(account)
}

export interface PortfolioMetricRow {
  ibCash: number
  cashLike: number
  cashTotal: number
  positionsMv: number
  fixedIncomeMv: number
  stkExFiMv: number
  netLiq: number
  netLiqExFi: number
  cashPctExFi: number | null
  maxDdUsd: number
}

export interface PortfolioAccountTable {
  hostId: string | null
  secondaryId: string | null
  hostRow: PortfolioMetricRow | null
  secondaryRow: PortfolioMetricRow | null
  totalRow: PortfolioMetricRow
}

export function buildPortfolioAccountTable(
  status: StatusResponse | null | undefined,
  staticMaxDdPctCap: number,
): PortfolioAccountTable {
  const accounts = status?.portfolio?.accounts ?? []
  const ibAcc = status?.config?.ib_client?.account
  const hostId = (ibAcc?.event_host ?? ibAcc?.trading ?? '').toString().trim() || null
  const secondaryId = (ibAcc?.event_secondary ?? '').toString().trim() || null
  const findAcc = (id: string | null) =>
    id ? accounts.find(x => (x.account_id ?? '').toString().trim() === id) : undefined
  const hostAcc = findAcc(hostId)
  const secondaryAcc = findAcc(secondaryId)
  const pct = Math.max(5, Math.min(50, staticMaxDdPctCap)) / 100

  const rowFromAcc = (acc: IbAccountSnapshot | undefined): PortfolioMetricRow | null => {
    if (!acc) return null
    const ib = ibParsedTotalCashValue(acc)
    const cl = cashLikeStkMv(acc)
    const nl = getNetLiq(acc)
    const fiMv = fixedIncomeMv(acc)
    const stkEx = stkMarketValueExFiExCashLike(acc)
    const ct = ib + cl
    const netLiqExFi = Math.max(0, nl - fiMv)
    const cashPctExFi = netLiqExFi > 0 ? (ct / netLiqExFi) * 100 : null
    return {
      ibCash: ib,
      cashLike: cl,
      cashTotal: ct,
      positionsMv: positionsGrossMarketValue(acc),
      fixedIncomeMv: fiMv,
      stkExFiMv: stkEx,
      netLiq: nl,
      netLiqExFi,
      cashPctExFi,
      maxDdUsd: nl * pct,
    }
  }

  const sumAcc = (fn: (a: IbAccountSnapshot) => number) => accounts.reduce((s, a) => s + fn(a), 0)
  const totalNet = accounts.reduce((s, a) => s + getNetLiq(a), 0)
  const totalFiMv = sumAcc(fixedIncomeMv)
  const totalCashSum = sumAcc(totalCashIncludingCashLikePositions)
  const totalNetExFi = Math.max(0, totalNet - totalFiMv)

  return {
    hostId,
    secondaryId,
    hostRow: rowFromAcc(hostAcc),
    secondaryRow: rowFromAcc(secondaryAcc),
    totalRow: {
      ibCash: sumAcc(ibParsedTotalCashValue),
      cashLike: sumAcc(cashLikeStkMv),
      cashTotal: totalCashSum,
      positionsMv: sumAcc(positionsGrossMarketValue),
      fixedIncomeMv: totalFiMv,
      stkExFiMv: sumAcc(stkMarketValueExFiExCashLike),
      netLiq: totalNet,
      netLiqExFi: totalNetExFi,
      cashPctExFi: totalNetExFi > 0 ? (totalCashSum / totalNetExFi) * 100 : null,
      maxDdUsd: totalNet * pct,
    },
  }
}

export interface PortfolioCashRollup {
  totalCashMerged: number
  totalBuyingPower: number
  hostId: string | null
  secondaryId: string | null
  hostMerged: number | null
  hostReason: 'no_config' | 'no_account' | null
  secondaryMerged: number | null
  secondaryReason: 'no_config' | 'no_account' | null
}

export function buildPortfolioCashRollup(status: StatusResponse | null | undefined): PortfolioCashRollup {
  const accounts = status?.portfolio?.accounts ?? []
  const ibAcc = status?.config?.ib_client?.account
  const hostId = (ibAcc?.event_host ?? ibAcc?.trading ?? '').toString().trim() || null
  const secondaryId = (ibAcc?.event_secondary ?? '').toString().trim() || null

  let totalCashMerged = 0
  let totalBuyingPower = 0
  for (const a of accounts) {
    totalCashMerged += totalCashIncludingCashLikePositions(a)
    const bpRaw = a.summary?.BuyingPower
    if (bpRaw != null) {
      const n = parseFloat(String(bpRaw))
      if (Number.isFinite(n)) totalBuyingPower += n
    }
  }

  const findAcc = (id: string | null) =>
    id ? accounts.find(x => (x.account_id ?? '').toString().trim() === id) : undefined
  const hostAcc = findAcc(hostId)
  const secondaryAcc = findAcc(secondaryId)

  return {
    totalCashMerged,
    totalBuyingPower,
    hostId,
    secondaryId,
    hostMerged: hostId ? (hostAcc ? totalCashIncludingCashLikePositions(hostAcc) : null) : null,
    hostReason: !hostId ? 'no_config' : !hostAcc ? 'no_account' : null,
    secondaryMerged: secondaryId
      ? secondaryAcc
        ? totalCashIncludingCashLikePositions(secondaryAcc)
        : null
      : null,
    secondaryReason: !secondaryId ? 'no_config' : !secondaryAcc ? 'no_account' : null,
  }
}

export interface CashPieSlice {
  cash: number
  stkExFi: number
  other: number
  net: number
  cashPctOfNet: number
  stkPctOfNet: number
  otherPctOfNet: number
  cashTurnEnd: number
  stkTurnEnd: number
  netLiqExFi: number
  cashPctExFi: number | null
}

export function portfolioCashPieFromRow(
  row: Pick<PortfolioMetricRow, 'cashTotal' | 'netLiq' | 'netLiqExFi' | 'cashPctExFi' | 'stkExFiMv'> | null | undefined,
): CashPieSlice | null {
  if (!row) return null
  const cash = row.cashTotal
  const stkExFi = Math.max(0, row.stkExFiMv)
  const net = row.netLiq
  const other = Math.max(0, net - cash - stkExFi)
  const sumParts = cash + stkExFi + other
  const ringDenom = sumParts > 0 ? sumParts : 1e-9
  const cashR = cash / ringDenom
  const stkR = stkExFi / ringDenom
  return {
    cash,
    stkExFi,
    other,
    net,
    cashPctOfNet: net > 0 ? (cash / net) * 100 : 0,
    stkPctOfNet: net > 0 ? (stkExFi / net) * 100 : 0,
    otherPctOfNet: net > 0 ? (other / net) * 100 : 0,
    cashTurnEnd: cashR,
    stkTurnEnd: cashR + stkR,
    netLiqExFi: row.netLiqExFi,
    cashPctExFi: row.cashPctExFi,
  }
}

export function aggregateCapital(status: StatusResponse | null | undefined): number {
  const accounts = status?.portfolio?.accounts ?? []
  return accounts.reduce((sum, a) => sum + getNetLiq(a), 0)
}
