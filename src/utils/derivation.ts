/**
 * A derivation: how a figure on the page was arrived at, as a small graph of
 * named variables the reader can walk. Each variable says where it comes from
 * (a broker field read verbatim, or one step this page adds), what it means,
 * and — when it is computed from other variables — the formula in terms of
 * their names, plus a re-run of that formula on the reported inputs so the
 * reader can see the broker's figures agree with each other.
 *
 * Rendering is DerivationBlock's job; this file is the model and the walks
 * over it (tree rows, leaf fields, who feeds whom). Formulas name their
 * inputs in braces — '{ExcessLiquidity} ÷ {NetLiquidation}' — so the same
 * string drives both the display and the graph.
 */
/** broker: a field read verbatim · page: a step this page adds · implied: the difference of two broker fields. */
export type VariableSource = 'broker' | 'page' | 'implied'
/** near: within timing noise of the reported figure — the two were not priced at the same moment. */
export type CheckVerdict = 'agrees' | 'near' | 'differs' | 'unchecked'

export interface VariableCheck {
  verdict: CheckVerdict
  /** The re-run result, formatted like the variable's value. */
  computed: string
  /** How far the re-run lands from the reported figure — 'near' and 'differs'. */
  gap?: string
  /** What the verdict means for the reader. */
  note: string
}

export interface Variable {
  /** The name the broker or this page uses; also the key. */
  name: string
  source: VariableSource
  /** Formatted at full precision; '—' when not reported. */
  value: string
  /** One sentence in the reader's terms. */
  meaning: string
  /** A second sentence: why it can look odd, what it is not. */
  note?: string
  /** Inputs in braces: '{EquityWithLoanValue} − {MaintMarginReq}'. */
  formula?: string
  check?: VariableCheck
  warn?: boolean
  /** The rows a sum was taken over — holdings, legs — shown in the card. */
  items?: VariableItem[]
  itemsCaption?: string
}

export interface VariableItem {
  label: string
  /** How the row's value was arrived at: '500.67 sh × $228.45 · close 09-04'. */
  sub?: string
  value: string
  warn?: boolean
  /**
   * This row contributes nothing to the total. Shown, because a reader checking
   * "which twenty-five" needs to see that RKLB was considered and ANET was not,
   * but dimmed, so the lines that do add up are the ones the eye lands on.
   */
  dim?: boolean
}

export interface Derivation {
  title: string
  intro: string
  /** The figures the reader started from; each heads a tree. */
  roots: string[]
  variables: Record<string, Variable>
  /** What each gauge segment means, when the root is graded. */
  scale?: string[]
}

export type FormulaToken = { kind: 'var'; name: string } | { kind: 'text'; text: string }

const VAR_RE = /\{([^}]+)\}/g

export function formulaTokens(formula: string): FormulaToken[] {
  const out: FormulaToken[] = []
  let last = 0
  for (let m = VAR_RE.exec(formula); m; m = VAR_RE.exec(formula)) {
    if (m.index > last) out.push({ kind: 'text', text: formula.slice(last, m.index) })
    out.push({ kind: 'var', name: m[1] })
    last = m.index + m[0].length
  }
  VAR_RE.lastIndex = 0
  if (last < formula.length) out.push({ kind: 'text', text: formula.slice(last) })
  return out
}

export function formulaInputs(formula: string | undefined): string[] {
  if (!formula) return []
  return formulaTokens(formula).flatMap((t) => (t.kind === 'var' ? [t.name] : []))
}

export interface DerivationRow {
  name: string
  depth: number
}

/**
 * The tree of computed variables, depth-first from the roots: each derived
 * variable once, under the first variable that uses it. Leaves (broker
 * fields with no formula) are not rows — they are the fields line.
 */
export function derivationRows(d: Derivation): DerivationRow[] {
  const rows: DerivationRow[] = []
  const seen = new Set<string>()
  const visit = (name: string, depth: number) => {
    const v = d.variables[name]
    if (!v || seen.has(name)) return
    seen.add(name)
    rows.push({ name, depth })
    for (const k of formulaInputs(v.formula)) if (d.variables[k]?.formula) visit(k, depth + 1)
  }
  for (const r of d.roots) visit(r, 0)
  return rows
}

/** The variables with no formula, in first-use order — the broker fields the rest rest on. */
export function derivationFields(d: Derivation): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const visit = (name: string) => {
    const v = d.variables[name]
    if (!v || seen.has(name)) return
    seen.add(name)
    if (!v.formula) {
      out.push(name)
      return
    }
    for (const k of formulaInputs(v.formula)) visit(k)
  }
  for (const r of d.roots) visit(r)
  return out
}

/** The variables whose formula uses `name` — where a figure goes next. */
export function feedsOf(d: Derivation, name: string): string[] {
  return Object.values(d.variables)
    .filter((v) => formulaInputs(v.formula).includes(name))
    .map((v) => v.name)
}
