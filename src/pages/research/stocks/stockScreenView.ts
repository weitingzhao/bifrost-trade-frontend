/**
 * Stock screen's view constants and the two pure helpers its panels share —
 * kept out of the component files so each of those exports components only.
 */
import type {
  SavedScreen,
  SavedScreenDefinition,
  SavedScreenDefinitionV2,
  ScreenVocabularyV2,
} from '@/api/research/savedScreens'
import { SERVER_PRESETS } from '@/lib/research/volRatingsModel'
import { pineOf, type ModelKey, type ScreenState, type Stage } from './stockScreenModel'
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

/** The universes a v2 screen can carry; S&P 500 has no member list, so it is never saved. */
const V2_UNIVERSES = new Set(['all', 'options', 'watch', 'book'])

/**
 * The screen as a `stock_screen.v2` definition (research 0.181.0): every
 * stage's picked conditions and its "at least N", the Pine block, and the
 * universe. Pine picks are kept even when their script is off — the screen
 * marks them, it does not drop them.
 */
export function toSavedDefinitionV2(s: ScreenState, stages: readonly Stage[], universe: string): SavedScreenDefinitionV2 {
  const out: SavedScreenDefinitionV2['stages'] = {}
  for (const st of stages) {
    if (st.id === 'pine') continue
    const on = st.chips.filter((c) => s.on[c.id]).map((c) => c.id)
    const need = s.mins[st.id] ?? 0
    const hasMin = (st.kind === 'min' || st.kind === 'agree') && need > 0
    if (!on.length && !hasMin) continue
    out[st.id] = hasMin ? { on, min: need } : { on }
  }
  const pine = pineOf(s)
  return {
    stages: out,
    pine: { on: Object.keys(s.on).filter((k) => s.on[k] && k.startsWith('pine:')).sort(), window: pine.within, match: pine.match },
    universe: V2_UNIVERSES.has(universe) ? (universe as SavedScreenDefinitionV2['universe']) : null,
  }
}

/** A v2 definition back into the page's screen; `universe` is null when it carried none. */
export function screenFromV2(d: SavedScreenDefinitionV2): { screen: ScreenState; universe: string | null } {
  const on: Record<string, boolean> = {}
  const mins: Record<string, number> = {}
  for (const [sid, body] of Object.entries(d.stages ?? {})) {
    for (const id of body.on ?? []) on[id] = true
    if (body.min) mins[sid] = body.min
  }
  for (const id of d.pine?.on ?? []) on[id] = true
  return {
    screen: { on, mins, pine: { within: d.pine?.window ?? 5, match: d.pine?.match ?? 'any' } },
    universe: d.universe ?? null,
  }
}

/**
 * A v1 definition on this page: trend and growth map to their stages and a
 * SETUP / PIVOT path to SEPA's bar; the rest (other paths, grade, composite,
 * search) has no stage here and is named, not dropped silently.
 */
export function screenFromV1(d: SavedScreenDefinition): { screen: ScreenState; lost: string[] } {
  const on: Record<string, boolean> = {}
  for (const id of [...(d.tech ?? []), ...(d.fund ?? [])]) on[id] = true
  const paths = d.paths ?? []
  if (paths.length && paths.every((p) => p === 'SETUP' || p === 'PIVOT')) on.m_sepa = true
  const lost = [
    paths.some((p) => p !== 'SETUP' && p !== 'PIVOT') ? `path ${paths.join('|')}` : null,
    d.grades?.length ? `grade ${d.grades.join('|')}` : null,
    d.min_composite > 0 ? `composite ≥ ${d.min_composite}` : null,
    d.q ? `search “${d.q}”` : null,
  ].filter((x): x is string => x != null)
  return { screen: { on, mins: {} }, lost }
}

const UNIVERSE_WORD: Record<string, string> = { all: 'All evaluated', options: 'Option universe', watch: 'Watchlist', book: 'In the book' }

/** A v2 definition in words, for My screens, stage by stage: `Trend template ≥ 8: P > 50 · Radar grade: A · Pine signals: Supertrend ↑ within 5`. */
export function describeV2(d: SavedScreenDefinitionV2, stages: readonly Stage[]): string {
  const parts: string[] = []
  for (const st of stages) {
    if (st.id === 'pine') {
      const picks = d.pine?.on ?? []
      if (picks.length) {
        const label = (id: string) => st.chips.find((c) => c.id === id)?.label ?? `${id.split(':')[1]} ${id.endsWith(':buy') ? '↑' : '↓'} (off)`
        parts.push(`${st.title}: ${picks.map(label).join(', ')} within ${d.pine.window}${picks.length > 1 ? ` · ${d.pine.match}` : ''}`)
      }
      continue
    }
    const body = d.stages?.[st.id]
    if (!body) continue
    const names = (body.on ?? []).map((id) => st.chips.find((c) => c.id === id)?.label ?? id)
    parts.push(`${st.title}${body.min ? ` ≥ ${body.min}` : ''}${names.length ? `: ${names.join(', ')}` : ''}`)
  }
  if (d.universe) parts.push(UNIVERSE_WORD[d.universe] ?? d.universe)
  return parts.length ? parts.join(' · ') : 'no condition'
}

/**
 * Names in a v2 definition that Research's vocabulary does not accept — the
 * same check its 422 makes, run before Save so the button can say which.
 */
export function vocabularyGaps(d: SavedScreenDefinitionV2, v: ScreenVocabularyV2): string[] {
  const gaps: string[] = []
  for (const [sid, body] of Object.entries(d.stages)) {
    const cat = v.stages[sid]
    if (!cat) {
      gaps.push(`stage ${sid}`)
      continue
    }
    for (const id of body.on) if (!cat.conditions.includes(id)) gaps.push(id)
  }
  const scripts = new Set(v.pine.scripts)
  for (const id of d.pine.on) if (!scripts.has(id.split(':')[1] ?? '')) gaps.push(id)
  if (!v.pine.windows.includes(d.pine.window)) gaps.push(`window ${d.pine.window}`)
  if (d.universe && !v.universes.includes(d.universe)) gaps.push(`universe ${d.universe}`)
  return gaps
}
