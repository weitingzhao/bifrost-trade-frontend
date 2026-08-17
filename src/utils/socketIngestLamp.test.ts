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

describe('isPolygonWsServiceId', () => {
  it('accepts only official polygon_ws id', () => {
    expect(isPolygonWsServiceId('polygon_ws')).toBe(true)
    expect(isPolygonWsServiceId('massive_ws')).toBe(false)
    expect(isPolygonWsServiceId('ib_ingestor')).toBe(false)
  })
})

describe('ingestRedisHealthLamp polygon_ws', () => {
  const baseStatus = {
    socket: {
      polygon_ws: {
        ws_connected: false,
        ws_mode: 'rest_only',
        health_updated_age_s: 5,
        service_heartbeat_interval_sec: 30,
      },
    },
  } as StatusResponse

  it('shows green for REST-only standby with fresh heartbeat', () => {
    const { lamp, title } = ingestRedisHealthLamp('polygon_ws', baseStatus)
    expect(lamp).toBe('green')
    expect(title).toMatch(/REST-only standby/i)
  })

  it('reads socket.polygon_ws only (no massive fallback)', () => {
    const status = {
      socket: {
        // Legacy wire field present — must be ignored by statusSocketPolygonWs.
        massive: {
          ws_connected: true,
          ws_mode: 'live',
          health_updated_age_s: 2,
          service_heartbeat_interval_sec: 30,
        },
      },
    } as unknown as StatusResponse
    const { lamp } = ingestRedisHealthLamp('polygon_ws', status)
    expect(lamp).not.toBe('green')
  })
})
