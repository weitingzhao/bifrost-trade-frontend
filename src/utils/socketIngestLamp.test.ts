import { describe, expect, it } from 'vitest'

import type { StatusResponse } from '@/types/monitor'

import { ingestRedisHealthLamp, massiveWsRestOnly } from './socketIngestLamp'

describe('massiveWsRestOnly', () => {
  it('detects rest_only ws_mode', () => {
    expect(massiveWsRestOnly({ ws_mode: 'rest_only', ws_connected: false })).toBe(true)
    expect(massiveWsRestOnly({ ws_mode: 'live', ws_connected: true })).toBe(false)
  })
})

describe('ingestRedisHealthLamp massive_ws', () => {
  const baseStatus = {
    socket: {
      massive: {
        ws_connected: false,
        ws_mode: 'rest_only',
        health_updated_age_s: 5,
        service_heartbeat_interval_sec: 30,
      },
    },
  } as StatusResponse

  it('shows green for REST-only standby with fresh heartbeat', () => {
    const { lamp, title } = ingestRedisHealthLamp('massive_ws', baseStatus)
    expect(lamp).toBe('green')
    expect(title).toMatch(/REST-only standby/i)
  })
})
