import type { StatusResponse, StatusSocketIbBroker } from '@/types/monitor'

export type PlatformIbGatewayBlock = NonNullable<
  NonNullable<StatusResponse['socket']>['platform_ib_gateway']
>

const IB_BROKER_IDS = ['ib_ingestor', 'ib_account_agent', 'ib_operator'] as const

export function platformIbGatewayFromStatus(
  status: StatusResponse | null | undefined,
): PlatformIbGatewayBlock | null {
  const pg = status?.socket?.platform_ib_gateway
  if (!pg || typeof pg !== 'object') return null
  return pg
}

export function isPlatformIbGatewayActive(status: StatusResponse | null | undefined): boolean {
  const pg = platformIbGatewayFromStatus(status)
  if (pg != null) return true
  const socket = status?.socket
  if (!socket) return false
  return IB_BROKER_IDS.some(id => {
    const block = socket[id as keyof typeof socket] as StatusSocketIbBroker | null | undefined
    return block?.transport === 'platform_gateway' || block?.health_source === 'platform_ib_gateway'
  })
}

export function ibBrokerPlatformGatewayLabel(svcId: string): string {
  switch (svcId) {
    case 'ib_ingestor':
    case 'ib_market':
      return 'Platform IB Gateway · Market ingest'
    case 'ib_account_agent':
      return 'Platform IB Gateway · Account agent'
    case 'ib_operator':
      return 'Platform IB Gateway · Operator RPC'
    default:
      return 'Platform IB Gateway'
  }
}

export function platformIbGatewayAggregateLamp(
  status: StatusResponse | null | undefined,
): { lamp: 'green' | 'yellow' | 'red' | 'gray'; title: string } | null {
  const pg = platformIbGatewayFromStatus(status)
  if (!pg) return null
  const lamp = pg.lamp
  if (lamp === 'green' || lamp === 'yellow' || lamp === 'red') {
    return {
      lamp,
      title:
        pg.title ??
        'Platform IB Gateway @ redis-ib (data/ib-gateway Deployment — ingestor + account + operator).',
    }
  }
  return {
    lamp: 'gray',
    title: 'Platform IB Gateway block present but lamp unknown.',
  }
}
