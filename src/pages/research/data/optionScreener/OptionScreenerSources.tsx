/**
 * `1 · Underlyings` — the design's first rail step.
 *
 * A source click *replaces* the list rather than adding to it: the design's
 * own buttons are exclusive, and a picker that accumulates leaves you unable
 * to say what you are screening. The chips below it are the list itself, each
 * droppable, with the free-text box behind `＋ symbol` for a name no source
 * offers.
 */
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOURCE_CAP, type ScreenerSource } from './useScreenerSources'

export function OptionScreenerSources({
  sources,
  activeId,
  symbols,
  onPickSource,
  onDrop,
  children,
}: {
  sources: readonly ScreenerSource[]
  activeId: string | null
  symbols: readonly string[]
  onPickSource: (source: ScreenerSource) => void
  onDrop: (symbol: string) => void
  /** The free-text box, which the page owns because it owns the text. */
  children?: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border">
      <header className="flex items-baseline gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.14em] text-muted-foreground">
          1 · Underlyings
        </span>
        <span className="text-dense-body font-semibold">{symbols.length} selected</span>
      </header>
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {sources.map((s) => {
          const dead = s.symbols == null
          return (
            <button
              key={s.id}
              type="button"
              disabled={dead}
              title={
                s.absent ??
                (s.symbols && s.symbols.length > SOURCE_CAP
                  ? `${s.label} holds ${s.symbols.length}; a click takes the first ${SOURCE_CAP}. The screener costs roughly ten seconds a name against a 60-second abort.`
                  : `Screen the ${s.symbols?.length ?? 0} names this list holds`)
              }
              onClick={() => onPickSource(s)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-dense-meta',
                dead
                  ? 'cursor-not-allowed border-dashed border-border text-muted-foreground/60'
                  : activeId === s.id
                    ? 'border-primary/55 bg-primary/[0.06]'
                    : 'border-border hover:bg-secondary/60',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 font-mono text-dense-caption tabular-nums text-muted-foreground">
                {dead
                  ? 'no store'
                  : (s.symbols?.length ?? 0) > SOURCE_CAP
                    ? `${SOURCE_CAP} of ${s.symbols?.length}`
                    : s.symbols?.length}
              </span>
            </button>
          )
        })}
        {symbols.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {symbols.map((sym) => (
              <span
                key={sym}
                className="inline-flex h-5 items-center gap-1 rounded border border-border px-1.5 font-mono text-dense-caption"
              >
                {sym}
                <button
                  type="button"
                  aria-label={`Drop ${sym}`}
                  title={`Drop ${sym}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => onDrop(sym)}
                >
                  <X className="size-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        {children}
        {/* Stated once under the list rather than on every button: the cap is
            the engine's, and it is the kind of limit that reads as a bug when
            it is silent. */}
        <p className="text-dense-caption leading-relaxed text-muted-foreground">
          A source takes the first {SOURCE_CAP} names. The screener costs roughly ten seconds a
          name against a 60-second abort — five already times out — so the rest are left for you to
          add by hand.
        </p>
      </div>
    </section>
  )
}
