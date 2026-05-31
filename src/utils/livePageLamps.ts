import type { StatusResponse } from '@/types/monitor'
import type { QuoteItem } from '@/types/market'
import { ingestRedisHealthLamp, ingestRedisTruthyConnected } from '@/utils/socketIngestLamp'

const RECENT_QUOTE_MAX_AGE_S = 60
export const ACCOUNT_SYNC_HEARTBEAT_MAX_AGE_S = 35

export type LampColor = 'green' | 'yellow' | 'red' | 'none'

export function computeMarketStreamsOk(
  status: StatusResponse | null | undefined,
  quotesMap: Record<string, QuoteItem>,
): boolean {
  const now = Date.now() / 1000
  const hasRecentQuotes = Object.values(quotesMap).some(
    q => q.ts != null && now - q.ts < RECENT_QUOTE_MAX_AGE_S,
  )
  return (
    (status?.market_data?.quotes_redis_reader_ok === true &&
      ingestRedisTruthyConnected(status?.socket?.ib_ingestor?.connected)) ||
    hasRecentQuotes
  )
}

export function computeMarketStreamsLamp(
  status: StatusResponse | undefined,
  quotesMap: Record<string, QuoteItem> = {},
): LampColor {
  if (!status) return 'none'
  if (computeMarketStreamsOk(status, quotesMap)) return 'green'
  const quotesOk = status.market_data?.quotes_redis_reader_ok ?? false
  const ingestorConnected = ingestRedisTruthyConnected(status?.socket?.ib_ingestor?.connected)
  if (quotesOk || ingestorConnected) return 'yellow'
  return 'red'
}

export function computeOpenOrdersSectionOk(
  status: StatusResponse | null | undefined,
  nowSec: number = Date.now() / 1000,
): boolean {
  if (!status) return false
  const hb = status.account_sync_daemon?.heartbeat
  if (!hb) return false
  if (!hb.daemon_alive) return false
  if (hb.last_ts == null) return false
  const ageSec = nowSec - hb.last_ts
  if (ageSec > ACCOUNT_SYNC_HEARTBEAT_MAX_AGE_S) return false
  if (typeof hb.stream_lag === 'number' && hb.stream_lag > 50) return false
  return true
}

export function computeOpenOrdersLamp(status: StatusResponse | undefined): LampColor {
  if (!status) return 'none'
  if (computeOpenOrdersSectionOk(status)) return 'green'
  const hb = status.account_sync_daemon?.heartbeat
  if (!hb || !hb.daemon_alive) return 'red'
  return 'yellow'
}

/**
 * Sidebar Live nav lamp — Legacy semantics: IB ingest services + strategy daemon liveness.
 */
export function computeLiveNavLamp(
  status: StatusResponse | null | undefined,
  daemonAlive: boolean,
): { color: LampColor; title: string } {
  if (!status) {
    return { color: 'red', title: 'Monitor status not loaded — cannot determine Live health.' }
  }

  const op = ingestRedisHealthLamp('ib_operator', status)
  const ing = ingestRedisHealthLamp('ib_ingestor', status)
  const aa = ingestRedisHealthLamp('ib_account_agent', status)
  const lamps = [op.lamp, ing.lamp, aa.lamp] as const

  const ibAllGreen = lamps.every(l => l === 'green')
  const ibAnyRed = lamps.some(l => l === 'red')

  const redParts: string[] = []
  if (op.lamp === 'red') redParts.push(`IB Operator: ${op.title}`)
  if (ing.lamp === 'red') redParts.push(`IB Ingestor: ${ing.title}`)
  if (aa.lamp === 'red') redParts.push(`Account Agent: ${aa.title}`)

  const degradedParts: string[] = []
  if (op.lamp !== 'green' && op.lamp !== 'red') degradedParts.push(`IB Operator: ${op.title}`)
  if (ing.lamp !== 'green' && ing.lamp !== 'red') degradedParts.push(`IB Ingestor: ${ing.title}`)
  if (aa.lamp !== 'green' && aa.lamp !== 'red') degradedParts.push(`Account Agent: ${aa.title}`)

  if (ibAnyRed) {
    const ibMsg = redParts.join(' · ')
    if (!daemonAlive) {
      return {
        color: 'red',
        title: `Daemon not running (Open Orders unavailable) · ${ibMsg}`,
      }
    }
    return { color: 'red', title: ibMsg }
  }

  if (!daemonAlive) {
    if (ibAllGreen) {
      return {
        color: 'yellow',
        title: 'IB services healthy · Daemon not running — Open Orders unavailable.',
      }
    }
    const msg = degradedParts.join(' · ')
    return {
      color: 'yellow',
      title: `Daemon not running (Open Orders unavailable) · IB degraded: ${msg}`,
    }
  }

  if (ibAllGreen) {
    return { color: 'green', title: 'IB Broker Services healthy · Daemon running.' }
  }

  const msg = degradedParts.join(' · ')
  return { color: 'yellow', title: msg || 'IB services degraded.' }
}
