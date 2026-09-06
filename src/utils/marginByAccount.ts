/**
 * Margin pressure, one line per account.
 *
 * The cockpit's Pressure gauge is summed excess over summed net liq across
 * every funded account. That is the right portfolio number and the wrong
 * liquidation number: IB liquidates per account, so a blended 26% can sit on
 * top of one account at 80%. rollupMargin already keeps the worst account as
 * `tightest`; this lays all of them out so the eye does the comparison instead
 * of trusting a single "worst" pick.
 *
 * Everything here is read from MarginFacts, which is the broker's own view
 * taken verbatim. Nothing is re-derived: a null cushion stays null and is
 * shown as unknown, because an account whose cushion the broker did not
 * report is not known to be safe.
 */
import type { MarginFacts, MarginRollup } from './marginPressure'
import { PRESSURE_BANDS, pressureLevel, type GaugeLevel } from './bookVsBase'
import { fmtUsd } from './positions'

export type MarginAccountRole = 'host' | 'secondary' | 'other'

/** Bar fill tone by gauge level. Same mapping the cockpit gauges use. */
export type MarginAccountTone = 'profit' | 'warning' | 'loss'

export interface MarginAccountRow {
  accountId: string
  role: MarginAccountRole
  /** Host / Secondary / the raw id for anything else. */
  label: string
  /** The broker fields the row was read from, for the explanation. */
  facts: MarginFacts
  /** False when the page's account filter has this account toggled off. */
  inScope: boolean
  /** 1 − the broker's Cushion; null when the broker did not report one. */
  pressure: number | null
  cushion: number | null
  /** Null when pressure is null — an unknown is not level 0. */
  level: GaugeLevel | null
  tone: MarginAccountTone | null
  /** "26%" — the bar's number; null when unknown. */
  pctText: string | null
  /** "cushion 74% · excess $468.9k · BP $1.87M"; null when unknown. */
  detailText: string | null
  /** The raw broker fields, one per line, for the row's hover title. */
  rawTitle: string
}

export interface MarginAccountFilter {
  host: boolean
  secondary: boolean
}

/** Positions of the band boundaries on a 0–100% bar. */
export const PRESSURE_TICKS: readonly number[] = [
  PRESSURE_BANDS.idle,
  PRESSURE_BANDS.heavy,
  PRESSURE_BANDS.critical,
]

const LEVEL_TONE: Record<GaugeLevel, MarginAccountTone> = {
  0: 'profit',
  1: 'profit',
  2: 'warning',
  3: 'loss',
}

export function pct0(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)}%`
}

/** $1.87M / $468.9k / $950.00 — the cockpit's abbreviation, so the two strips read alike. */
export function usdAbbrev(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '—'
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return fmtUsd(v)
}

function roleOf(accountId: string, hostId: string, secondaryId: string): MarginAccountRole {
  // An empty configured id must not match an account whose id is also blank;
  // that account is "other", not the host.
  if (hostId && accountId === hostId) return 'host'
  if (secondaryId && accountId === secondaryId) return 'secondary'
  return 'other'
}

const ROLE_ORDER: Record<MarginAccountRole, number> = { host: 0, secondary: 1, other: 2 }

function labelOf(role: MarginAccountRole, accountId: string): string {
  if (role === 'host') return 'Host'
  if (role === 'secondary') return 'Secondary'
  return accountId
}

function rawTitleOf(f: MarginFacts, label: string): string {
  return [
    `${f.accountId} — ${label}`,
    `NetLiquidation ${fmtUsd(f.netLiquidation)}`,
    `MaintMarginReq ${fmtUsd(f.maintMarginReq)}`,
    `ExcessLiquidity ${fmtUsd(f.excessLiquidity)}`,
    `BuyingPower ${fmtUsd(f.buyingPower)}`,
    `Cushion ${f.cushion == null ? '—' : f.cushion.toFixed(4)}`,
  ].join('\n')
}

/**
 * Host first, secondary second, anything else after in the order the rollup
 * gave it. Accounts the filter has no switch for are treated as in scope —
 * the filter cannot exclude them, so dimming them would claim a state the
 * page does not have.
 */
export function marginAccountRows(
  margin: MarginRollup,
  hostId: string,
  secondaryId: string,
  filter: MarginAccountFilter
): MarginAccountRow[] {
  const host = hostId.trim()
  const secondary = secondaryId.trim()
  return margin.accounts
    .map((f, index) => ({ f, index, role: roleOf(f.accountId, host, secondary) }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.index - b.index)
    .map(({ f, role }) => {
      const label = labelOf(role, f.accountId)
      const level = f.pressure == null ? null : pressureLevel(f.pressure)
      return {
        accountId: f.accountId,
        role,
        label,
        facts: f,
        inScope: role === 'host' ? filter.host : role === 'secondary' ? filter.secondary : true,
        pressure: f.pressure,
        cushion: f.cushion,
        level,
        tone: level == null ? null : LEVEL_TONE[level],
        pctText: f.pressure == null ? null : pct0(f.pressure),
        detailText:
          f.pressure == null
            ? null
            : `cushion ${pct0(f.cushion)} · excess ${usdAbbrev(f.excessLiquidity)} · BP ${usdAbbrev(f.buyingPower)}`,
        rawTitle: rawTitleOf(f, label),
      }
    })
}
