/**
 * Plans holding space in the backing pool. Structured plans are not stored yet
 * (DATA-READINESS): grey lamp, no invented dollars.
 */
import { Link } from 'react-router-dom'
import { StatusLamp } from '@/components/StatusLamp'
import { EmptyState } from '@/components/data-display'

export function PlanReservesSection() {
  return (
    <section
      id="backing-reserves"
      className="min-w-0 border px-3 py-2 mat-card"
      aria-label="Plan reserves"
      data-testid="plan-reserves"
    >
      <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-dense-meta font-semibold text-muted-foreground">
          Reserved, not yet used
        </span>
        <span className="text-dense-body font-semibold">plans holding space</span>
        <StatusLamp
          lamp="gray"
          variant="dot"
          title="No structured plans in storage — unknown, not a fault"
        />
        <Link to="/trade/plans" className="ml-auto text-dense-body text-link hover:underline">
          Plans →
        </Link>
      </header>
      <EmptyState
        className="py-3"
        title="No structured plans"
        description="A reserve is intent, not a broker number. Trade Plans does not store entry / target / stop yet, so this page does not invent a dollar figure."
      />
    </section>
  )
}
