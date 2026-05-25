import type { StatusResponse } from '@/types/monitor'

export type LampColor = 'green' | 'yellow' | 'red' | 'none'

export function computeMarketStreamsLamp(status: StatusResponse | undefined): LampColor {
  if (!status) return 'none'
  const quotesOk = status.market_data?.quotes_redis_reader_ok ?? false
  const ingestorConnected = status.socket?.ib_ingestor?.connected ?? false
  if (quotesOk && ingestorConnected) return 'green'
  if (quotesOk || ingestorConnected) return 'yellow'
  return 'red'
}

export function computeOpenOrdersLamp(status: StatusResponse | undefined): LampColor {
  if (!status) return 'none'
  const hb = status.account_sync_daemon?.heartbeat
  if (!hb) return 'red'
  if (!hb.daemon_alive) return 'red'
  if (hb.last_ts == null) return 'yellow'
  const ageSec = (Date.now() / 1000) - hb.last_ts
  if (ageSec > 35) return 'yellow'
  return 'green'
}

export function computeLiveNavLamp(status: StatusResponse | undefined): { color: LampColor; title?: string } {
  const streams = computeMarketStreamsLamp(status)
  const orders = computeOpenOrdersLamp(status)
  if (streams === 'green' && orders === 'green') return { color: 'green' }
  if (streams === 'red' || orders === 'red') return { color: 'red', title: 'Market streams or open orders issue' }
  return { color: 'yellow', title: 'Partial connection issue' }
}
