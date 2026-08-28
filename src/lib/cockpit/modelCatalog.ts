/** Copilot model catalog (D-RS-E-c · RS-F DeepSeek). Keys stay server-side. */

export type CopilotModelId =
  | 'deepseek-chat'
  | 'deepseek-reasoner'
  | 'claude-4.5-sonnet'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4.1'
  | 'gpt-4.1-mini'
  | 'gpt-5-mini'
  | 'gpt-5'
  | 'gpt-5.6-luna'
  | 'gpt-5.6-terra'
  | 'gpt-5.6-sol'
  | 'gpt-5.4-nano'
  | 'gpt-5.5'
  | 'ollama:llama3.2'

export type CopilotModelOption = {
  id: CopilotModelId
  label: string
  provider: 'deepseek' | 'anthropic' | 'openai' | 'ollama'
  /** USD per 1M tokens (in / out) — estimates for Settings hint */
  costPerMtokIn?: number
  costPerMtokOut?: number
}

export const COPILOT_MODELS: CopilotModelOption[] = [
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    costPerMtokIn: 0.14,
    costPerMtokOut: 0.28,
  },
  {
    id: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    provider: 'deepseek',
    costPerMtokIn: 0.14,
    costPerMtokOut: 0.28,
  },
  {
    id: 'claude-4.5-sonnet',
    label: 'Claude 4.5 Sonnet',
    provider: 'anthropic',
    costPerMtokIn: 3,
    costPerMtokOut: 15,
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai',
    costPerMtokIn: 2.5,
    costPerMtokOut: 10,
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai',
    costPerMtokIn: 0.15,
    costPerMtokOut: 0.6,
  },
  {
    id: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai',
    costPerMtokIn: 2,
    costPerMtokOut: 8,
  },
  {
    id: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    provider: 'openai',
    costPerMtokIn: 0.4,
    costPerMtokOut: 1.6,
  },
  {
    id: 'gpt-5-mini',
    label: 'GPT-5 Mini',
    provider: 'openai',
    costPerMtokIn: 0.25,
    costPerMtokOut: 2,
  },
  {
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    costPerMtokIn: 1.25,
    costPerMtokOut: 10,
  },
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    provider: 'openai',
    costPerMtokIn: 0.2,
    costPerMtokOut: 1.2,
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    provider: 'openai',
    costPerMtokIn: 2,
    costPerMtokOut: 12,
  },
  {
    id: 'gpt-5.6-sol',
    label: 'GPT-5.6 Sol',
    provider: 'openai',
    costPerMtokIn: 4,
    costPerMtokOut: 20,
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 nano',
    provider: 'openai',
    costPerMtokIn: 0.2,
    costPerMtokOut: 1.25,
  },
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    costPerMtokIn: 5,
    costPerMtokOut: 30,
  },
  {
    id: 'ollama:llama3.2',
    label: 'Ollama · Llama 3.2',
    provider: 'ollama',
    costPerMtokIn: 0,
    costPerMtokOut: 0,
  },
]

export const DEFAULT_COPILOT_MODEL: CopilotModelId = 'deepseek-chat'

const MODEL_STORAGE_KEY = 'bifrost.cockpit.copilot.model'

export function readStoredModel(): CopilotModelId {
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY)
    if (raw && COPILOT_MODELS.some((m) => m.id === raw)) {
      return raw as CopilotModelId
    }
  } catch {
    // ignore
  }
  return DEFAULT_COPILOT_MODEL
}

export function writeStoredModel(id: CopilotModelId) {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

/** Map MCP tool domain → Lab route for source chips. */
export function labPathForTool(toolName: string, symbol?: string): string | null {
  const name = toolName.toLowerCase()
  const sym = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  if (name.startsWith('research.hypothesis.')) return `/research${sym}`
  if (name.startsWith('research.backtest.')) {
    return `/research/backtest?tab=event-query${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''}`
  }
  if (name.startsWith('research.vrp.')) return `/research/vrp-lab${sym}`
  if (name.startsWith('research.vol_surface.')) return `/research/vol-surface-lab${sym}`
  if (name.startsWith('research.opex_cycle.')) return `/research/opex-cycle-lab${sym}`
  if (name.startsWith('research.discovery.')) return `/research/discovery${sym}`
  if (name.includes('sepa')) return `/research/sepa-daily-core${sym}`
  if (name.includes('event_radar')) return `/research/event-radar${sym}`
  if (name.includes('momentum')) return `/research/momentum-radar${sym}`
  if (name.includes('gex')) return `/research/gex-intraday${sym}`
  if (name.includes('flow')) return `/research/order-sentiment${sym}`
  if (name.includes('forecast') || name.includes('daily_brief')) {
    return `/research/daily-brief${sym}`
  }
  if (name.includes('regime')) return `/research/backtest${sym}`
  return null
}

export const PROVIDER_LABELS: Record<CopilotModelOption['provider'], string> = {
  deepseek: 'DeepSeek',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  ollama: 'Ollama (local)',
}
