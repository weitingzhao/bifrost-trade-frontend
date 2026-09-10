/**
 * What Copilot and the Loop said about one symbol — research-loop-automation D4.
 *
 * The digest's lines for the symbol plus every chat-side proposal with its
 * approval state, from the same tables the Inbox reads.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'
import {
  SymbolVerdictsSchema,
} from '@/lib/schemas/research'
import type { LensBand } from '@/api/research/lenses'

export interface VerdictLensLine {
  lens: string
  band: LensBand | null
  value: number | string | null
  means: string | null
  as_of: string | null
}

export interface VerdictBatch {
  run_id: string | null
  objective_title: string | null
  status: string | null
  auto_accepted: boolean
  held_reasons: string[]
}

export interface SymbolDigestVerdict {
  day: string | null
  draft_id: string | null
  status: string | null
  lenses: VerdictLensLine[]
  proposed: boolean
  batches: VerdictBatch[]
  dissent: { run_id?: string | null; objective_title?: string | null; net_stance?: string | null; blocked_by_validate?: boolean; judges?: string[]; wrong_if?: string[] } | null
  resolution: { id?: string; title?: string; status?: string; decision?: string | null; excess?: number | null; by_rule?: boolean } | null
  line: string
}

export type ProposalKind = 'candidate' | 'hypothesis' | 'draft' | 'action'

export interface SymbolProposal {
  kind: ProposalKind
  id: string | null
  status: string | null
  /** The approval state in words: proposed · accepted · awaiting approval · executed · … */
  state: string
  title: string | null
  by_copilot: boolean
  created_at: string | null
  source?: string | null
  hypothesis_id?: string | null
  origin_page?: string | null
  by_rule?: boolean
  draft_kind?: string
  generated_by?: string | null
  tool?: string
  approved_by?: string | null
}

export interface SymbolVerdicts {
  symbol: string
  generated_at: string
  digest: SymbolDigestVerdict | null
  proposals: SymbolProposal[]
  counts: Record<string, number>
  advisory: string
}

const validate = withValidation<SymbolVerdicts>(SymbolVerdictsSchema, 'research/verdicts')

export async function fetchSymbolVerdicts(symbol: string): Promise<SymbolVerdicts> {
  const sym = symbol.trim().toUpperCase()
  return validate(unwrap(await fetch(researchEngineUrl(`/research/verdicts/${encodeURIComponent(sym)}`))))
}
