/**
 * Where one account's margin figures come from: the strip's pressure,
 * cushion, excess and buying power, as a derivation the reader can walk.
 *
 * Every number is a field of IB's account summary read verbatim from the
 * account snapshot; the page adds exactly one step, pressure = 1 − Cushion.
 * The broker documents identities between its own fields — Cushion is
 * ExcessLiquidity over NetLiquidation, ExcessLiquidity is equity with loan
 * value less maintenance margin, AvailableFunds the same less initial margin,
 * BuyingPower four times that for a margin account. Each is re-run here on
 * the reported inputs and the result compared with the reported figure, so
 * the reader sees the numbers agree with each other and by how much they do
 * not. The broker's figure is always the one on the strip; a re-run never
 * replaces it.
 */
import type { MarginFacts } from './marginPressure'
import { pct0 as pct } from './marginByAccount'
import { PRESSURE_BANDS } from './bookVsBase'
import { fmtUsd } from './positions'
import type { Derivation, Variable, VariableCheck } from './derivation'

const usd = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : fmtUsd(v))
const ratio = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(4))
const sub = (a: number | null, b: number | null) => (a == null || b == null ? null : a - b)

function runCheck(
  computed: number | null,
  reported: number | null,
  fmt: (v: number) => string,
  tolerance: number,
  gapNote: string,
): VariableCheck {
  if (computed == null || reported == null) {
    return {
      verdict: 'unchecked',
      computed: computed == null ? '—' : fmt(computed),
      note: 'Cannot be checked: the broker did not report one of the inputs.',
    }
  }
  const gap = Math.abs(computed - reported)
  if (gap < tolerance) {
    return { verdict: 'agrees', computed: fmt(computed), note: "Re-run on the broker's own fields, it lands on the broker's figure." }
  }
  const rel = reported !== 0 ? ` (${((100 * gap) / Math.abs(reported)).toFixed(2)}%)` : ''
  return { verdict: 'differs', computed: fmt(computed), gap: `${fmt(gap)}${rel}`, note: gapNote }
}

