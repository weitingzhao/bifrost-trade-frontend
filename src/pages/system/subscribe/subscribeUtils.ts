import type { Execution } from '@/types/positions'
import type {
  IbPositionRow,
  StatusResponse,
  StatusSocketIbAccountAgent,
} from '@/types/monitor'
import {
  ingestRedisHealthLamp,
  ingestRedisTruthyConnected,
  type IngestLamp,
} from '@/utils/socketIngestLamp'

export type SubscribeRowLamp = 'green' | 'yellow' | 'red' | 'none'

export function ingestLampToRowLamp(lamp: IngestLamp): 'green' | 'yellow' | 'red' {
  return lamp === 'gray' ? 'yellow' : lamp
}

export function rollupSubscribeHeaderLamp(
  status: StatusResponse | null | undefined,
): { lamp: SubscribeRowLamp; title: string } {
  const ing = ingestRedisHealthLamp('ib_ingestor', status)
  const aa = ingestRedisHealthLamp('ib_account_agent', status)
  const a = ingestLampToRowLamp(ing.lamp)
  const b = ingestLampToRowLamp(aa.lamp)
  if (a === 'red' || b === 'red') {
    return {
      lamp: 'red',
      title: 'One or more IB stream paths need attention (see IB services tab).',
    }
  }
  if (a === 'yellow' || b === 'yellow') {
    return {
      lamp: 'yellow',
      title: 'One or more IB stream paths need attention (see IB services tab).',
    }
  }
  return {
    lamp: 'green',
    title: 'IB Ingestor and Account Agent Redis paths look healthy (see IB services tab).',
  }
}

export function formatMsgAgeS(age: number | null | undefined): string {
  if (age == null || typeof age !== 'number' || !Number.isFinite(age)) return '—'
  if (age < 60) return `${Math.round(age)}s ago`
  if (age < 3600) return `${Math.round(age / 60)}m ago`
  return `${Math.round(age / 3600)}h ago`
}

export function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return String(n)
}

export function fmtDecimal(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return Number(n).toFixed(digits)
}

export function fmtConnected(v: unknown): string {
  if (v === undefined || v === null) return '—'
  return ingestRedisTruthyConnected(v) ? 'Yes' : 'No'
}

export function fmtMsgPerSec(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) return '—'
  if (rate > 0 && rate < 0.01) return '<0.01/s'
  if (rate < 10) return `${rate.toFixed(2)}/s`
  return `${rate.toFixed(1)}/s`
}

export function fmtProcessInService(aa: StatusSocketIbAccountAgent | null | undefined): string {
  if (aa == null) return '—'
  const hasAliveField =
    (aa.service_alive !== undefined && aa.service_alive !== null)
    || (aa.operator_alive !== undefined && aa.operator_alive !== null)
  if (!hasAliveField) return 'Yes'
  const alive =
    ingestRedisTruthyConnected(aa.service_alive) || ingestRedisTruthyConnected(aa.operator_alive)
  return alive ? 'Yes' : 'No'
}

export function formatPositionUpdated(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '—'
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export function formatExecutionTime(ex: Execution): string {
  if (ex.time != null && Number.isFinite(Number(ex.time))) {
    const d = new Date(Number(ex.time) * 1000)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    }
  }
  if (ex.trade_date) return ex.trade_date
  return '—'
}

export function truncateContractKey(key: string, max = 44): string {
  if (key.length <= max) return key
  return `${key.slice(0, max - 1)}…`
}

export function getSubscribeChannel(status: StatusResponse | null | undefined): string {
  return (status?.config?.redis?.subscribe_channel ?? 'ib:ingester:channel').toString()
}

export function hasSecondaryIbConfigured(status: StatusResponse | null | undefined): boolean {
  return !!(
    status?.config?.ib_client?.client?.secondary_host_ip
    ?? status?.config?.ib_client?.port?.listener_secondary != null
  )
}

export function getEventAccountIds(status: StatusResponse | null | undefined): {
  streamHostAccountId: string
  streamSecondaryAccountId: string
  hasSecondaryIb: boolean
} {
  const streamHostAccountId = (status?.config?.ib_client?.account?.event_host ?? '').toString().trim()
  const streamSecondaryAccountId = (status?.config?.ib_client?.account?.event_secondary ?? '')
    .toString()
    .trim()
  const hasSecondaryIb = hasSecondaryIbConfigured(status)
  return { streamHostAccountId, streamSecondaryAccountId, hasSecondaryIb }
}

export type PositionTableRow = { accountId: string; p: IbPositionRow }

export function buildPositionRows(status: StatusResponse | null | undefined): {
  rows: PositionTableRow[]
  showAccountColumn: boolean
  filterHint: string
} {
  const { streamHostAccountId, streamSecondaryAccountId, hasSecondaryIb } =
    getEventAccountIds(status)
  const positionFilterAccountIds = new Set<string>()
  if (streamHostAccountId) positionFilterAccountIds.add(streamHostAccountId)
  if (hasSecondaryIb && streamSecondaryAccountId) {
    positionFilterAccountIds.add(streamSecondaryAccountId)
  }

  const rows: PositionTableRow[] = []
  for (const acc of status?.portfolio?.accounts ?? []) {
    const aid = (acc.account_id ?? '').toString().trim()
    if (positionFilterAccountIds.size > 0 && aid && !positionFilterAccountIds.has(aid)) continue
    for (const p of acc.positions ?? []) {
      rows.push({ accountId: aid || (p.account ?? '').toString(), p })
    }
  }

  const filterHint =
    positionFilterAccountIds.size > 0
      ? ` Filtered to configured event account${positionFilterAccountIds.size > 1 ? 's' : ''}.`
      : ' All accounts shown.'

  return {
    rows,
    showAccountColumn: positionFilterAccountIds.size === 0,
    filterHint,
  }
}

export function countOpenOrders(
  status: StatusResponse | null | undefined,
): { host: number; secondary: number } {
  const { streamHostAccountId, streamSecondaryAccountId } = getEventAccountIds(status)
  const openOrdersList = status?.portfolio?.open_orders ?? []
  const host = streamHostAccountId
    ? openOrdersList.filter(o => (o.account_id ?? '').toString().trim() === streamHostAccountId)
        .length
    : openOrdersList.length
  const secondary = streamSecondaryAccountId
    ? openOrdersList.filter(
        o => (o.account_id ?? '').toString().trim() === streamSecondaryAccountId,
      ).length
    : 0
  return { host, secondary }
}

export function executionQty(ex: Execution): number | null | undefined {
  return ex.quantity ?? ex.qty
}

export function openOrderRowLamp(
  daemonAlive: boolean | undefined,
  count: number,
): SubscribeRowLamp {
  if (!daemonAlive) return 'red'
  return count > 0 ? 'green' : 'none'
}
