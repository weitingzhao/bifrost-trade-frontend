import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { transferPayUi } from './transferPayUi'

/**
 * Two statements, and the section is only honest with both of them.
 *
 * Saying only that returns are measured net of these flows would describe code
 * that does not exist. Saying only that nothing is wired would hide a decision
 * the Owner has already made (DESIGN_CONTRACTS §14.5, ruled 2026-09-16), and a
 * real gap between the two.
 */
export function TransferPayDownstream() {
  return (
    <div className={transferPayUi.downstreamPanel}>
      <div className={transferPayUi.downstreamHead}>
        <span className={transferPayUi.downstreamCap}>Downstream</span>
        <span className={transferPayUi.downstreamTitle}>who should be reading this</span>
      </div>
      <div className={transferPayUi.downstreamBody}>
        <p className={transferPayUi.downstreamLine}>
          <span
            className={cn(transferPayUi.downstreamLamp, transferPayUi.downstreamLampRuled)}
            aria-hidden
          />
          <span>
            <strong className={transferPayUi.downstreamStrong}>
              Ruled: performance is measured net of these.
            </strong>{' '}
            A deposit raises the balance without earning anything, so return is computed on the
            investment gain — balance change less deposits plus withdrawals — and the headline is
            time-weighted, cut into sub-periods at every flow on this page. That is the industry
            basis, and it is the house basis as of 2026-09-16.
          </span>
        </p>
        <p className={transferPayUi.downstreamLine}>
          <span
            className={cn(transferPayUi.downstreamLamp, transferPayUi.downstreamLampUnwired)}
            aria-hidden
          />
          <span>
            <strong className={transferPayUi.downstreamStrong}>Not wired yet.</strong> Nothing in
            code subtracts them today: this table is written, read here, and read nowhere else.
            Performance shows the basis it will use, marked{' '}
            <span className="font-mono">designed · not wired</span> — so nobody reads today&apos;s
            return as already net.
          </span>
        </p>
      </div>
      <div className={transferPayUi.downstreamFoot}>
        <Link to="/portfolio/performance" className="font-medium text-primary hover:underline">
          Return basis → Performance
        </Link>
        <span className="text-muted-foreground">
          the panel that states the arithmetic, and the one place that number may be computed. This
          is a link, not evidence that anything reads these rows.
        </span>
      </div>
    </div>
  )
}
