import { describe, expect, it } from 'vitest'

import type { StatusResponse } from '@/types/monitor'

import {
  ibBrokerPlatformGatewayLabel,
  isPlatformIbGatewayActive,
  platformIbGatewayAggregateLamp,
  platformIbGatewayFromStatus,
} from './platformIbGateway'
import { aggregateSocketNavHealthFromStatus } from './socketIngestLamp'

const platformStatus = {
  socket: {
    platform_ib_gateway: {
      transport: 'platform_gateway',
      deployment: 'data/ib-gateway',
      bus: 'redis-ib',
      mode: 'mock',
      lamp: 'green',
      title: 'Platform IB Gateway healthy',
      connected: true,
    },
    ib_ingestor: { connected: true, transport: 'platform_gateway', health_source: 'platform_ib_gateway' },
    ib_account_agent: { connected: true, transport: 'platform_gateway' },
    ib_operator: { connected: true, transport: 'platform_gateway' },
    massive: { ws_connected: true, health_updated_age_s: 5, service_heartbeat_interval_sec: 30 },
  },
} as StatusResponse

describe('platformIbGateway', () => {
  it('detects platform gateway from aggregate block', () => {
    expect(platformIbGatewayFromStatus(platformStatus)?.lamp).toBe('green')
    expect(isPlatformIbGatewayActive(platformStatus)).toBe(true)
  })

  it('labels IB broker rows for Platform Gateway', () => {
    expect(ibBrokerPlatformGatewayLabel('ib_ingestor')).toMatch(/Platform IB Gateway/)
    expect(ibBrokerPlatformGatewayLabel('ib_operator')).toMatch(/Operator RPC/)
  })

  it('aggregate nav prefers platform gateway title when degraded', () => {
    const degraded = {
      ...platformStatus,
      socket: {
        ...platformStatus.socket,
        platform_ib_gateway: {
          ...platformStatus.socket!.platform_ib_gateway!,
          lamp: 'yellow',
          title: 'Platform IB Gateway partial',
        },
      },
    } as StatusResponse
    const nav = aggregateSocketNavHealthFromStatus(degraded)
    expect(nav.lamp).toBe('yellow')
    expect(nav.title).toMatch(/Platform IB Gateway partial/)
  })

  it('aggregate nav green when gateway + massive healthy', () => {
    const nav = aggregateSocketNavHealthFromStatus(platformStatus)
    expect(nav.lamp).toBe('green')
    expect(nav.title).toMatch(/Platform IB Gateway/)
  })
})

describe('platformIbGatewayAggregateLamp', () => {
  it('returns null when block absent', () => {
    expect(platformIbGatewayAggregateLamp({ socket: {} } as StatusResponse)).toBeNull()
  })
})
