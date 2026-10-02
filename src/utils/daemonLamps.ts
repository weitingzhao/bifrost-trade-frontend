import type { DaemonHeartbeat, StatusResponse } from '@/types/monitor'
import {
  ibBrokerRedisHealthLamp,
  type IbBrokerServiceId,
} from '@/utils/ibBrokerConnectionModel'

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

export function computeStrategyTradingDaemonLamp(
  hb: DaemonHeartbeat | null | undefined,
  ibGroupLamp: DaemonLamp,
): DaemonLamp {
  if (!hb) return 'none'
  if (!hb.daemon_alive) return 'red'
  const heartbeatL: ServiceLamp = 'green'
  const ibL: ServiceLamp = ibGroupLamp === 'none' ? 'yellow' : ibGroupLamp
  return worst([heartbeatL, ibL])
}
