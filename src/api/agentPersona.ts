import { researchEngineUrl } from '@/lib/devApiUrl'
import { getResearchAuthHeaders } from '@/lib/auth/researchUser'

export type PersonaPreferences = {
  symbol_class?: string[]
  avoid_classes?: string[]
  time_horizon?: 'day' | 'swing_2w_8w' | 'position_gt_2m' | null
  structure_bias?: string[]
  max_single_position_pct?: number | null
  max_sector_concentration_pct?: number | null
  hard_stop_dd_pct?: number | null
  favor_signals?: string[]
  disfavor_signals?: string[]
}

export type AgentPersona = {
  owner_id: string
  agent_name: string
  persona_md: string
  preferences_json: PersonaPreferences
  guardrail_locked: boolean
  seeded: boolean
  updated_at: string
  label?: string
  label_zh?: string
  base_instruction_preview?: string
  assembled_preview?: string
}

async function personaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(researchEngineUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getResearchAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`agent persona HTTP ${res.status}`)
  return (await res.json()) as T
}

export async function fetchAgentPersonas(): Promise<AgentPersona[]> {
  const body = await personaFetch<{ ok: boolean; agents: AgentPersona[] }>(
    '/research/agent_persona',
  )
  return body.agents ?? []
}

export async function fetchAgentPersona(agent: string): Promise<AgentPersona> {
  const body = await personaFetch<{
    ok: boolean
    persona: AgentPersona
    base_instruction: string
    assembled_preview: string
  }>(`/research/agent_persona/${encodeURIComponent(agent)}`)
  return body.persona
}

export async function updateAgentPersona(
  agent: string,
  input: { persona_md?: string; preferences_json?: PersonaPreferences },
): Promise<AgentPersona> {
  const body = await personaFetch<{ ok: boolean; persona: AgentPersona }>(
    `/research/agent_persona/${encodeURIComponent(agent)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  )
  return body.persona
}

export async function resetAgentPersona(agent: string): Promise<AgentPersona> {
  const body = await personaFetch<{ ok: boolean; persona: AgentPersona }>(
    `/research/agent_persona/${encodeURIComponent(agent)}/reset`,
    { method: 'POST' },
  )
  return body.persona
}

export const AGENT_RELEVANT_SLOTS: Record<string, string[]> = {
  discovery: ['symbol_class', 'avoid_classes', 'time_horizon', 'favor_signals', 'disfavor_signals'],
  analyze: ['structure_bias', 'favor_signals', 'disfavor_signals', 'time_horizon'],
  validate: [],
  write: ['time_horizon'],
  explain: [],
  portfolio: [
    'max_single_position_pct',
    'max_sector_concentration_pct',
    'hard_stop_dd_pct',
    'symbol_class',
    'avoid_classes',
  ],
  verdict: ['symbol_class', 'favor_signals', 'time_horizon', 'structure_bias'],
  curator: ['symbol_class', 'favor_signals'],
}

export const SLOT_LABELS: Record<string, string> = {
  symbol_class: 'Symbol class',
  avoid_classes: 'Avoid classes',
  time_horizon: 'Time horizon',
  structure_bias: 'Structure bias',
  max_single_position_pct: 'Max single position %',
  max_sector_concentration_pct: 'Max sector %',
  hard_stop_dd_pct: 'Hard stop DD %',
  favor_signals: 'Favor signals',
  disfavor_signals: 'Disfavor signals',
}

// Legacy export — prefer agentPersonaCatalog.SLOT_LABELS for bilingual UI
