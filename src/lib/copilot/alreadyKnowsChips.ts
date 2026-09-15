import type { AskCopilotIntentPayload } from '@/store/askCopilotIntentStore'

export type AlreadyKnowsChip = { k: string; v: string }

/**
 * Empty-state "It already knows" chips. Same fields as the composer context
 * chip (origin / symbol / date). Snapshot bags are not unpacked — we do not
 * invent labels for unknown keys.
 */
export function alreadyKnowsChips(
  view: AskCopilotIntentPayload | null,
  suppressed: boolean,
): AlreadyKnowsChip[] {
  if (!view || suppressed) return []
  const chips: AlreadyKnowsChip[] = []
  if (view.originLabel.trim()) chips.push({ k: 'page', v: view.originLabel })
  if (view.symbol?.trim()) chips.push({ k: 'symbol', v: view.symbol })
  if (view.date?.trim()) chips.push({ k: 'asof', v: view.date })
  return chips
}
