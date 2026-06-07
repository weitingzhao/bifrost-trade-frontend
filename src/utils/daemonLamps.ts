import type { DaemonHeartbeat, StatusResponse } from '@/types/monitor'
import {
  ibBrokerRedisHealthLamp,
  type IbBrokerServiceId,
} from '@/components/socket/ibBrokerConnectionModel'

export type ServiceLamp = 'green' | 'yellow' | 'red'
export type DaemonLamp = ServiceLamp | 'none'

function worst(lamps: ServiceLamp[]): ServiceLamp {
  if (lamps.some(l => l === 'red')) return 'red'
  if (lamps.some(l => l === 'yellow')) return 'yellow'
  return 'green'
}

function mapIngestLampToServiceLamp(lamp: string): ServiceLamp {
  if (lamp === 'green' || lamp === 'yellow' || lamp === 'red') return lamp
  return 'yellow'
}

export function ibServiceLamp(
  svc: IbBrokerServiceId,
  status: StatusResponse | null | undefined,
): { lamp: ServiceLamp; title: string } {
  const { lamp, title } = ibBrokerRedisHealthLamp(svc, status)
  return { lamp: mapIngestLampToServiceLamp(lamp), title }
}

export function computeIbBrokerGroupLamp(
  status: StatusResponse | null | undefined,
  hb: DaemonHeartbeat | null | undefined,
): { lamp: DaemonLamp; title: string } {
  if (!hb?.daemon_alive) {
    return { lamp: 'none', title: 'Daemon not running; broker services shown when daemon is up.' }
  }
  const op = ibServiceLamp('ib_operator', status)
  const ing = ibServiceLamp('ib_ingestor', status)
  const aa = ibServiceLamp('ib_account_agent', status)
  const roll = worst([op.lamp, ing.lamp, aa.lamp])
  if (roll === 'green') return { lamp: 'green', title: 'IB Operator, Ingestor, and Account Agent all healthy.' }
  const bad = [op, ing, aa].filter(s => s.lamp !== 'green').map(s => s.title)
  return { lamp: roll, title: bad.join(' · ') }
}

export function computeAccountSyncLamp(
  status: StatusResponse | null | undefined,
): { lamp: DaemonLamp; title: string } {
  if (!status) return { lamp: 'none', title: 'Monitor status not loaded.' }
  const hb = status.account_sync_daemon?.heartbeat
  if (!hb) return { lamp: 'red', title: 'No Account Sync Daemon heartbeat row.' }
  if (!hb.daemon_alive) return { lamp: 'red', title: 'Account Sync Daemon heartbeat stale (>35s).' }
  if (hb.last_ts == null) return { lamp: 'yellow', title: 'Account Sync Daemon alive but no timestamp.' }
  const ageSec = Date.now() / 1000 - hb.last_ts
  if (ageSec > 35) return { lamp: 'yellow', title: `Account Sync Daemon heartbeat ${Math.floor(ageSec)}s old.` }
  return { lamp: 'green', title: 'Account Sync Daemon healthy.' }
}

export function computeAccountSyncIbGroupLamp(
  status: StatusResponse | null | undefined,
): { lamp: DaemonLamp; title: string } {
  if (!status) return { lamp: 'none', title: 'Monitor status not loaded.' }
  const aa = ibServiceLamp('ib_account_agent', status)
  const sync = computeAccountSyncLamp(status)
  const syncLamp: ServiceLamp = sync.lamp === 'none' ? 'red' : sync.lamp
  const roll = worst([aa.lamp, syncLamp])
  if (roll === 'green') {
    return { lamp: 'green', title: 'IB Account Agent and Account Sync Daemon healthy.' }
  }
  const bad = [
    aa.lamp !== 'green' ? aa.title : null,
    syncLamp !== 'green' ? sync.title : null,
  ].filter(Boolean)
  return { lamp: roll, title: bad.join(' · ') }
}

export function computeStrategyTradingDaemonLamp(
  hb: DaemonHeartbeat | null | undefined,
  ibGroupLamp: DaemonLamp,
  suspended: boolean,
): DaemonLamp {
  if (!hb) return 'none'
  if (!hb.daemon_alive) return 'red'
  const heartbeatL: ServiceLamp = 'green'
  const ibL: ServiceLamp = ibGroupLamp === 'none' ? 'red' : ibGroupLamp
  const tradeL: ServiceLamp = suspended ? 'yellow' : 'green'
  return worst([heartbeatL, ibL, tradeL])
}
