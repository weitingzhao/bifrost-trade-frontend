/**
 * A desk-tier page on a phone (DESIGN_CONTRACTS §18.2): the page area becomes
 * one card that says what the page is and where it lives — the page's name,
 * "is built for a larger screen", Back and Home. Never a blank page, never a
 * silent redirect: the address stays, so the same link opens the page on the
 * iPad or the desk.
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { routeFor } from '../routeRegistry'
import { useCrumbLabel } from '../useCrumbLabel'
import css from './phone.module.css'

export function DeskGate() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const label = useCrumbLabel(pathname, routeFor(pathname).label)
  return (
    <section className={css.gate} role="region" aria-label="Not on iPhone" data-desk-gate="">
      <span className={css.gateKind}>iPad · desktop</span>
      <b className={css.gateTitle}>{label} is built for a larger screen</b>
      <p className={css.gateBody}>
        On iPhone you watch the book and act on it: positions, alerts, the inbox, close and roll. This page builds or edits,
        and it needs the room.
      </p>
      <div className={css.gateActions}>
        <button
          type="button"
          className={css.gateBtn}
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
        >
          Back
        </button>
        <button type="button" className={css.gateBtn} data-primary="1" onClick={() => navigate('/home')}>
          Home
        </button>
      </div>
    </section>
  )
}
