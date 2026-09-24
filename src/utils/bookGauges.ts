/**
 * The four book readings — Pressure, Backing, Risk, Potential — in words and
 * figures, written once.
 *
 * Positions prints them as its hero band (design Rev 2026-09-23.21, §16);
 * Backing & Model prints two of them as rows in its cockpit. Both read this,
 * so the figure on one page and the line on the other are the same string
 * (§14.2). The grades come from bookVsBase and nothing here re-grades: a
 * reading only says what the grade was made of.
 */
import type { BookVsBase } from './bookVsBase'
import { litSegments, potentialSegments } from './bookExplanations'
import { pct0, usdAbbrev } from './marginByAccount'
import type { ObligationsSort } from './obligationsRoom'
import { fmtUsd } from './positions'
import type { RoomSummary } from './roomToAdd'
import { fmtSpotDate, type SpotMix } from './spotPrice'

export type GaugeId = 'pressure' | 'backing' | 'risk' | 'potential'

export interface GaugeReading {
  /** Also the How topic that walks the figure. */
  id: GaugeId
  name: string
  /** Segments lit, 0–4. A graded gauge lights level + 1; Potential is a meter. */
  lit: number
  /** Potential measures room, it does not grade danger: it never turns amber. */
  meter: boolean
  /** Three of four lit on a graded gauge — the reading an operator acts on. */
  warn: boolean
  /** The one figure a card leads with. */
  hero: string
  /** The line under it: what the grade was made of. */
  read: string
  /** What the gauge measures and where its levels start. */
  title: string
  /** The section that holds the detail; the gauge's name opens it. */
  target: { to: 'margin' | 'coverage' | 'ladder' | 'room'; sort?: ObligationsSort }
}

function signedPct1(v: number): string {
  return `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}%`
}

function graded(id: GaugeId, lit: number): Pick<GaugeReading, 'id' | 'lit' | 'meter' | 'warn'> {
  return { id, lit, meter: false, warn: lit >= 3 }
}

export function bookGauges(
  book: BookVsBase,
  { tightPct, spotMix, room }: { tightPct: number; spotMix?: SpotMix; room?: RoomSummary }
): GaugeReading[] {
  const { pressure, backing, risk, potential } = book
  const c = risk.counts

  const riskRead = [
    `${c.itm} ITM · ${c.near7d} ≤7d`,
    c.zeroDte > 0 ? `${c.zeroDte} today` : null,
    c.unpriced > 0 ? `${c.unpriced} unpriced` : null,
    spotMix && spotMix.close > 0
      ? `${spotMix.close} at close ${fmtSpotDate(spotMix.oldestCloseAsOf, 'close')}`
      : null,
    spotMix && spotMix.mark > 0
      ? `${spotMix.mark} at mark ${fmtSpotDate(spotMix.oldestMarkAsOf)}`
      : null,
    c.tightest == null
      ? 'tightest n/a'
      : `tightest ${signedPct1(c.tightest)} vs ${Math.round(tightPct * 100)}%`,
  ]

  const roomRead = room
    ? `Room +${room.calls} calls · ${room.puts == null ? '—' : `+${room.puts}`} puts backed · ${
        room.marginPuts == null ? '—' : `+${room.marginPuts}`
      } on margin to ${Math.round(room.ceiling * 100)}%`
    : `${potential.moreCalls} more calls · ${potential.sharesFree.toLocaleString()} free sh`
  const theta =
    potential.thetaPerDay != null
      ? `θ ${potential.thetaPerDay >= 0 ? '+' : '−'}${fmtUsd(Math.abs(potential.thetaPerDay), true)}/d`
      : null
  const income = room?.income ?? null

  return [
    {
      ...graded('pressure', litSegments(pressure.pct == null ? null : pressure.level)),
      name: 'Pressure',
      hero: pct0(pressure.pct),
      read: `${pct0(pressure.pct)} used · cushion ${pct0(pressure.cushion)} · liquidation at 100%`,
      title:
        "1 − the broker's own Cushion. At 100% excess liquidity is gone and it starts closing positions; level 3 begins at 75%.",
      target: { to: 'margin' },
    },
    {
      ...graded('backing', litSegments(backing.level)),
      name: 'Backing',
      hero: backing.callsTotal > 0 ? `${backing.callsCovered}/${backing.callsTotal}` : 'no calls',
      read: [
        `${backing.callsCovered}/${backing.callsTotal} calls covered`,
        backing.nakedCalls > 0 ? `${backing.nakedCalls} naked` : null,
        backing.putCashNeeded > 0
          ? `puts ${usdAbbrev(backing.putCashNeeded)} vs cash ${usdAbbrev(backing.cashLike)}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      title:
        'What the options need against what actually backs them. Any naked call is level 2; puts leaning on margin rather than cash is level 1.',
      target: { to: 'coverage', sort: 'cash' },
    },
    {
      ...graded('risk', litSegments(risk.level)),
      name: 'Risk',
      hero: `${c.itm} ITM`,
      read: riskRead.filter(Boolean).join(' · '),
      title:
        'Short legs already past their strike, or expiring within a week. Unpriced legs are excluded from both counts and are not known to be safe.',
      target: { to: 'ladder' },
    },
    {
      id: 'potential',
      lit: potentialSegments(book),
      meter: true,
      warn: false,
      name: 'Potential',
      // The hero is money a cycle, so the line says so; with no premium to
      // price the added contracts from, the card leads with the dash.
      hero: income == null ? '—' : `+${usdAbbrev(income)}`,
      read: [roomRead, theta, income == null ? null : 'per cycle'].filter(Boolean).join(' · '),
      title:
        'Room to add: what the free base still backs, what margin adds up to your ceiling, and what the book decays by a day. A meter, not a warning: the segments are the share of held shares still free.',
      target: { to: 'room' },
    },
  ]
}
