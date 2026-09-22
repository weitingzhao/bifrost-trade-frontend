/**
 * The list this name came from, the way through it, and why it was on it.
 *
 * You reached this page from a ranked table at some position in it. Without
 * this, reading the next name costs you the page you are on: back, find your
 * place, click. `j` and `k` step the list in place — the design's own keys, and
 * the reason the rail exists rather than a plain "back" link.
 *
 * **`WHY IT WAS THERE`** is the half this side was missing (Rev 2026-09-18.2).
 * The design ends the strip with the list's own numbers for this name —
 * `composite 77 · IV rank 71 · VRP +5.9 · terrain RANGY` — because the first
 * question on arriving is whether the reading that earned the name its place
 * still holds. This side printed a two-word summary (`vrp cold · terrain hot`),
 * which says the shape of the reason and not the reason. The chips are the
 * list's, formatted by the list: nothing is recomputed here, so the strip
 * cannot disagree with the table you came from.
 *
 * It renders nothing when the symbol is not on the last list published, which
 * is most of the time: a name reached by typing has no list behind it, and
 * saying otherwise would be a claim about where you had been.
 */
import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { SECTION_CAP_CLASS } from '@/components/layout'
import { useSymbolTrail, type TrailChip } from '@/lib/symbolTrail'
import { withSymbolParam } from '@/lib/symbolLink'
import { cn } from '@/lib/utils'

/**
 * A band's chip, in lamp colours rather than P&L ones.
 *
 * §14.7 ②: the profit / loss tokens belong on signed numbers, and a bordered
 * chip takes a lamp colour — a hot lens is not a loss, it is a reading at one
 * extreme. The gate catches this, and caught it here.
 */
const CHIP_TONE: Record<string, string> = {
  hot: 'border-warning/40 text-warning',
  cold: 'border-success/40 text-success',
  neutral: 'border-border text-foreground',
}

function Chip({ chip }: { chip: TrailChip }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-1.5 py-0.5',
        CHIP_TONE[chip.tone ?? 'neutral'],
      )}
    >
      <span className="text-dense-micro text-muted-foreground">{chip.k}</span>
      <span className="font-mono text-dense-meta tabular-nums">{chip.v}</span>
    </span>
  )
}

export function SymbolOriginRail({ symbol, tabQuery }: { symbol: string; tabQuery: string }) {
  const at = useSymbolTrail(symbol)
  const navigate = useNavigate()

  const prev = at?.prev ?? null
  const next = at?.next ?? null

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Never while typing: `j` belongs to the composer before it belongs here.
      const el = e.target as HTMLElement | null
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const to = e.key === 'j' ? next : e.key === 'k' ? prev : null
      if (!to) return
      e.preventDefault()
      navigate(withSymbolParam(tabQuery, to))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, navigate, tabQuery])

  if (!at) return null

  const step = (to: string | null, label: string, icon: React.ReactNode) =>
    to ? (
      <Link
        to={withSymbolParam(tabQuery, to)}
        className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-dense-meta text-foreground hover:bg-muted"
        title={`${label} on ${at.label} (${label === 'Next' ? 'j' : 'k'})`}
      >
        {icon}
        {to}
      </Link>
    ) : (
      <span className="inline-flex items-center gap-1 rounded border border-border/50 px-1.5 py-0.5 font-mono text-dense-meta text-muted-foreground/40">
        {icon}
        —
      </span>
    )

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-border bg-background px-3 py-1.5">
      <span className={SECTION_CAP_CLASS}>From</span>
      <span className="text-dense-meta">
        <Link to={at.href} className="text-foreground hover:underline">
          {at.label}
        </Link>
        {at.note ? <span className="text-muted-foreground"> · {at.note}</span> : null}
      </span>
      <span className="font-mono text-dense-meta tabular-nums text-muted-foreground">
        {at.index} of {at.total}
      </span>
      <span className="flex items-center gap-1">
        {step(prev, 'Previous', <ArrowLeft className="h-3 w-3" aria-hidden />)}
        {step(next, 'Next', <ArrowRight className="h-3 w-3" aria-hidden />)}
      </span>
      <kbd className="rounded border border-border px-1 font-mono text-dense-micro opacity-60">j</kbd>
      <kbd className="rounded border border-border px-1 font-mono text-dense-micro opacity-60">k</kbd>
      {at.chips && at.chips.length > 0 ? (
        <>
          <span className="h-4 w-px bg-border" aria-hidden />
          <span className={SECTION_CAP_CLASS}>Why it was there</span>
          <span className="flex flex-wrap items-center gap-1">
            {at.chips.map((c) => (
              <Chip key={c.k} chip={c} />
            ))}
          </span>
        </>
      ) : at.why ? (
        <>
          <span className="h-4 w-px bg-border" aria-hidden />
          <span className={SECTION_CAP_CLASS}>Why it was there</span>
          {/* An older list published a sentence rather than chips. It is still
              the list's own reason, so it is still shown. */}
          <span className="text-dense-meta text-muted-foreground">{at.why}</span>
        </>
      ) : null}
    </div>
  )
}
