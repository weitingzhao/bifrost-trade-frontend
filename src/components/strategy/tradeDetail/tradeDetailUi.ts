/**
 * Tailwind tokens for the trade detail's K-line section. Rev .154 (batch 3):
 * the instance-panel tokens nothing imported any more — the old status pills,
 * P&L bands, execution match tables and their uppercase fill headers — are
 * gone; what is left is what TradeKlineSection draws.
 */

// Rev .142: the capsule segmented control — an ink-7% track, the chosen segment at 15% with the lens.
export const tradeExecTabsClass =
  'inline-flex h-[30px] items-center gap-0.5 self-start rounded-full bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)] p-[3px]'
export const tradeExecTabClass =
  'inline-flex h-6 items-center gap-1.5 rounded-full bg-transparent px-3 text-xs font-semibold text-[var(--sk-mute2)] transition-colors hover:text-[var(--foreground)] active:[filter:var(--press)]'
export const tradeExecTabActiveClass =
  'bg-[color-mix(in_srgb,var(--foreground)_15%,transparent)] text-[var(--foreground)] shadow-[var(--glass-lens),0_1px_2px_rgba(0,0,0,0.22)] hover:text-[var(--foreground)]'