export function marginDerivation(f: MarginFacts, label: string): Derivation {
  const cushionRun = f.excessLiquidity != null && f.netLiquidation ? f.excessLiquidity / f.netLiquidation : null
  const excessRun = sub(f.equityWithLoanValue, f.maintMarginReq)
  const availableRun = sub(f.equityWithLoanValue, f.initMarginReq)
  const buyingPowerRun = f.availableFunds == null ? null : f.availableFunds * 4
  const initOverMaint = sub(f.initMarginReq, f.maintMarginReq)
  const ewlvAboveNlv =
    f.equityWithLoanValue != null && f.netLiquidation != null && f.equityWithLoanValue > f.netLiquidation

  const variables: Variable[] = [
    {
      name: 'Pressure',
      source: 'page',
      value: pct(f.pressure),
      formula: '1 − {Cushion}',
      meaning:
        "How much of the account's liquidation value margin has used up. At 100% excess liquidity is gone and the broker starts closing positions.",
      note:
        f.cushion == null
          ? 'The broker reported no Cushion for this account, so its pressure is unknown.'
          : `MaintMarginReq ÷ NetLiquidation = ${pct(f.maintToNlv)} is a different ratio and is not this.`,
      warn: f.pressure != null && f.pressure >= PRESSURE_BANDS.critical,
    },
    {
      name: 'Cushion',
      source: 'broker',
      value: ratio(f.cushion),
      formula: '{ExcessLiquidity} ÷ {NetLiquidation}',
      meaning: "The broker's own ratio of room to size. The strip's cushion percentage is this figure, rounded.",
      check: runCheck(cushionRun, f.cushion, ratio, 0.0005, 'The broker computes Cushion from the same two fields; a gap means one of them is from a different moment.'),
    },
    {
      name: 'ExcessLiquidity',
      source: 'broker',
      value: usd(f.excessLiquidity),
      formula: '{EquityWithLoanValue} − {MaintMarginReq}',
      meaning: 'The room before a margin call. When it reaches zero the broker starts closing positions; the strip bar is this over NetLiquidation.',
      check: runCheck(
        excessRun,
        f.excessLiquidity,
        usd,
        1,
        "A gap of a few hundred dollars is the broker's own adjustment and is normal; thousands would mean the fields are not from the same moment. NetLiquidation − MaintMarginReq is a different, larger number and is not used.",
      ),
      warn: f.excessLiquidity != null && f.excessLiquidity <= 0,
    },
    {
      name: 'NetLiquidation',
      source: 'broker',
      value: usd(f.netLiquidation),
      meaning: "Every position at the broker's marks, plus cash: what the account is worth closed out now. Read verbatim; the page never recomputes it.",
    },
    {
      name: 'EquityWithLoanValue',
      source: 'broker',
      value: usd(f.equityWithLoanValue),
      meaning: 'Cash + stock + bond + fund value: the part of the account the broker lends against.',
      note: ewlvAboveNlv
        ? `US option value is not in it, so with a net-short options book it sits above NetLiquidation (${usd(f.equityWithLoanValue)} vs ${usd(f.netLiquidation)}).`
        : 'US option value is not in it, which is why it can differ from NetLiquidation.',
    },
    {
      name: 'MaintMarginReq',
      source: 'broker',
      value: usd(f.maintMarginReq),
      meaning: "Margin the broker's model requires to keep the current positions open; it moves with the marks and with volatility.",
      note: f.maintToNlv == null ? undefined : `${pct(f.maintToNlv)} of NetLiquidation.`,
    },
    {
      name: 'InitMarginReq',
      source: 'broker',
      value: usd(f.initMarginReq),
      meaning: 'Margin the same book would need to open today.',
      note:
        initOverMaint == null
          ? undefined
          : Math.abs(initOverMaint) < 1
            ? 'Equal to MaintMarginReq here.'
            : `${usd(Math.abs(initOverMaint))} ${initOverMaint > 0 ? 'above' : 'below'} MaintMarginReq.`,
    },
    {
      name: 'AvailableFunds',
      source: 'broker',
      value: usd(f.availableFunds),
      formula: '{EquityWithLoanValue} − {InitMarginReq}',
      meaning: 'What can go into new positions before the broker says no.',
      check: runCheck(availableRun, f.availableFunds, usd, 1, 'The broker computes AvailableFunds from the same two fields; a gap means one of them is from a different moment.'),
    },
    {
      name: 'BuyingPower',
      source: 'broker',
      value: usd(f.buyingPower),
      formula: '{AvailableFunds} × 4',
      meaning:
        "What the broker lets a margin account buy: (the lower of EquityWithLoanValue and yesterday's, less InitMarginReq) × 4 — AvailableFunds × 4 while today's equity is the lower.",
      note: 'The cockpit and the Asset mix ring show this figure unchanged; the page never scales it.',
      check: runCheck(buyingPowerRun, f.buyingPower, usd, 1, "Yesterday's equity with loan value was the lower of the two, so the broker used it instead of today's."),
    },
  ]

  return {
    title: `${label} — ${f.accountId}`,
    intro:
      'Every figure is an IB account-summary field read verbatim from the account snapshot; this page adds one step, pressure = 1 − Cushion. Click a variable for what it means and how it checks out.',
    roots: ['Pressure', 'BuyingPower'],
    variables: Object.fromEntries(variables.map((v) => [v.name, v])),
    scale: [
      `1/4 below ${pct(PRESSURE_BANDS.idle)} · 2/4 to ${pct(PRESSURE_BANDS.heavy)} · 3/4 to ${pct(PRESSURE_BANDS.critical)} · 4/4 from ${pct(PRESSURE_BANDS.critical)} (broker liquidates at 100%)`,
    ],
  }
}
