/**
 * The screen band — Screener › Contracts' live rule, carried into the Symbol
 * page's Chain face (design `Research Symbol.dc.html`, §isOptions: the
 * `screen band` chip on 3 · Strikes, "Carried in from Screener › Contracts").
 *
 * One URL param, one encoding, and both sides read this file so they cannot
 * drift: the screen writes the band it is actually filtering by at click
 * time, the ladder highlights the legs that rule would keep. The Δ half is
 * the cash-secured-put structure's own target band; the DTE half is the
 * screen's slider pair, so a moved slider travels with the link.
 */

/** `?band=` on the Symbol page's chain tab. */
export const SCREEN_BAND_PARAM = 'band'

/** The CSP structure's target |Δ| band — the screen's rule, not a preference. */
export const SCREEN_DELTA_BAND: readonly [number, number] = [0.15, 0.35]

export interface ScreenBand {
  dteMin: number
  dteMax: number
  deltaMin: number
  deltaMax: number
}

/** `14-45:0.15-0.35` — days first, |Δ| second. */
export function encodeScreenBand(b: ScreenBand): string {
  return `${b.dteMin}-${b.dteMax}:${b.deltaMin}-${b.deltaMax}`
}

export function parseScreenBand(raw: string | null): ScreenBand | null {
  if (!raw) return null
  const m = /^(\d+)-(\d+):([\d.]+)-([\d.]+)$/.exec(raw)
  if (!m) return null
  const [dteMin, dteMax, deltaMin, deltaMax] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  if (![dteMin, dteMax, deltaMin, deltaMax].every(Number.isFinite)) return null
  if (dteMin > dteMax || deltaMin > deltaMax) return null
  return { dteMin, dteMax, deltaMin, deltaMax }
}

/** The chip's text — the design's own form: `14–45d · Δ .15–.35`. */
export function screenBandLabel(b: ScreenBand): string {
  const d = (v: number) => `.${String(Math.round(v * 100)).padStart(2, '0')}`
  return `${b.dteMin}–${b.dteMax}d · Δ ${d(b.deltaMin)}–${d(b.deltaMax)}`
}

/**
 * Whether one leg sits inside the band — the design's rule verbatim: DTE in
 * the window, |Δ| in the band, and never an ITM leg (the structure sells
 * out-of-the-money premium).
 */
export function legInScreenBand(
  b: ScreenBand,
  dte: number | null,
  delta: number | null,
  itm: boolean,
): boolean {
  if (dte == null || delta == null || itm) return false
  const a = Math.abs(delta)
  return dte >= b.dteMin && dte <= b.dteMax && a >= b.deltaMin && a <= b.deltaMax
}
