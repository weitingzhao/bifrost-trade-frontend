/**
 * Saved screens — one object with one id (6A, research 0.107.0).
 *
 * A definition speaks one vocabulary, stamped on the row:
 *   - `sepa_screener_wide.v1` — the SEPA wide table's filters; Method ›
 *     Conditions writes it.
 *   - `stock_screen.v2` (research 0.181.0) — Stock screen's stages, the Pine
 *     block (picks · window · match) and the universe; Stock screen's Save
 *     screen writes it.
 * Research validates strictly against the stamp (repositories/saved_screen.py);
 * a 422 names the drift instead of storing it. `/research/screens/vocabulary`
 * says what each stamp accepts.
 */
import { researchEngineUrl } from '@/lib/devApiUrl'
import { withValidation } from '@/lib/apiValidation'
import { requestJson, type RequestJsonOptions } from '@/lib/http'
import { withResearchAuth } from '@/lib/auth/researchUser'
import { ResearchEnvelopeSchema } from '@/lib/schemas/research'

export const SCREEN_VOCABULARY_V1 = 'sepa_screener_wide.v1'
export const SCREEN_VOCABULARY_V2 = 'stock_screen.v2'

/** `sepa_screener_wide.v1`. */
export interface SavedScreenDefinition {
  q: string
  paths: string[]
  grades: string[]
  min_composite: number
  tech: string[]
  fund: string[]
}

/** `stock_screen.v2`: per stage the conditions picked and its "at least N"; the Pine block; the universe. */
export interface SavedScreenDefinitionV2 {
  stages: Record<string, { on: string[]; min?: number }>
  pine: { on: string[]; window: 1 | 5 | 10; match: 'any' | 'all' }
  universe: 'all' | 'options' | 'watch' | 'book' | null
}

export interface SavedScreen {
  id: string
  name: string
  description: string | null
  /** Shaped by `vocabulary` — read it through `screenV1` / `screenV2`. */
  definition: SavedScreenDefinition | SavedScreenDefinitionV2
  vocabulary: string
  is_active: boolean
  origin_page: string | null
  created_at: string
  updated_at: string
  retired_at: string | null
}

/** A v1 row's definition, or null when the row speaks another vocabulary. */
export function screenV1(s: Pick<SavedScreen, 'vocabulary' | 'definition'>): SavedScreenDefinition | null {
  return s.vocabulary === SCREEN_VOCABULARY_V1 ? (s.definition as SavedScreenDefinition) : null
}

/** A v2 row's definition, or null when the row speaks another vocabulary. */
export function screenV2(s: Pick<SavedScreen, 'vocabulary' | 'definition'>): SavedScreenDefinitionV2 | null {
  return s.vocabulary === SCREEN_VOCABULARY_V2 ? (s.definition as SavedScreenDefinitionV2) : null
}

/** What `stock_screen.v2` accepts (`GET /research/screens/vocabulary`). */
export interface ScreenVocabularyV2 {
  keys: string[]
  stages: Record<string, { kind: string; max: number | null; conditions: string[] }>
  pine: { windows: number[]; match: string[]; scripts: string[] }
  universes: string[]
}

export interface ScreenVocabulary {
  versions: string[]
  [SCREEN_VOCABULARY_V2]?: ScreenVocabularyV2
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
async function screensApi<T>(init: RequestJsonOptions<T> = {}, path = ''): Promise<T> {
  const body = await requestJson(researchEngineUrl(`/research/screens${path}`), {
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

export function createSavedScreen(
  body:
    | { name: string; definition: SavedScreenDefinition; vocabulary?: typeof SCREEN_VOCABULARY_V1; description?: string | null; origin_page?: string | null }
    | { name: string; definition: SavedScreenDefinitionV2; vocabulary: typeof SCREEN_VOCABULARY_V2; description?: string | null; origin_page?: string | null },
): Promise<SavedScreen> {
  return screensApi({ method: 'POST', body })
}

export function fetchScreenVocabulary(): Promise<ScreenVocabulary> {
  return screensApi({}, '/vocabulary')
}
