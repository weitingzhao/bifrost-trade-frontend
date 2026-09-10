/**
 * Lens registry client — `GET /research/lenses` (research-loop-automation A1/A5).
 *
 * The bands the engines apply, handed to the pages so a lab's verdict label and
 * Signal Decay's hit-rate are about the same "hot". Read once per session; the
 * registry changes with releases, not with the market.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'
import {
  LensRegistrySchema,
} from '@/lib/schemas/research'

export type LensBand = 'hot' | 'lean_hot' | 'neutral' | 'lean_cold' | 'cold'
export type LensKind = 'score' | 'signed' | 'severity' | 'distance' | 'categorical'
export type LensHitRule = 'mean_revert' | 'follow' | 'magnitude' | 'none'

export interface LensBands {
  hot: number | null
  lean_hot: number | null
  lean_cold: number | null
  cold: number | null
}

export interface LensSpec {
  id: string
  label: string
  kind: LensKind
  source_table: string
  value_column: string | null
  unit: string
  bands: LensBands
  hot_means: string
  cold_means: string
  horizons: number[]
  page_route: string
  scan_flag: string | null
  decay_lens: string | null
  similar_lens: string | null
  data_dependency: string | null
  notes: string
  categories: Record<string, LensBand>
  hit_rule: LensHitRule
  move_threshold: [number, number] | null
}

export interface LensRegistry {
  version: number
  score_bands: { hot: number; lean_hot: number; lean_cold: number; cold: number }
  lenses: LensSpec[]
  count: number
}

const validate = withValidation<LensRegistry>(LensRegistrySchema, 'research/lenses')

export async function fetchLensRegistry(): Promise<LensRegistry> {
  const data = await unwrap<LensRegistry>(await fetch(researchEngineUrl('/research/lenses')))
  return validate(data)
}
