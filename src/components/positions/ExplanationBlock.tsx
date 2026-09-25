/**
 * "How was this computed" — the box a `?` opens under a cockpit line or a
 * demand / supply figure, in the prototype's form: a `How · name` caption with
 * the headline beside it, the rest of the reasoning, the rows the total was
 * summed from, and what each gauge segment means along the foot.
 */
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Explanation } from '@/utils/bookExplanations'
import { positionsUi } from './positionsUi'

export function ExplanationBlock({
  explanation,
  onClose,
  className,
}: {
  explanation: Explanation
  onClose: () => void
  className?: string
}) {
  const [lead, ...rest] = explanation.lines
  return (
    <div
      className={cn(
        'mx-2.5 mt-0.5 mb-2.25 border leading-normal mat-card',
        className,
      )}
      role="region"
      aria-label={`How ${explanation.title} is computed`}
      data-testid="explanation"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div className="flex flex-wrap items-baseline gap-2 px-2.5 pt-1.75 pb-1">
        <span className={cn(positionsUi.cap, 'text-secondary-foreground')}>How · {explanation.title}</span>
        <span className="min-w-0 flex-[1_1_260px] text-dense-meta text-muted-foreground text-pretty">{lead}</span>
        <button
          type="button"
          onClick={onClose}
          className={cn(positionsUi.btn, 'h-4.5 px-1.25')}
          aria-label="Close explanation"
          title="Close (Esc)"
        >
          ✕
        </button>
      </div>
      {rest.length > 0 || (explanation.rows && explanation.rows.length > 0) ? (
        <div className="flex flex-col gap-1 px-2.5 pb-1.5">
          {rest.map((line, i) => (
            <p key={i} className="m-0 text-dense-meta text-secondary-foreground text-pretty">
              {line}
            </p>
          ))}
          {explanation.rows && explanation.rows.length > 0 ? (
            <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-dense-meta tabular-nums">
              {explanation.rows.map((r, i) => (
                <div key={i} className="contents">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className={cn('m-0 min-w-0', r.warn ? 'text-warning' : 'text-secondary-foreground')}>{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
      {explanation.out ? (
        <div className="border-t border-border/60 px-2.5 py-1.25">
          <Link to={explanation.out.to} className={positionsUi.link}>
            {explanation.out.label}
          </Link>
        </div>
      ) : null}
      {explanation.scale && explanation.scale.length > 0 ? (
        <div className="flex flex-col gap-0.5 border-t border-border/60 px-2.5 pt-1.25 pb-2">
          {explanation.scale.map((sc, i) => (
            <span key={i} className={cn(positionsUi.mono, 'text-dense-caption text-muted-foreground text-pretty')}>
              {sc}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
