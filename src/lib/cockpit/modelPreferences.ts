import { createPersistedStore } from '@/lib/cockpit/externalStore'

/**
 * Recommended sort order (lower = shown first) & tier grouping.
 *
 * Tiers keep the picker readable: 推荐 → 深度 → 进阶 → 试用.
 * Any unknown id falls back to "进阶" with rank 500.
 */
export type ModelTier = 'recommended' | 'reasoning' | 'advanced' | 'trial'

export const TIER_LABELS: Record<ModelTier, string> = {
  recommended: '推荐（日常）',
  reasoning: '深度推理',
  advanced: '进阶 / 更强',
  trial: '备用 / 试用',
}

export const TIER_ORDER: ModelTier[] = ['recommended', 'reasoning', 'advanced', 'trial']

type ModelMeta = { tier: ModelTier; rank: number }

/**
 * Curated ordering — smaller rank = closer to the top.  When you add a new
 * model to the backend, either drop it in here or accept the default of
 * (advanced, 500).
 */
const MODEL_META: Record<string, ModelMeta> = {
  // Everyday: put DeepSeek Chat first; 5.6 Luna is our new OpenAI main
  // cheap workhorse (per OpenAI docs), so it comes before the older
  // 4o-mini / 4.1-mini which we keep for backward familiarity.
  'deepseek-chat': { tier: 'recommended', rank: 10 },
  'gpt-5.6-luna': { tier: 'recommended', rank: 20 },
  'gpt-4o-mini': { tier: 'recommended', rank: 30 },
  'gpt-4.1-mini': { tier: 'recommended', rank: 40 },
  'gpt-5.4-nano': { tier: 'recommended', rank: 50 },

  // Reasoning: DeepSeek Reasoner is our default deep-thinker.
  'deepseek-reasoner': { tier: 'reasoning', rank: 10 },

  // Advanced: fuller / more expensive flagships.
  'gpt-5.6-terra': { tier: 'advanced', rank: 10 },
  'gpt-5.6-sol': { tier: 'advanced', rank: 20 },
  'gpt-5-mini': { tier: 'advanced', rank: 30 },
  'gpt-4.1': { tier: 'advanced', rank: 40 },
  'gpt-4o': { tier: 'advanced', rank: 50 },
  'gpt-5': { tier: 'advanced', rank: 60 },
  'gpt-5.4-mini': { tier: 'advanced', rank: 70 },
  'gpt-5.5': { tier: 'advanced', rank: 90 },

  // Trial / local — hidden by default is optional; we just push them down.
  'claude-4.5-sonnet': { tier: 'trial', rank: 10 },
  'ollama:llama3.2': { tier: 'trial', rank: 20 },
}

/**
 * Models we hide by default (too expensive / too rarely useful).  Users can
 * re-enable them from Settings.  Only applies on the *very first* visit —
 * after that the hidden set is persisted in localStorage.
 */
export const DEFAULT_HIDDEN_MODELS: string[] = [
  'gpt-5.5', // $5 / $30 per Mtok — flagship, rarely appropriate for chat
]

export function getModelMeta(id: string): ModelMeta {
  return MODEL_META[id] ?? { tier: 'advanced', rank: 500 }
}

export function compareModels(a: string, b: string): number {
  const ma = getModelMeta(a)
  const mb = getModelMeta(b)
  const ta = TIER_ORDER.indexOf(ma.tier)
  const tb = TIER_ORDER.indexOf(mb.tier)
  if (ta !== tb) return ta - tb
  if (ma.rank !== mb.rank) return ma.rank - mb.rank
  return a.localeCompare(b)
}

/** Ids the user explicitly hides from the composer dropdown. */
type PickerState = { hidden: string[]; seededDefaults: boolean }

const store = createPersistedStore<PickerState>(
  'bifrost.cockpit.copilot.hiddenModels',
  { hidden: [], seededDefaults: false },
  (s) => ({ hidden: s.hidden, seededDefaults: s.seededDefaults }),
)

// One-time: seed the defaults (e.g. hide GPT-5.5) so first-time users
// don't see the $5/$30 flagship in the dropdown.  Users who explicitly
// unhide it later won't be affected by future seed changes.
if (typeof window !== 'undefined' && !store.getState().seededDefaults) {
  const cur = new Set(store.getState().hidden)
  for (const id of DEFAULT_HIDDEN_MODELS) cur.add(id)
  store.setState({ hidden: [...cur], seededDefaults: true })
}

export const modelPickerPrefs = {
  getHidden(): Set<string> {
    return new Set(store.getState().hidden)
  },
  isHidden(id: string): boolean {
    return store.getState().hidden.includes(id)
  },
  setHidden(id: string, hidden: boolean) {
    const cur = new Set(store.getState().hidden)
    if (hidden) cur.add(id)
    else cur.delete(id)
    store.setState({ hidden: [...cur] })
  },
  useHidden(): Set<string> {
    const s = store.useStore()
    return new Set(s.hidden)
  },
}
