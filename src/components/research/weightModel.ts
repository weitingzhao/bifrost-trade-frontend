/**
 * What a weight set is, and the three questions a panel asks about one.
 *
 * Kept beside `WeightsPanel` rather than inside it: a module that exports both
 * a component and the functions two pages call cannot hot-reload either, and
 * these three are called from the pages' own tests.
 */
export interface WeightLens {
  key: string
  label: string
}

export interface WeightPreset {
  id: string
  label: string
  /** One line under the sliders: what this leaning is, in the page's words. */
  note: string
  weights: Record<string, number>
}

/** Which preset these weights are, when they are one. */
export function presetOf(
  presets: readonly WeightPreset[],
  lenses: readonly WeightLens[],
  weights: Record<string, number>,
): string | null {
  return presets.find((p) => lenses.every((l) => p.weights[l.key] === weights[l.key]))?.id ?? null
}

/**
 * What a weight prints.
 *
 * The presets a page writes are whole numbers, but a server-fitted set is not:
 * the vol page's adaptive preset comes back as 17.44 / 26.37, and a box that
 * rounds those to 17 and 26 shows a weight set that sums to 99 and would score
 * the list differently from the one being applied.
 */
export function fmtWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function weightSum(
  lenses: readonly WeightLens[],
  weights: Record<string, number>,
): number {
  return lenses.reduce((n, l) => n + (weights[l.key] ?? 0), 0)
}

