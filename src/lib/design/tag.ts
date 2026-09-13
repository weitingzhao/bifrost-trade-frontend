/**
 * What a route may declare about its place in `design/trade`.
 *
 * Its own module so `routeRegistry.ts` can carry the field without importing
 * the adoption model, which reads the registry.
 *
 * Only exceptions are written. An untagged app route that the design also has
 * is `pending`; one the design does not have is `staging` and the registry test
 * fails until it says which. See `adoption.ts` for the full state list.
 */
export interface DesignTag {
  state: 'aligned' | 'moving' | 'staging'
  /** The design rev walked against — an `aligned` route on an older rev reads as stale. */
  rev?: string
  /** `moving`: where it goes, and what must exist first. `staging`: the open question. */
  note?: string
}
