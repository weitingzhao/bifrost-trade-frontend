import { COPILOT_MODELS } from '@/lib/cockpit/modelCatalog'
import type { CopilotUiMessage } from '@/hooks/useCopilotSession'

/**
 * The line every Copilot paragraph carries.
 *
 * `DESIGN_CONTRACTS.md` §2.2, a binding cross-domain contract:
 *
 *     COPILOT DRAFT · <PROVIDER> · grounded in features asof <date>
 *
 * The point is that a reader can never mistake generated prose for a measured
 * figure, and can always tell what produced it and how stale the ground under
 * it is. So each of the three fields is either true or visibly absent — none
 * of them gets a plausible-looking default.
 *
 * - **Provider** comes from the model stamped on the message when it streamed.
 *   Persisted history records no model, so old turns say so rather than borrow
 *   whichever model happens to be selected now; that would be a false claim
 *   about who wrote them, which is the thing the line exists to prevent.
 * - **asof** is the feature batch's own `as_of`, read through the same query
 *   key the Signal Health page uses — so the two can never disagree, and a
 *   failed batch takes both down together, which §2.2 requires.
 *
 * Not rendered on the frontend's own notes ("Write executed successfully"):
 * signing our string with a provider would misattribute it.
 */

const PROVIDER_TEXT: Record<string, string> = {
  anthropic: 'ANTHROPIC',
  deepseek: 'DEEPSEEK',
  openai: 'OPENAI',
  ollama: 'OLLAMA',
}

function providerFor(model: string | undefined): string | null {
  if (!model) return null
  const found = COPILOT_MODELS.find((m) => m.id === model)
  if (!found) return null
  return PROVIDER_TEXT[found.provider] ?? found.provider.toUpperCase()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * `2026-09-13T00:46:00Z` → `13 Sep`. Falls back to the raw string it cannot read.
 *
 * UTC and hand-formatted, both deliberately. The batch stamps its `as_of` in
 * UTC, and a batch that finished at 00:46Z reads as the previous day in New
 * York — an off-by-one on the very field whose job is to say how stale the
 * ground is. `toLocaleDateString` also disagrees with itself across runtimes
 * ("Sep" vs "Sept" for the same locale), which a signature cannot afford.
 */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export interface SignatureBatch {
  asOf?: string | null
  isPending: boolean
  isError: boolean
}

/**
 * What the line says, as data. Pure so the three grounding states can be
 * asserted without rendering — the middle one, "unavailable", is the one that
 * must never quietly become a date.
 */
export function signatureParts(
  message: Pick<CopilotUiMessage, 'role' | 'origin' | 'model'>,
  batch: SignatureBatch,
): { provider: string; grounding: string } | null {
  if (message.role !== 'assistant' || message.origin === 'app') return null
  return {
    provider: providerFor(message.model) ?? 'provider not recorded',
    grounding: batch.isPending
      ? 'checking feature freshness'
      : batch.isError || !batch.asOf
        ? 'feature freshness unavailable'
        : `grounded in features asof ${shortDate(batch.asOf)}`,
  }
}
