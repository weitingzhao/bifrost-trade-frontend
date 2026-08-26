/** Copilot model catalog (D-RS-E-c · RS-F DeepSeek). Keys stay server-side. */

export type CopilotModelId =
  | 'deepseek-chat'
  | 'deepseek-reasoner'
  | 'claude-4.5-sonnet'
  | 'gpt-5'
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
    id: 'gpt-5',
    label: 'GPT-5',
    provider: 'openai',
    costPerMtokIn: 2.5,
    costPerMtokOut: 10,
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
  const sym = symbol ? `?symbol=${encodeURIComponent(symbol)}` : ''
  if (toolName.startsWith('research.hypothesis.')) return `/research${sym}`
  if (toolName.startsWith('research.backtest.')) {
    return `/research/backtest?tab=event-query${symbol ? `&symbol=${encodeURIComponent(symbol)}` : ''}`
  }
  if (toolName.startsWith('research.vrp.')) return `/research/vrp-lab${sym}`
  if (toolName.startsWith('research.vol_surface.')) return `/research/vol-surface-lab${sym}`
  if (toolName.startsWith('research.opex_cycle.')) return `/research/opex-cycle-lab${sym}`
  if (toolName.includes('sepa')) return `/research/sepa-daily-core${sym}`
  if (toolName.includes('event_radar')) return `/research/event-radar${sym}`
  if (toolName.includes('momentum')) return `/research/momentum-radar${sym}`
  if (toolName.includes('gex')) return `/research/gex-intraday${sym}`
  if (toolName.includes('flow')) return `/research/order-sentiment${sym}`
  if (toolName.includes('forecast') || toolName.includes('daily_brief')) {
    return `/research/daily-brief${sym}`
  }
  if (toolName.includes('regime')) return `/research/backtest${sym}`
  return null
}

export const PROVIDER_LABELS: Record<CopilotModelOption['provider'], string> = {
  deepseek: 'DeepSeek',
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  ollama: 'Ollama (local)',
}
