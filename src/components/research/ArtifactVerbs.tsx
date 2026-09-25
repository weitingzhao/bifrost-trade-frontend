import { cn } from '@/lib/utils'
import { VERBS, type VerbKey } from '@/lib/harness/artifactVerbs'

/**
 * The six verbs, drawn for one artifact (Research Vision §6, design Rev
 * 2026-09-22.7).
 *
 * It renders and reports; the host decides what each verb does, which is how
 * the same row can sit on an Inbox card, a bench result and a Book card
 * without any of them agreeing on behaviour.
 *
 * Three states, and only one of them is about attention: `on` is the open
 * Explain (lime), `off` is a verb this artifact cannot offer (dimmed), and
 * **amber marks the one verb that writes** — it is on every card that can be
 * distilled, so reading it as "look here" is the mistake it exists to prevent.
 */
export function ArtifactVerbs({
  artifact,
  active,
  off,
  onVerb,
  className,
}: {
  /** The artifact id, shown before the row. */
  artifact?: string | null
  active?: VerbKey | null
  off?: ReadonlySet<VerbKey>
  onVerb: (verb: VerbKey) => void
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex min-w-0 flex-wrap items-center gap-1', className)}
      title="Research Vision §6 — the six verbs every artifact carries. Four read and never write, Settle records a fact, Distill is the one write and it goes through the Inbox."
    >
      {artifact ? (
        <span className="mr-1 font-mono text-dense-micro text-muted-foreground">{artifact}</span>
      ) : null}
      {VERBS.map((v) => {
        const isOff = off?.has(v.key) ?? false
        const isOn = active === v.key
        return (
          <button
            key={v.key}
            type="button"
            disabled={isOff}
            onClick={(e) => {
              e.stopPropagation()
              onVerb(v.key)
            }}
            title={v.tip + (isOff ? ' — not available on this artifact yet' : '')}
            className={cn(
              // Rev .62: a secondary control, no frame — the state is the fill.
              'h-[22px] border px-2 text-dense-meta font-semibold whitespace-nowrap transition-colors mat-btn',
              isOff
                ? 'cursor-not-allowed text-muted-foreground opacity-45'
                : v.write
                  ? 'bg-warning/15 text-warning hover:bg-warning/25'
                  : isOn
                    ? 'bg-success/20 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {v.label}
          </button>
        )
      })}
    </span>
  )
}
