/**
 * "How was this computed" — the block a `?` opens under a cockpit line or a
 * margin row. Formula first, then the broker fields or the per-account rows
 * the total was summed from, then what each gauge segment means. Plain text
 * on purpose: the number it explains is the thing to look at.
 */
import { cn } from '@/lib/utils'
import type { Explanation } from '@/utils/bookExplanations'

export function ExplanationBlock({
  explanation,
  onClose,
  className,
}: {
  explanation: Explanation
  onClose: () => void
  className?: string
}) {
  return (
    <div
      className={cn('mt-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-dense-caption', className)}
      role="region"
      aria-label={`How ${explanation.title} is computed`}
      data-testid="explanation"
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">
          How · {explanation.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-dense-caption text-muted-foreground hover:text-foreground"
          aria-label="Close explanation"
          title="Close (Esc)"
        >
          ×
        </button>
      </div>
      <ul className="space-y-0.5 text-foreground">
        {explanation.lines.map((line, i) => (
          <li key={i} className="leading-snug">
            {line}
          </li>
        ))}
      </ul>
      {explanation.rows && explanation.rows.length > 0 ? (
        <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono tabular-nums">
          {explanation.rows.map((r, i) => (
            <div key={i} className="contents">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className={cn('min-w-0', r.warn ? 'text-warning' : 'text-foreground')}>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {explanation.scale && explanation.scale.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
          {explanation.scale.map((s, i) => (
            <li key={i} className="font-mono tabular-nums">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
