/**
 * The seat rail at the top of the Research group: three postures, one lit.
 *
 * Switching a seat re-lays the group beneath it and lands on that seat's
 * home; it does not hide anything. The caption under the rail says what the
 * lit seat means, so the word "Autopilot" on a menu is never the only
 * explanation of what it does.
 */
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { RESEARCH_SEATS, SEAT_META, setResearchSeat, useResearchSeat, type ResearchSeat } from '@/lib/research/seat'

export function ResearchSeatRail() {
  const seat = useResearchSeat()
  const navigate = useNavigate()
  const meta = SEAT_META[seat]

  const choose = (next: ResearchSeat) => {
    if (next === seat) return
    setResearchSeat(next)
    navigate(SEAT_META[next].home)
  }

  return (
    <div className="mb-1 px-1">
      <div
        role="radiogroup"
        aria-label="Research seat"
        className="grid grid-cols-3 gap-0.5 rounded-md border border-sidebar-border/60 bg-sidebar-accent/30 p-0.5"
      >
        {RESEARCH_SEATS.map((id) => {
          const m = SEAT_META[id]
          const Icon = m.icon
          const lit = id === seat
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={lit}
              title={`${m.label} · ${m.level} — ${m.claim}`}
              onClick={() => choose(id)}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded px-1 py-1.5 text-dense-micro font-medium leading-none transition-colors',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring',
                lit
                  ? 'bg-sidebar-accent text-sidebar-primary shadow-sm'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{m.label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-1 px-1 text-dense-micro leading-snug text-sidebar-foreground/50">
        <span className="text-sidebar-foreground/70">{meta.level}</span> · {meta.claim}
      </p>
    </div>
  )
}
