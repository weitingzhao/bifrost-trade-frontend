import type { ForecastSettlement } from '@/api/researchEngine'

export function settlementFineGrain(r: ForecastSettlement) {
  const s = r.stats_json
  return {
    directionHit: r.direction_hit ?? (typeof s?.direction_hit === 'boolean' ? s.direction_hit : undefined),
    pathShape:
      r.path_shape ??
      (typeof s?.path_shape === 'string' ? s.path_shape : undefined),
    closeZone:
      r.close_zone ??
      (typeof s?.close_zone === 'string' ? s.close_zone : undefined),
    leanMiss:
      r.lean_miss ??
      (typeof s?.lean_miss === 'boolean' ? s.lean_miss : undefined),
  }
}
