/**
 * `1 · Underlyings` — the design's first rail step.
 *
 * A source click *replaces* the list rather than adding to it: the design's
 * own buttons are exclusive, and a picker that accumulates leaves you unable
 * to say what you are screening. The chips below are the list itself, each
 * droppable; `＋ symbol` adds a name no source offers.
 *
 * The dot on each source is the design's, with one change: the Option Scan's
 * is amber rather than the prototype's red. Red is kept for a real fault in
 * this app (§1), and "IV-rich today" is a reading, not a failure.
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RailPanel } from './OptionScreenerRail'
import { SOURCE_CAP, type ScreenerSource } from './useScreenerSources'

const DOT: Record<string, string> = {
  scan: 'bg-warning',
  explorer: 'bg-primary',
  book: 'bg-[var(--sk-line2)]',
  watch: 'bg-[var(--sk-line2)]',
}

function parseSymbols(text: string): string[] {
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export function OptionScreenerSources({
  sources,
  activeId,
  symbols,
  onPickSource,
  onDrop,
  onAdd,
}: {
  sources: readonly ScreenerSource[]
  activeId: string | null
  symbols: readonly string[]
  onPickSource: (source: ScreenerSource) => void
  onDrop: (symbol: string) => void
  onAdd: (symbols: string[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const next = parseSymbols(draft)
    if (next.length) onAdd(next)
    setDraft('')
    setAdding(false)
  }

  return (
    <RailPanel
      step={1}
      title="Underlyings"
      aside={<span className="text-dense-body font-semibold">{symbols.length} selected</span>}
    >
      <div className="flex flex-col gap-1.5 px-2.5 py-2">
        {sources.map((s) => {
          const dead = s.symbols == null
          const n = s.symbols?.length ?? 0
          return (
            <button
              key={s.id}
              type="button"
              disabled={dead}
              title={
                s.absent ??
                (n > SOURCE_CAP
                  ? `${s.label} holds ${n}; a click takes the first ${SOURCE_CAP}. The engine costs roughly ten seconds a name against a 60-second abort.`
                  : `Screen the ${n} names this list holds`)
              }
              onClick={() => onPickSource(s)}
              className={cn(
                'flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-dense-meta',
                dead
                  ? 'cursor-not-allowed border-dashed border-border text-muted-foreground/60'
                  : activeId === s.id
                    ? 'border-primary/60 bg-primary/[0.05]'
                    : 'border-border hover:bg-secondary/60',
              )}
            >
              <span className={cn('size-2 shrink-0 rounded-full', dead ? 'bg-muted' : DOT[s.id])} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 font-mono text-dense-caption tabular-nums text-muted-foreground">
                {dead ? 'no store' : n > SOURCE_CAP ? `${SOURCE_CAP} of ${n}` : n}
              </span>
            </button>
          )
        })}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {symbols.map((sym) => (
            <span
              key={sym}
              className="inline-flex h-5 items-center gap-1 border px-1.5 font-mono text-dense-caption mat-tag"
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
          {adding ? (
            <input
              // Opened by the reader's own click, so focusing it is what they asked for.
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setDraft('')
                  setAdding(false)
                }
              }}
              onBlur={commit}
              placeholder="ANET, CAVA"
              aria-label="Add symbols"
              className="h-5 w-28 rounded border border-input bg-background px-1.5 font-mono text-dense-caption placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex h-5 items-center rounded border border-border px-1.5 text-dense-caption hover:bg-secondary/60"
            >
              ＋ symbol
            </button>
          )}
        </div>
        {/* Stated once, not on every button: the cap is the engine's, and a
            silent limit reads as a bug. */}
        <p className="m-0 text-dense-caption leading-relaxed text-muted-foreground">
          A source takes its first {SOURCE_CAP} — the engine costs about ten seconds a name.
        </p>
      </div>
    </RailPanel>
  )
}
