/**
 * What the Copilot can reach, read from the tool registry that answers the
 * calls rather than from a list kept by hand on this side.
 */
import { withValidation } from '@/lib/apiValidation'
import { researchEngineUrl } from '@/lib/devApiUrl'
import { unwrapResearchEnvelope } from '@/lib/researchEnvelope'
import {
  CopilotToolListSchema,
} from '@/lib/schemas/research'

export interface CopilotTool {
  name: string
  description: string
  /** Write tools need an approval token; reads do not. */
  write: boolean
  /** The part before the first dot — `trade` or `research`. */
  domain: string
}

export interface CopilotToolList {
  tools: CopilotTool[]
  count: number
  /** Set when the registry could not be listed; the list is then empty. */
  error?: string
}

const validate = withValidation<CopilotToolList>(CopilotToolListSchema, 'research/copilot/tools')

export async function fetchCopilotTools(): Promise<CopilotToolList> {
  const res = await fetch(researchEngineUrl('/research/copilot/tools'))
  return validate(await unwrapResearchEnvelope(res, { apiLabel: 'Copilot tools' }))
}
