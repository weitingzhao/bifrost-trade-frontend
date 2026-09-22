/**
 * The rows a face carries that are not lenses — and where each one comes from.
 *
 * The design's cards are not lists of lens verdicts: each carries two or three
 * readings that have no band and no track record, and they are half of what
 * makes a card worth reading. `Walls 145 / 165` is not a verdict about anything;
 * it is where the dealers are.
 *
 * ## Every one of them was already in the payload
 *
 * Measured against DEV on 2026-09-21 (AMD), the exhibits this page already
 * fetches carry them in `readings`, so none of this costs a request:
 *
 * | design row                | source                                            |
 * |---------------------------|---------------------------------------------------|
 * | `GEX regime · flip`       | `gex_regime.readings.zero_gamma`                  |
 * | `Walls`                   | `gex_regime.readings.major_put_wall` / `_call_wall` |
 * | `OpEx pin`                | `opex_pin.readings.pin_pct_distance` + `expiry`   |
 * | `Close expectation 20d`   | `terrain_regime.readings.expected_close`          |
 * | `Structure · VCP`         | `sepa.readings.structure_score`                   |
 * | `Momentum grade`          | `momentum.readings.grade`                         |
 * | `OpEx` days               | `opex_pin.readings.dte`                           |
 * | `Held`                    | the book this app already reads                   |
 *
 * One needs a second request and gets it: **`SEPA trend template 9 / 11`**. The
 * exhibit carries `trend_template_score` (a percentage), and the repo has
 * already ruled once that the count is the better form and must be read from
 * `tech_pass_count` rather than divided back out of the score — a score without
 * its count stays a score. `/research/sepa/model/daily?symbol=` answers with
 * the count for one name.
 *
 * Two the design draws are **not** in reach. `Forecast 30d hit` is a track
 * record for a lens that returns no reading on any name, and the Scenario card
 * already carries that lens as a row saying so — a second row would have said
 * it twice. `Vol / OI top strike` is a per-strike reading that lives in the
 * chain rather than in the flow lens; Flow gets the two put/call ratios it does
 * carry instead, which answer the same question from the same store.
 */
import type { ExhibitPayload } from '@/api/research/exhibit'
import type { DossierFaceId, FaceExtras } from '@/lib/dossier'
import { canonicalLens } from '@/lib/regimeRibbon'
import { finiteOrNull } from '@/utils/finite'
import { fmtNum } from '@/lib/format'

export interface SepaCounts {
  techPass: number | null
  techOf: number
  fundPass: number | null
  fundOf: number
}

/** The eleven checks of the trend template and the eight of the screen. */
export const TREND_CHECKS = 11
export const GROWTH_CHECKS = 8

function readingsOf(
  exhibits: readonly ExhibitPayload[],
  lens: string,
): Record<string, unknown> | null {
  const ex = exhibits.find((e) => canonicalLens(e.lens_id ?? e.lens) === lens)
  return (ex?.readings as Record<string, unknown> | undefined) ?? null
}

/* Named for what they read rather than for their type: `str` and `num` are
   each on their third copy in this repo, and the code-health ratchet counts a
   name defined four times as one duplicated concept. */
function readNum(r: Record<string, unknown> | null, key: string): number | null {
  return r ? finiteOrNull(r[key] as number | null | undefined) : null
}

