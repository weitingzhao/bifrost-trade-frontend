import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useSymbolTrail } from '@/lib/symbolTrail'
import { withSymbolParam } from '@/lib/symbolLink'

/**
 * The list this name came from, and the way through it.
 *
 * You reached this page from a ranked table at some position in it. Without
 * this, reading the next name costs you the page you are on: back, find your
 * place, click. `j` and `k` step the list in place — the design's own keys, and
 * the reason the rail exists rather than a plain "back" link.
 *
 * It renders nothing when the symbol is not on the last list published, which
 * is most of the time: a name reached by typing has no list behind it, and
 * saying otherwise would be a claim about where you had been.
 */
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
        className="inline-flex items-center gap-1 rounded px-1 font-mono text-dense-meta text-foreground hover:bg-muted"
        title={`${label} on ${at.label}`}
      >
        {icon}
        {to}
      </Link>
    ) : (
      <span className="inline-flex items-center gap-1 px-1 font-mono text-dense-meta text-muted-foreground/40">
        {icon}
        —
      </span>
    )

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense-meta text-muted-foreground">
      <span>From</span>
      <Link to={at.href} className="text-foreground hover:underline">
        {at.label}
      </Link>
      <span className="font-mono tabular-nums">
        {at.index}/{at.total}
      </span>
      <span aria-hidden className="text-border">·</span>
      {step(prev, 'Previous', <ArrowLeft className="h-3 w-3" aria-hidden />)}
      {step(next, 'Next', <ArrowRight className="h-3 w-3" aria-hidden />)}
      <kbd className="rounded border border-border px-1 font-mono text-dense-micro opacity-60">j</kbd>
      <kbd className="rounded border border-border px-1 font-mono text-dense-micro opacity-60">k</kbd>
      {at.why ? (
        <>
          <span aria-hidden className="text-border">·</span>
          <span title="Why the list put it here">{at.why}</span>
        </>
      ) : null}
    </div>
  )
}
