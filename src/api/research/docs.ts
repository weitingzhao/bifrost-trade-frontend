/**
 * Documents the research-api serves from inside its own package.
 *
 * The Research blueprint has three readers — an agent calibrating code against
 * it, the API, and this app — and one file. It is fetched here rather than
 * bundled so the page can never show a version the repository does not hold.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { unwrapResearchEnvelope as unwrap } from '@/lib/researchEnvelope'
import {
  ResearchDocSchema,
} from '@/lib/schemas/research'

export interface ResearchDoc {
  slug: string
  title: string
  version: string | null
  updated: string | null
  status: string | null
  markdown: string
  /** Where the source lives, repo-relative, so the reader can go edit it. */
  path: string
}

const validateDoc = withValidation<ResearchDoc>(ResearchDocSchema, 'research/docs')

export async function fetchResearchDoc(slug: string): Promise<ResearchDoc> {
  return validateDoc(unwrap<ResearchDoc>(await fetch(researchEngineUrl(`/research/docs/${encodeURIComponent(slug)}`))))
}