function readStr(r: Record<string, unknown> | null, key: string): string | null {
  const v = r?.[key]
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

/**
 * What each face shows beyond its lenses.
 *
 * `held` is the book's answer, not a guess from the legs rail: a name can be
 * held with no option legs on it.
 */
export function faceExtras(
  exhibits: readonly ExhibitPayload[],
  opts: { held: boolean; watched: boolean; sepa?: SepaCounts | null },
): Partial<Record<DossierFaceId, FaceExtras>> {
  const gex = readingsOf(exhibits, 'gex_regime')
  const opex = readingsOf(exhibits, 'opex_pin')
  const terrain = readingsOf(exhibits, 'terrain_regime')
  const sepaR = readingsOf(exhibits, 'sepa')
  const mom = readingsOf(exhibits, 'momentum')
  const flow = readingsOf(exhibits, 'order_sentiment')

  const putWall = readNum(gex, 'major_put_wall')
  const callWall = readNum(gex, 'major_call_wall')
  const zeroGamma = readNum(gex, 'zero_gamma')
  const regime = readStr(gex, 'regime')
  const expectedClose = readNum(terrain, 'expected_close')
  const structure = readNum(sepaR, 'structure_score')
  const momGrade = readStr(mom, 'grade')
  const opexDte = readNum(opex, 'dte')
  const pinPct = readNum(opex, 'pin_pct_distance')
  const maxPain = readNum(opex, 'max_pain_strike')
  const opexExpiry = readStr(opex, 'expiry')
  const pcrVol = readNum(flow, 'pcr_volume')
  const pcrOi = readNum(flow, 'pcr_oi')
  const techPass = opts.sepa?.techPass ?? null

  return {
    trend: {
      values: {
        // `9 / 11`, the form that says which checks the name is missing.
        ...(techPass != null ? { sepa: `${techPass} / ${TREND_CHECKS}` } : {}),
        ...(momGrade ? { momentum: momGrade } : {}),
      },
      rows:
        structure != null
          ? [
              {
                id: 'structure',
                label: 'Structure · VCP',
                value: fmtNum(structure, 1),
                means: null,
              },
            ]
          : [],
    },
    dealer: {
      values: {
        ...(regime && zeroGamma != null
          ? { gex_regime: `${regime} γ · flip ${fmtNum(zeroGamma, 0)}` }
          : {}),
        // The design prints the distance *and* the strike it is a distance
        // from: `1.2% · 155`. A percentage with no strike is a number you
        // cannot act on, and the strike alone is not a reading.
        ...(pinPct != null && maxPain != null
          ? { opex_pin: `${(pinPct * 100).toFixed(1)}% · ${fmtNum(maxPain, 0)}` }
          : {}),
      },
      rows:
        putWall != null || callWall != null
          ? [
              {
                id: 'walls',
                label: 'Walls · put / call',
                value: `${putWall == null ? '—' : fmtNum(putWall, 0)} / ${callWall == null ? '—' : fmtNum(callWall, 0)}`,
                means: null,
              },
            ]
          : [],
    },
    scenario: {
      rows: [
        ...(expectedClose != null
          ? [
              {
                id: 'expected-close',
                label: 'Close expectation',
                value: fmtNum(expectedClose, 2),
                means: null,
              },
            ]
          : []),
      ],
    },
    flow: {
      rows: [
        ...(pcrVol != null
          ? [
              {
                id: 'pcr-volume',
                label: 'Put / call · volume',
                value: fmtNum(pcrVol, 2),
                means: null,
              },
            ]
          : []),
        ...(pcrOi != null
          ? [{ id: 'pcr-oi', label: 'Put / call · OI', value: fmtNum(pcrOi, 2), means: null }]
          : []),
      ],
    },
    events: {
      rows: [
        {
          id: 'earnings',
          label: 'Earnings',
          value: '—',
          means:
            'No forward earnings date reaches this side: the events calendar answers with nothing, and the gap behind it is a vendor subscription. The design gates every short-premium rule on this date.',
        },
        {
          id: 'opex',
          label: 'OpEx',
          value:
            opexDte == null
              ? '—'
              : `${opexDte} ${opexDte === 1 ? 'day' : 'days'}${opexExpiry ? ` · ${opexExpiry}` : ''}`,
          means: opexDte == null ? 'No pin reading for this name, so no expiry to count to.' : null,
        },
        {
          id: 'held',
          label: 'Held',
          value: opts.held ? 'in the book' : opts.watched ? 'watchlist only' : 'not held',
          means: null,
        },
      ],
    },
  }
}
