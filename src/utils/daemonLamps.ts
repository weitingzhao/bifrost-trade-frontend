import type { DaemonHeartbeat, StatusResponse } from '@/types/monitor'

export type ServiceLamp = 'green' | 'yellow' | 'red'
export type DaemonLamp = ServiceLamp | 'none'

function worst(lamps: ServiceLamp[]): ServiceLamp {
  if (lamps.some(l => l === 'red')) return 'red'
  if (lamps.some(l => l === 'yellow')) return 'yellow'
  return 'green'
}

export function ibServiceLamp(
  svc: 'ib_operator' | 'ib_ingestor' | 'ib_account_agent',
  status: StatusResponse | null | undefined,
): { lamp: ServiceLamp; title: string } {
  if (!status) return { lamp: 'yellow', title: 'Monitor status not loaded.' }

  if (svc === 'ib_operator') {
    const op = status.socket?.ib_operator
    if (op == null) return { lamp: 'yellow', title: 'IB Operator data not present in /status socket.' }
    if (op.service_alive === false) return { lamp: 'red', title: 'IB Operator process not alive (service_alive=false).' }
    if (op.connected === true) return { lamp: 'green', title: 'IB Operator connected.' }
    if (op.connected === false) return { lamp: 'red', title: 'IB Operator not connected.' }
    return { lamp: 'yellow', title: 'IB Operator connection status unknown.' }
  }

  if (svc === 'ib_ingestor') {
    const ing = status.socket?.ib_ingestor
    if (ing == null) return { lamp: 'yellow', title: 'IB Ingestor data not present in /status socket.' }
    if (ing.connected === true) return { lamp: 'green', title: 'IB Ingestor connected.' }
    if (ing.connected === false) return { lamp: 'red', title: 'IB Ingestor not connected.' }
    return { lamp: 'yellow', title: 'IB Ingestor connection status unknown.' }
  }

  // ib_account_agent
  const aa = status.socket?.ib_account_agent
  if (aa == null) return { lamp: 'yellow', title: 'IB Account Agent data not present in /status socket.' }
  if (aa.service_alive === false) return { lamp: 'red', title: 'IB Account Agent process not alive (service_alive=false).' }
  if (aa.connected === true) return { lamp: 'green', title: 'IB Account Agent connected.' }
  if (aa.connected === false) return { lamp: 'red', title: 'IB Account Agent not connected.' }
  return { lamp: 'yellow', title: 'IB Account Agent connection status unknown.' }
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
  if (roll === 'green') return { lamp: 'green', title: 'IB Account Agent and PostgreSQL sync both healthy.' }
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
