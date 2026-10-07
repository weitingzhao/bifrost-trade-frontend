import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { fmtIsoDateToken } from '@/lib/format'
import { transferPayUi } from './transferPayUi'

/**
 * Two statements, and the section is only honest with both of them.
 *
 * The ruling (DESIGN_CONTRACTS §14.5, ruled 2026-09-16) and what reads it today.
 * Performance's Return basis takes these deposits and withdrawals out of the
 * closing net liquidation the nightly snapshot stores (api 0.12.0, TD-138);
 * against an API that does not serve it, the second line says so instead.
 *
 * `navSessions`: the stored sessions; null when the API does not serve the
 * route; undefined while loading.
 */
export function TransferPayDownstream({ navSessions }: { navSessions?: readonly string[] | null }) {
  const n = navSessions?.length ?? 0
  const first = navSessions?.[0] ?? null
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
            className={cn(
              transferPayUi.downstreamLamp,
              n >= 2 ? transferPayUi.downstreamLampRuled : transferPayUi.downstreamLampUnwired,
            )}
            aria-hidden
          />
          {navSessions === undefined ? (
            <span className="text-muted-foreground">
              Who reads these rows is not known yet — the stored net liquidation has not answered.
            </span>
          ) : navSessions === null ? (
            <span>
              <strong className={transferPayUi.downstreamStrong}>Not wired yet.</strong> Nothing in
              code subtracts them today: this API does not serve the stored net liquidation, so
              Performance shows the basis it will use, marked{' '}
              <span className="font-mono">designed · not wired</span> — so nobody reads today&apos;s
              return as already net.
            </span>
          ) : n >= 2 ? (
            <span>
              <strong className={transferPayUi.downstreamStrong}>Read by Performance.</strong>{' '}
              Return basis takes these deposits and withdrawals out of the closing net liquidation
              stored each night since {fmtIsoDateToken(first)} — {n} sessions so far — and chains a
              time-weighted return over them. Dividends, fees, tax and interest stay in the gain.
            </span>
          ) : (
            <span>
              <strong className={transferPayUi.downstreamStrong}>Wired, not yet readable.</strong>{' '}
              Closing net liquidation is stored nightly
              {first ? ` from ${fmtIsoDateToken(first)}` : ''}; a return needs two closes, so nothing
              subtracts these yet.
            </span>
          )}
        </p>
      </div>
      <div className={transferPayUi.downstreamFoot}>
        <Link to="/portfolio/performance" className="font-medium text-primary hover:underline">
          Return basis → Performance
        </Link>
        <span className="text-muted-foreground">
          the panel that states the arithmetic, and the one place that number may be computed.
        </span>
      </div>
    </div>
  )
}
