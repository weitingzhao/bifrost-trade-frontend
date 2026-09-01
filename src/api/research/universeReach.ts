/**
 * Universe reach — how much of the warehouse the Loop can actually see.
 *
 * Talks to `bifrost-research` Research API `:8795` via `researchEngineUrl()`.
 */
import { withValidation } from '@/lib/apiValidation'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { UniverseReachSchema } from '@/lib/schemas/research'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'

export interface UniverseReachLayer {
  key: string
  label: string
  table: string
  note?: string
  /** null means the count failed — not that the layer is empty. */
  symbols: number | null
  status: 'ok' | 'unavailable' | string
}

export interface UniverseReach {
  layers: UniverseReachLayer[]
  widest_symbols: number | null
  loop_symbols: number | null
  loop_pct_of_widest: number | null
  /** universe_mode values across active objectives — what reach is measured against. */
  universe_modes?: string[]
  measured: boolean
  cached?: boolean
}

const validateReach = withValidation<UniverseReach>(
  UniverseReachSchema,
  'research/universe/reach',
)

export async function fetchUniverseReach(): Promise<UniverseReach> {
  const data = await unwrap<UniverseReach>(
    await fetch(researchEngineUrl('/research/universe/reach')),
  )
  return validateReach(data)
}
