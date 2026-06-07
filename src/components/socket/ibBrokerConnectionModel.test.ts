import { describe, expect, it } from 'vitest'
import {
  ibBrokerLogicalSummary,
  ibBrokerRedisHealthLamp,
  ibBrokerSlotLamp,
  resolveIbBrokerSlots,
  type IbBrokerServiceId,
} from './ibBrokerConnectionModel'
import type { StatusResponse } from '@/types/monitor'

function brokerStatus(
  svcId: IbBrokerServiceId,
  hostConnected: boolean,
  secConnected: boolean | null,
): StatusResponse {
  const secondary =
    secConnected === null
      ? null
      : {
          connected: secConnected,
          client_id: svcId === 'ib_operator' ? 20 : 60,
          last_ib_probe_at: 1_700_000_000,
          ib_probe_ok: secConnected,
          ib_probe_stale: false,
        }
  return {
    socket: {
      [svcId]: {
        connected: hostConnected,
        service_alive: true,
        last_msg_age_s: 4,
        reconnects: 0,
        msg_count: 0,
        host: {
          connected: hostConnected,
          client_id: svcId === 'ib_operator' ? 20 : 60,
          last_ib_probe_at: 1_700_000_000,
          ib_probe_ok: hostConnected,
          ib_probe_stale: false,
        },
        secondary,
      },
    },
  } as unknown as StatusResponse
}

describe('resolveIbBrokerSlots', () => {
  it('shows Host up and Sec down independently for account agent', () => {
    const view = brokerStatus('ib_account_agent', true, false).socket!.ib_account_agent!
    const slots = resolveIbBrokerSlots(view, 'ib_account_agent', {
      account_agent: 60,
      account_agent_secondary: 60,
    })
    expect(slots).toHaveLength(2)
    expect(slots[0]?.connected).toBe(true)
    expect(slots[1]?.connected).toBe(false)
    expect(ibBrokerSlotLamp(slots[0]!)).toBe('green')
    expect(ibBrokerSlotLamp(slots[1]!)).toBe('red')
  })

  it('shows Host up and Sec down independently for operator', () => {
    const view = brokerStatus('ib_operator', true, false).socket!.ib_operator!
    const slots = resolveIbBrokerSlots(view, 'ib_operator', {
      operator_host: 20,
      operator_secondary: 20,
    })
    expect(slots[0]?.connected).toBe(true)
    expect(slots[1]?.connected).toBe(false)
  })
})

describe('ibBrokerLogicalSummary', () => {
  it('uses Host/Sec wording for operator', () => {
    const view = brokerStatus('ib_operator', true, false).socket!.ib_operator!
    const summary = ibBrokerLogicalSummary('ib_operator', view)
    expect(summary).toContain('Host up')
    expect(summary).toContain('Sec down')
    expect(summary).not.toMatch(/^IB Operator connected;/)
  })
})

describe('ibBrokerRedisHealthLamp', () => {
  it('is yellow when Host is up and Sec is down', () => {
    const status = brokerStatus('ib_account_agent', true, false)
    const { lamp } = ibBrokerRedisHealthLamp('ib_account_agent', status)
    expect(lamp).toBe('yellow')
  })
})
