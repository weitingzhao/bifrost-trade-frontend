/**
 * The judges a run may be given, and what choosing each one costs you.
 *
 * Offered as a fixed choice rather than read from the server because the point
 * of the control is to depart from the cluster's default for one run. The
 * per-candidate rate is not here: it comes from the objective's own history, so
 * the same model reads differently on an objective whose candidates carry more
 * evidence.
 */
export interface JudgeModelChoice {
  model: string
  blurb: string
}

export const JUDGE_MODEL_CHOICES: JudgeModelChoice[] = [
  {
    model: 'deepseek-chat',
    blurb: 'Thorough, calls its specialist tools hardest — most of the bill',
  },
  { model: 'gpt-4o-mini', blurb: 'Faster and cheaper, fewer tool rounds' },
]

/**
 * What a judge count means for the leash, in the reader's terms.
 *
 * The leash accepts a candidate only when the judges agree, so the number of
 * judges is not a quality dial — it decides whether agreement is possible at
 * all. One judge cannot agree with itself and every candidate is held.
 */
export function judgeCountWarning(n: number): string | null {
  if (n === 0) {
    return 'With no judges the run still proposes and ranks, and every candidate is held: nothing can be accepted without a verdict.'
  }
  if (n === 1) {
    return 'One judge cannot disagree with itself, so the leash never sees agreement and holds every candidate for you.'
  }
  return null
}
