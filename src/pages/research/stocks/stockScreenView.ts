/**
 * Stock screen's view constants and the two pure helpers its panels share —
 * kept out of the component files so each of those exports components only.
 */
import type { SavedScreen, SavedScreenDefinition } from '@/api/research/savedScreens'
import { SERVER_PRESETS } from '@/lib/research/volRatingsModel'
import type { ModelKey, ScreenState, Stage } from './stockScreenModel'
import { START_PRESETS, type StartPreset } from './stockScreenStages'

/** The design's temporary model marks (Rev .126): markers only, never fills. */
export const MODEL_TINT: Record<ModelKey, string> = {
  sepa: 'var(--sk-model-sepa)',
  radar: 'var(--sk-model-radar)',
  premium: 'var(--sk-model-premium)',
}

/** The vol model's server presets, with the design's display names (Rev .121 #6). */
export const PREMIUM_PRESETS = SERVER_PRESETS.map((p) => ({
  ...p,
  label: p.id === 'momentum' ? 'Trend' : p.id === 'mean_revert' ? 'Revert' : p.label,
}))

export interface WeightSet {
  sepa: Record<string, number>
  premium: Record<string, number>
}

/** The four Rank choices (Rev .131: in the Rank section of the result head). */
export const RANK_OPTIONS = [
  { value: 'sepa', label: 'SEPA' },
  { value: 'radar', label: 'Radar' },
  { value: 'premium', label: 'Premium' },
  { value: 'none', label: 'None' },
]

/** The result list stops here and says so; Show all lifts it. */
export const ROW_CAP = 200

export const NOT_RATED: Record<ModelKey, string> = {
  sepa: 'Not rated by SEPA: outside its evaluated names.',
  radar: 'Not rated by Radar: not graded on its latest session.',
  premium: 'Not rated by Premium: outside its option universe.',
}

export interface StartChoice {
  id: string
  label: string
  k: string
  title: string
  missing: string | null
  apply: () => void
}

export function presetChoices(
  saved: readonly SavedScreen[],
  onPreset: (p: StartPreset) => void,
  onSaved: (s: SavedScreen) => void,
): StartChoice[] {
  return [
    ...START_PRESETS.map((p) => ({ id: p.id, label: p.label, k: p.k, title: p.title, missing: p.missing, apply: () => onPreset(p) })),
    ...saved.map((s) => ({
      id: `saved:${s.id}`,
      label: s.name,
      k: 'saved',
      title: `My screen · /research/screens${s.description ? ` · ${s.description}` : ''}`,
      missing: null,
      apply: () => onSaved(s),
    })),
  ]
}

/** The screen as a v1 definition, or the conditions v1 cannot hold. */
export function toSavedDefinition(
  s: ScreenState,
  stages: readonly Stage[],
): { definition: SavedScreenDefinition; blocked: null } | { definition: null; blocked: string[] } {
  const tech: string[] = []
  const fund: string[] = []
  const blocked: string[] = []
  let paths: string[] = []
  for (const st of stages) {
    const need = s.mins[st.id] ?? 0
    if (need > 0) blocked.push(`${st.title} ≥ ${need}`)
    for (const c of st.chips) {
      if (!s.on[c.id]) continue
      if (st.id === 'trend') tech.push(c.id)
      else if (st.id === 'growth') fund.push(c.id)
      else if (c.id === 'm_sepa') paths = ['SETUP', 'PIVOT']
      else blocked.push(c.label)
    }
  }
  if (blocked.length) return { definition: null, blocked }
  return { definition: { q: '', paths, grades: [], min_composite: 0, tech, fund }, blocked: null }
}

