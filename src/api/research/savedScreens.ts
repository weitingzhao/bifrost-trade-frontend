/**
 * Saved screens — one object with one id (6A, research 0.107.0).
 *
 * The authoring face (/research/lab/screener) writes them; Trade's result
 * face renders the same object read-only. The definition is validated
 * server-side against the v1 vocabulary (repositories/saved_screen.py); a
 * 422 names the drift instead of storing it.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
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

async function unwrapScreens<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`saved screens: ${res.status} ${text.slice(0, 200)}`)
  }
  const j = validateScreensEnvelope(await res.json()) as Envelope<T>
  return (j.data ?? (j as unknown as T)) as T
}

export async function fetchSavedScreens(): Promise<{ screens: SavedScreen[]; count: number }> {
  return unwrapScreens(await fetch(researchEngineUrl('/research/screens')))
}

export async function createSavedScreen(body: {
  name: string
  definition: SavedScreenDefinition
  description?: string | null
  origin_page?: string | null
}): Promise<SavedScreen> {
  return unwrapScreens(
    await fetch(researchEngineUrl('/research/screens'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}
