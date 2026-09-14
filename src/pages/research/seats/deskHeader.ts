/**
 * The Copilot Desk header's two chips — pure, so the claims they make are tested.
 *
 * Design (`design/trade/Research Copilot.dc.html`) puts "spent $x / $6.00" and
 * "provider ANTHROPIC" beside the title. Both are hard-coded in the mock; here
 * each is read from what the Research API says.
 */
import type { CopilotUsage } from '@/api/aiCopilot'
import type { CopilotModelsResponse } from '@/api/researchCopilotModels'
import { COPILOT_MODELS, PROVIDER_LABELS, type CopilotModelId } from '@/lib/cockpit/modelCatalog'

export interface SpendAgainstCap {
  spent: number
  cap: number
  /** Spent as a share of the cap, clamped to 1; null when there is no cap to measure against. */
  share: number | null
  over: boolean
}

/** Chat plus bridge spend today against the daily cap — the cap is the deployment's, not the mock's $6. */
export function spendAgainstCap(usage: CopilotUsage): SpendAgainstCap {
  const spent = usage.cost_estimate_usd + (usage.bridge_cost_usd_today ?? 0)
  const cap = usage.cap_usd
  return {
    spent,
    cap,
    share: cap > 0 ? Math.min(spent / cap, 1) : null,
    over: cap > 0 && spent >= cap,
  }
}

export type ProviderState = 'unchecked' | 'ready' | 'not_configured'

export interface NewThreadProvider {
  modelLabel: string
  provider: string
  state: ProviderState
}

/**
 * Which provider a new thread will use, and whether this deployment can serve it.
 *
 * The mock's tooltip promises an offline model "falls back to HEURISTIC and says
 * so". The chat path does not fall back: a model whose provider has no key ends
 * the stream with "… not configured" (`copilot/agent_runtime.py`,
 * `ModelConfigError`) — only the digest and the harness planner fall back. The
 * catalog lists only models whose provider key is set, so a choice missing from
 * it is one a new thread cannot use, and the chip says so before a thread finds
 * out. Without a catalog it cannot tell, and says that instead.
 */
export function newThreadProvider(model: CopilotModelId, catalog: CopilotModelsResponse | undefined): NewThreadProvider {
  const local = COPILOT_MODELS.find((m) => m.id === model)
  const remote = catalog?.available.find((m) => m.id === model)
  const provider = remote?.provider ?? local?.provider
  return {
    modelLabel: remote?.label ?? local?.label ?? model,
    provider: provider ? PROVIDER_LABELS[provider] : model,
    state: !catalog ? 'unchecked' : remote ? 'ready' : 'not_configured',
  }
}
