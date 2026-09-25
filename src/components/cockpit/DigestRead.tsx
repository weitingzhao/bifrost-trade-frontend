/**
 * The digest panel's body, as `Research Copilot.dc.html` draws it.
 *
 * Columns of `SYM · one sentence · cite`, not the draft's prose. The cite
 * chip opens the page whose lens produced the sentence, which is the whole
 * argument of the panel: every line in the morning read is a reading some
 * page already made, and you can go and look at it.
 *
 * The prose is not dropped — it moves behind a toggle at the foot, because
 * the draft is what the Inbox approves and the reader may want the words it
 * will be approving.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { digestLamps } from '@/lib/harness/dailyDigest'
import { loopLines, nameLines, type DigestLine } from '@/lib/harness/digestRead'
import { StatusLamp } from '@/components/StatusLamp'
import { cn } from '@/lib/utils'

function Lines({ title, note, lines }: { title: string; note?: string; lines: DigestLine[] }) {
  if (lines.length === 0) return null
  return (
    <div className="min-w-0 border-border/60 px-3 py-2.5 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:not(:last-child)]:border-r">
      <p className="m-0 flex flex-wrap items-baseline gap-x-2">
        <span className="text-dense-micro font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {title}
        </span>
        {note ? <span className="text-dense-micro text-muted-foreground/70">{note}</span> : null}
      </p>
      <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
        {lines.map((l, i) => (
          <li key={`${l.sym}-${i}`} className="flex items-baseline gap-2 text-dense-meta leading-normal">
            <span
              className={cn(
                'w-11 shrink-0 font-mono font-bold',
                l.sym === '—' ? 'text-muted-foreground/60' : 'text-entity-symbol',
              )}
            >
              {l.sym}
            </span>
            <span className="min-w-0 text-muted-foreground text-pretty">
              {l.text}{' '}
              {l.cite ? (
                <Link
                  to={l.cite.to}
                  className="ml-0.5 inline-flex items-baseline whitespace-nowrap border px-1 font-mono text-dense-micro text-primary mat-btn"
                  title={`The page this reading came from — ${l.cite.label}`}
                >
                  {l.cite.label}
                </Link>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DigestLampRow({ payload }: { payload: Record<string, unknown> }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {digestLamps(payload).map((l) => (
        <span key={l.label} className="inline-flex items-center gap-1.5 text-dense-meta" title={l.why}>
          <StatusLamp lamp={l.lamp} variant="dot" />
          <span className="font-mono text-muted-foreground">{l.label}</span>
        </span>
      ))}
    </span>
  )
}

export function DigestRead({
  payload,
  prose,
}: {
  payload: Record<string, unknown>
  /** The draft's own words, kept behind a toggle rather than dropped. */
  prose?: React.ReactNode
}) {
  const [proseOpen, setProseOpen] = useState(false)
  const names = nameLines(payload)
  const loop = loopLines(payload)

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* The design splits these into Book and Watchlist. The payload does
            not: `symbols` is one list with `holdings_status: applied`, so the
            split would have to be guessed from this side's own book — a
            second source answering a question the digest already answered its
            own way. One section, and it says so. */}
        <Lines
          title="Names"
          note="book and watchlist in one list — the digest records no split"
          lines={names}
        />
        <Lines title="Loop" lines={loop} />
      </div>
      {prose ? (
        <div className="border-t border-border/60">
          <button
            type="button"
            onClick={() => setProseOpen((o) => !o)}
            aria-expanded={proseOpen}
            className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-dense-meta text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <span aria-hidden>{proseOpen ? '▾' : '▸'}</span>
            The draft’s own words
            <span className="text-dense-micro text-muted-foreground/70">
              — what the Inbox approves
            </span>
          </button>
          {proseOpen ? <div className="px-3 pb-2.5">{prose}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
