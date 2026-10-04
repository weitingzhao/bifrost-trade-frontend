/**
 * Saved screens — one object with one id (6A, research 0.107.0).
 *
 * The authoring face (/research/lab/stocks › Conditions) and Stock screen
 * write them; Stock screen's My screens reads the same object. The definition is validated
 * server-side against the v1 vocabulary (repositories/saved_screen.py); a
 * 422 names the drift instead of storing it.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson, type RequestJsonOptions } from '@/lib/http'
import { withResearchAuth } from '@/lib/auth/researchUser'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'

export interface SavedScreenDefinition {
  q: string
  paths: string[]
  grades: string[]
  min_composite: number
  tech: string[]
  fund: string[]
}

export interface SavedScreen {
  id: string
  name: string
  description: string | null
  definition: SavedScreenDefinition
  vocabulary: string
  is_active: boolean
  origin_page: string | null
  created_at: string
  updated_at: string
  retired_at: string | null
}

interface Envelope<T> {
  ok: boolean
  data: T
  error?: string
}

const validateScreensEnvelope = withValidation<Envelope<unknown>>(
  ResearchEnvelopeSchema,
  'research/screens',
)

/** A 422 names the definition's drift; that reason is the error text. */
async function screensApi<T>(init: RequestJsonOptions<T> = {}): Promise<T> {
  const body = await requestJson(researchEngineUrl('/research/screens'), {
    ...init,
    headers: withResearchAuth(init.headers),
    label: 'saved screens',
  })
  const j = validateScreensEnvelope(body) as Envelope<T>
  return (j.data ?? (j as unknown as T)) as T
}

export function fetchSavedScreens(): Promise<{ screens: SavedScreen[]; count: number }> {
  return screensApi()
}

export function createSavedScreen(body: {
  name: string
  definition: SavedScreenDefinition
  description?: string | null
  origin_page?: string | null
}): Promise<SavedScreen> {
  return screensApi({ method: 'POST', body })
}
