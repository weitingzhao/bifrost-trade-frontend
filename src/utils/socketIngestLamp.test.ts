import { describe, expect, it } from 'vitest'

import type { StatusResponse } from '@/types/monitor'

import {
  ingestRedisHealthLamp,
  isPolygonWsServiceId,
  massiveWsRestOnly,
} from './socketIngestLamp'

describe('massiveWsRestOnly', () => {
  it('detects rest_only ws_mode', () => {
    expect(massiveWsRestOnly({ ws_mode: 'rest_only', ws_connected: false })).toBe(true)
    expect(massiveWsRestOnly({ ws_mode: 'live', ws_connected: true })).toBe(false)
  })
})

describe('isPolygonWsServiceId dual-accept', () => {
  it('accepts official and legacy ids', () => {
    expect(isPolygonWsServiceId('polygon_ws')).toBe(true)
    expect(isPolygonWsServiceId('massive_ws')).toBe(true)
    expect(isPolygonWsServiceId('ib_ingestor')).toBe(false)
  })
})

describe('ingestRedisHealthLamp polygon_ws', () => {
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

  it('shows green for REST-only standby with fresh heartbeat (official id)', () => {
    const { lamp, title } = ingestRedisHealthLamp('polygon_ws', baseStatus)
    expect(lamp).toBe('green')
    expect(title).toMatch(/REST-only standby/i)
  })

  it('dual-accepts legacy massive_ws id', () => {
    const { lamp, title } = ingestRedisHealthLamp('massive_ws', baseStatus)
    expect(lamp).toBe('green')
    expect(title).toMatch(/REST-only standby/i)
  })

  it('prefers socket.polygon_ws over legacy socket.massive', () => {
    const status = {
      socket: {
        polygon_ws: {
          ws_connected: true,
          ws_mode: 'live',
          health_updated_age_s: 2,
          service_heartbeat_interval_sec: 30,
        },
        massive: {
          ws_connected: false,
          ws_mode: 'rest_only',
          health_updated_age_s: 5,
          service_heartbeat_interval_sec: 30,
        },
      },
    } as StatusResponse
    const { lamp, title } = ingestRedisHealthLamp('polygon_ws', status)
    expect(lamp).toBe('green')
    expect(title).toMatch(/connected/i)
    expect(title).not.toMatch(/REST-only/i)
  })
})
