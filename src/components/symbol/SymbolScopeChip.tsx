/**
 * The symbol a list page is filtered to — the top bar's, never the page's own
 * (design Rev .120, DESIGN_CONTRACTS §17.3).
 *
 * A page that reads the symbol has no Symbol box: it takes the carried symbol
 * (`?symbol=` first on entry) and this chip stands where the box was. With a
 * symbol it reads "filtered to NVDA ×"; × clears it everywhere, not just here.
 * Without one it is "Symbol ⌘K", which opens the top bar's search — picking a
 * name there swaps this page in place.
 */
import { omnibar } from '@/lib/omnibar'
import { CloseButton } from '@/components/data-display'

export function SymbolScopeChip({ symbol, onClear }: { symbol: string; onClear: () => void }) {
  const sym = symbol.trim().toUpperCase()
  if (!sym) {
    return (
      <button
        type="button"
        onClick={omnibar.open}
        title="Filter by symbol — pick one in the top bar search (⌘K). It follows you to every page that reads it."
        className="inline-flex h-[22px] flex-none cursor-pointer items-center gap-1.5 rounded-full border-0 bg-[color-mix(in_srgb,var(--sk-ink)_7%,transparent)] px-2 text-dense-caption whitespace-nowrap text-[var(--sk-mute2)] hover:bg-[color-mix(in_srgb,var(--sk-ink)_12%,transparent)]"
      >
        Symbol <span className="font-mono text-dense-micro text-[var(--sk-mute)]">⌘K</span>
      </button>
    )
  }
  return (
    <span
      title={`Filtered to ${sym}, the symbol in the top bar. Pick another there (⌘K); × clears it everywhere.`}
      className="inline-flex h-[22px] flex-none items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--sk-ticker)_15%,transparent)] pr-0.5 pl-2 text-dense-caption whitespace-nowrap text-[var(--sk-soft)]"
    >
      filtered to <span className="font-mono font-bold text-[var(--sk-ticker)]">{sym}</span>
      <CloseButton size="sm" onClick={onClear} label={`Clear symbol ${sym}`} title={`Clear ${sym} — here and in the top bar`} />
    </span>
  )
}
