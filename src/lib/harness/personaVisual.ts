/**
 * Giving the judges' output a shape you can read without reading.
 *
 * A verdict list is four rows per judge per candidate, and every row said its
 * stance in the same grey word as every other. Scanning eight candidates meant
 * reading thirty-two words to find the one that said `oppose`. Stance is
 * ordinal — oppose, caution, abstain, support sit on one axis — so it should be
 * carried by position and colour, with the word kept for the reader who needs
 * certainty rather than a glance.
 *
 * The four agents are not ordinal. They are different questions asked of the
 * same candidate, so they get an icon each and no ordering.
 */

export type StanceKey = 'support' | 'caution' | 'oppose' | 'abstain' | 'unknown'
export type StanceTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface StanceView {
  key: StanceKey
  label: string
  tone: StanceTone
  /** −1 opposed … +1 supportive; null when the judge declined to take a side. */
  score: number | null
  /** Lucide icon name, resolved by the component. */
  icon: 'check' | 'alert' | 'ban' | 'dash'
  className: string
}

const STANCES: Record<StanceKey, StanceView> = {
  support: {
    key: 'support',
    label: 'support',
    tone: 'success',
    score: 1,
    icon: 'check',
    className: 'text-success',
  },
  caution: {
    key: 'caution',
    label: 'caution',
    tone: 'warning',
    score: -0.35,
    icon: 'alert',
    className: 'text-warning',
  },
  oppose: {
    key: 'oppose',
    label: 'oppose',
    tone: 'danger',
    score: -1,
    icon: 'ban',
    className: 'text-destructive',
  },
  abstain: {
    key: 'abstain',
    label: 'abstain',
    tone: 'neutral',
    score: null,
    icon: 'dash',
    className: 'text-muted-foreground',
  },
  unknown: {
    key: 'unknown',
    label: '—',
    tone: 'neutral',
    score: null,
    icon: 'dash',
    className: 'text-muted-foreground',
  },
}

/**
 * `dissent` and `block` are net outcomes rather than a judge's own stance, but
 * they reach this function from the candidate chips, so they map onto the axis
 * where a reader would expect to find them.
 */
export function stanceView(stance: string | null | undefined): StanceView {
  const key = String(stance ?? '').trim().toLowerCase()
  if (key === 'support') return STANCES.support
  if (key === 'caution' || key === 'dissent') return STANCES.caution
  if (key === 'oppose' || key === 'block' || key === 'blocked') return STANCES.oppose
  if (key === 'abstain' || key === 'no_opinion') return STANCES.abstain
  return STANCES.unknown
}

export interface AgentView {
  key: string
  label: string
  /** What this persona was actually asked. Shown on hover. */
  asks: string
  icon: 'scope' | 'briefcase' | 'shield' | 'gavel' | 'dot'
}

const AGENTS: Record<string, AgentView> = {
  analyze: {
    key: 'analyze',
    label: 'analyze',
    asks: 'Does the evidence support the setup, on its own terms?',
    icon: 'scope',
  },
  portfolio: {
    key: 'portfolio',
    label: 'portfolio',
    asks: 'What does this do to the book you already hold?',
    icon: 'briefcase',
  },
  validate: {
    key: 'validate',
    label: 'validate',
    asks: 'Does the settled record back the claim? This one can block.',
    icon: 'shield',
  },
  verdict: {
    key: 'verdict',
    label: 'verdict',
    asks: 'Taking the three together, what should happen?',
    icon: 'gavel',
  },
}

export function agentView(agent: string | null | undefined): AgentView {
  const key = String(agent ?? '').trim().toLowerCase()
  return AGENTS[key] ?? { key, label: key || '—', asks: '', icon: 'dot' }
}

/**
 * Where a set of verdicts sits on the oppose↔support axis, for the bar.
 * Abstentions are left out rather than counted as neutral: a judge that
 * declined has not placed the candidate in the middle, it has said nothing,
 * and averaging its silence toward zero would invent a moderate opinion.
 */
export function stanceScore(stances: (string | null | undefined)[]): {
  score: number | null
  counted: number
  abstained: number
} {
  let sum = 0
  let counted = 0
  let abstained = 0
  for (const s of stances) {
    const v = stanceView(s)
    if (v.score == null) {
      if (v.key === 'abstain') abstained += 1
      continue
    }
    sum += v.score
    counted += 1
  }
  return { score: counted === 0 ? null : sum / counted, counted, abstained }
}

/**
 * Split prose so the figures in it can be set apart.
 *
 * The judges write numbers into running text — "IV rank 19", "~925 shares",
 * "$170k", "245/255", "236.54 high". Those are the load-bearing parts of the
 * sentence and they read as ordinary words. Splitting lets the component set
 * them in tabular figures so the eye finds them.
 *
 * Deliberately conservative: it matches a run of digits with the punctuation
 * that belongs inside a figure, plus a leading currency or comparison mark and
 * a trailing percent or magnitude suffix. It does not try to parse units.
 */
const FIGURE = String.raw`[$€£]?\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbB](?![A-Za-z]))?`
const NUMERIC = new RegExp(
  String.raw`[~<>≈±]?${FIGURE}(?:\s?%)?(?:\s?[-–/]\s?${FIGURE})?`,
  'g',
)

export function splitNumerics(text: string): { text: string; numeric: boolean }[] {
  const src = String(text ?? '')
  if (!src) return []
  const out: { text: string; numeric: boolean }[] = []
  let last = 0
  for (const m of src.matchAll(NUMERIC)) {
    const at = m.index ?? 0
    if (at < last) continue
    // A digit inside a name is not a figure. `SEPA79` is caught by the letter
    // before it; `gpt-4o-mini` needs the second test, since the character
    // before the 4 is a hyphen and the one before that is a letter.
    const before = at > 0 ? src[at - 1] : ' '
    const before2 = at > 1 ? src[at - 2] : ' '
    if (/[A-Za-z0-9]/.test(before)) continue
    if (before === '-' && /[A-Za-z]/.test(before2)) continue
    if (at > last) out.push({ text: src.slice(last, at), numeric: false })
    out.push({ text: m[0], numeric: true })
    last = at + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last), numeric: false })
  return out.filter((p) => p.text !== '')
}


/**
 * The judge's sentence in the reader's language, or the truth about why not.
 *
 * The judges are asked for both languages in the same call, which costs a few
 * percent because the bill is input tokens and this is output. But a run made
 * before that ask, a heuristic row, and a judge that skipped the field all
 * leave the Chinese absent — so this reports whether what it returned is the
 * translation or the original, and the caller says so rather than letting a
 * reader assume they are looking at Chinese when they are not.
 */
export function reasonFor(
  row: { summary?: string | null; summary_zh?: string | null; why?: string | null; why_zh?: string | null },
  lang: 'zh' | 'en',
): { text: string; translated: boolean } {
  const en = String(row.summary ?? row.why ?? '')
  const zh = String(row.summary_zh ?? row.why_zh ?? '').trim()
  if (lang === 'zh' && zh) return { text: zh, translated: true }
  return { text: en, translated: false }
}
