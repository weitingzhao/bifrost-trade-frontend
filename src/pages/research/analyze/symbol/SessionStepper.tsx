/**
 * ‹ date › Newest — steps a panel through the market's sessions. `day` is the
 * session on show; `picked` says the reader chose it, which is when Newest
 * appears to hand the panel back to the newest session the store holds.
 */
const stepBtn =
  'mat-btn inline-flex h-5 min-w-5 cursor-pointer items-center justify-center px-1.5 text-dense-micro text-secondary-foreground disabled:cursor-default disabled:opacity-40'

export function SessionStepper({
  day,
  sessions,
  picked,
  onGo,
  label,
}: {
  day: string
  sessions: readonly string[]
  picked: boolean
  onGo: (date: string | null) => void
  /** What the date picks, for the input's accessible name. */
  label: string
}) {
  const prevDay = day ? ([...sessions].reverse().find((d) => d < day) ?? null) : null
  const nextDay = day ? (sessions.find((d) => d > day) ?? null) : null
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        className={stepBtn}
        disabled={!prevDay}
        onClick={() => onGo(prevDay)}
        aria-label="Previous session"
        title={prevDay ? `Read ${prevDay}` : 'No earlier session in the year of market closes'}
      >
        ‹
      </button>
      <input
        type="date"
        aria-label={label}
        value={day}
        min={sessions[0]}
        max={sessions[sessions.length - 1] || undefined}
        onChange={(e) => onGo(e.target.value || null)}
        className="mat-field h-5 w-[7.5rem] px-1 font-mono text-dense-micro tabular-nums"
      />
      <button
        type="button"
        className={stepBtn}
        disabled={!nextDay}
        onClick={() => onGo(nextDay)}
        aria-label="Next session"
        title={nextDay ? `Read ${nextDay}` : 'No later session'}
      >
        ›
      </button>
      {picked ? (
        <button type="button" className={stepBtn} onClick={() => onGo(null)} title="Back to the newest session the store holds">
          Newest
        </button>
      ) : null}
    </span>
  )
}
