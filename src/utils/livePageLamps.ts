import type { StatusResponse } from '@/types/monitor'
import type { LampTone } from '@/lib/lampTone'
import type { QuoteItem } from '@/types/market'
import { ibBrokerPlatformGatewayLabel, isPlatformIbGatewayActive } from '@/utils/platformIbGateway'
import { ingestRedisHealthLamp, ingestRedisTruthyConnected } from '@/utils/socketIngestLamp'

function liveIbServiceLabel(
  serviceId: 'ib_operator' | 'ib_ingestor' | 'ib_account_agent',
  status: StatusResponse,
): string {
  if (isPlatformIbGatewayActive(status)) {
    return ibBrokerPlatformGatewayLabel(serviceId)
  }
  if (serviceId === 'ib_operator') return 'IB Operator'
  if (serviceId === 'ib_ingestor') return 'IB Ingestor'
  return 'IB Account Agent'
}

/** A quote older than this is not the tape any more. The lamp and the
 *  header's `streams N/M` count answer to the same number. */
export const RECENT_QUOTE_MAX_AGE_S = 60
export const ACCOUNT_SYNC_HEARTBEAT_MAX_AGE_S = 35

/**
 * A lamp that can also be absent. `none` is not a spelling of grey: grey is a
 * lamp reading unknown, `none` is no lamp at all — navLampIcon renders it as
 * sidebar chrome. Named apart from the freshness lamp type because the two
 * used to share one name while holding different sets of states.
 */
export type LiveLamp = LampTone | 'none'

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

/**
 * How many streamed symbols have a quote young enough to call live — the
 * design header's `streams N/M`.
 *
 * It lives beside the lamp because the two must answer to the same number: a
 * green lamp over a count of zero, or the reverse, is the page arguing with
 * itself about whether the tape is running.
 */
export function countFreshQuotes(
  quotesMap: Record<string, QuoteItem>,
  /**
   * What the page asked to stream — symbols and contract keys. Counting the
   * map itself instead reads 27 of 23: the map holds option contracts as well
   * as symbols, and a fraction that can invert is worse than no fraction.
   */
  expectedKeys: readonly string[],
  nowSec: number = Date.now() / 1000,
): { fresh: number; total: number } {
  const cutoff = nowSec - RECENT_QUOTE_MAX_AGE_S
  let fresh = 0
  for (const key of new Set(expectedKeys)) {
    const q = quotesMap[key]
    if (q?.ts != null && q.ts >= cutoff) fresh += 1
  }
  return { fresh, total: new Set(expectedKeys).size }
}

export function computeMarketStreamsLamp(
  status: StatusResponse | undefined,
  quotesMap: Record<string, QuoteItem> = {},
): LiveLamp {
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

export function computeOpenOrdersLamp(status: StatusResponse | undefined): LiveLamp {
  if (!status) return 'none'
  if (computeOpenOrdersSectionOk(status)) return 'green'
  const hb = status.account_sync_daemon?.heartbeat
  if (!hb || !hb.daemon_alive) return 'red'
  return 'yellow'
}

/**
 * Sidebar Live nav lamp — Platform IB Gateway (redis-ib) + strategy daemon liveness.
 */
export function computeLiveNavLamp(
  status: StatusResponse | null | undefined,
  daemonAlive: boolean,
): { color: LiveLamp; title: string } {
  if (!status) {
    // Its own title says "cannot determine", and the two sibling lamps in this
    // file answer 'none' to the same input. Red here meant the sidebar showed a
    // fault on every page load until the monitor query resolved.
    return { color: 'none', title: 'Monitor status not loaded — cannot determine Live health.' }
  }

  const op = ingestRedisHealthLamp('ib_operator', status)
  const ing = ingestRedisHealthLamp('ib_ingestor', status)
  const aa = ingestRedisHealthLamp('ib_account_agent', status)
  const lamps = [op.lamp, ing.lamp, aa.lamp] as const
  const gatewayActive = isPlatformIbGatewayActive(status)

  const ibAllGreen = lamps.every(l => l === 'green')
  const ibAnyRed = lamps.some(l => l === 'red')

  const redParts: string[] = []
  if (op.lamp === 'red') redParts.push(`${liveIbServiceLabel('ib_operator', status)}: ${op.title}`)
  if (ing.lamp === 'red') redParts.push(`${liveIbServiceLabel('ib_ingestor', status)}: ${ing.title}`)
  if (aa.lamp === 'red') redParts.push(`${liveIbServiceLabel('ib_account_agent', status)}: ${aa.title}`)

  const degradedParts: string[] = []
  if (op.lamp !== 'green' && op.lamp !== 'red') {
    degradedParts.push(`${liveIbServiceLabel('ib_operator', status)}: ${op.title}`)
  }
  if (ing.lamp !== 'green' && ing.lamp !== 'red') {
    degradedParts.push(`${liveIbServiceLabel('ib_ingestor', status)}: ${ing.title}`)
  }
  if (aa.lamp !== 'green' && aa.lamp !== 'red') {
    degradedParts.push(`${liveIbServiceLabel('ib_account_agent', status)}: ${aa.title}`)
  }

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
        title: gatewayActive
          ? 'Platform IB Gateway healthy · Daemon not running — Open Orders unavailable.'
          : 'IB services healthy · Daemon not running — Open Orders unavailable.',
      }
    }
    const msg = degradedParts.join(' · ')
    return {
      color: 'yellow',
      title: gatewayActive
        ? `Daemon not running (Open Orders unavailable) · Platform IB Gateway degraded: ${msg}`
        : `Daemon not running (Open Orders unavailable) · IB degraded: ${msg}`,
    }
  }

  if (ibAllGreen) {
    return {
      color: 'green',
      title: gatewayActive
        ? 'Platform IB Gateway healthy · Daemon running.'
        : 'IB Broker Services healthy · Daemon running.',
    }
  }

  const msg = degradedParts.join(' · ')
  return {
    color: 'yellow',
    title: msg || (gatewayActive ? 'Platform IB Gateway degraded.' : 'IB services degraded.'),
  }
}
