/**
 * What one run of an objective cost, read from the run itself.
 *
 * Every dollar the Research loop spends is spent inside a run: the planner
 * calls a model once, then each judge evaluates each candidate. Nothing else
 * on these pages costs anything — the candidate pool, the Hypothesis Board and
 * the verdict strips are all reads. Until this module existed the console
 * showed what a run produced and never what it cost, so the spend was real and
 * invisible at the same time.
 *
 * Read `cost_usd`, never `spent_today_usd`: the latter is the provider's
 * running total for the day, so summing it across runs double-counts.
 */
import type { ObjectiveRun } from '@/api/research/harness'

export interface RunSpendModel {
  model: string
  provider: string | null
  calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  /** Which stages of the run used this model. */
  stages: ('plan' | 'judge')[]
  /** Judge calls that fell back to the heuristic after the model failed. */
  fallback: number
  /** Judge calls refused because the provider's daily purse was empty. */
  cap_exceeded: number
  /** The provider's daily ceiling, when the run recorded one. */
  cap_usd: number | null
}

export interface RunSpend {
  total_usd: number
  plan_usd: number
  judge_usd: number
  input_tokens: number
  output_tokens: number
  models: RunSpendModel[]
  /** True when a model was called at all — false for a heuristic-only run. */
  billed: boolean
  capped: boolean
  fellBack: boolean
}

function finite(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

function finiteOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function text(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function rows(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return []
  return v.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
}

function blank(model: string, provider: string | null): RunSpendModel {
  return {
    model,
    provider,
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    cost_usd: 0,
    stages: [],
    fallback: 0,
    cap_exceeded: 0,
    cap_usd: null,
  }
}

/**
 * The planner and the judges are usually the same model, so they merge into one
 * row. The split survives in `plan_usd` / `judge_usd`, which is the comparison
 * worth having: the plan is a rounding error beside the judges.
 */
export function runSpend(run: Pick<ObjectiveRun, 'plan_json' | 'outputs'> | null): RunSpend {
  const empty: RunSpend = {
    total_usd: 0,
    plan_usd: 0,
    judge_usd: 0,
    input_tokens: 0,
    output_tokens: 0,
    models: [],
    billed: false,
    capped: false,
    fellBack: false,
  }
  if (!run) return empty

  const byModel = new Map<string, RunSpendModel>()
  const take = (model: string, provider: string | null): RunSpendModel => {
    const key = model.toLowerCase()
    const found = byModel.get(key) ?? blank(model, provider)
    if (!byModel.has(key)) byModel.set(key, found)
    if (found.provider == null && provider != null) found.provider = provider
    return found
  }

  let planUsd = 0
  for (const a of rows(run.plan_json?.llm_attempts)) {
    const model = text(a.model)
    if (!model) continue
    const row = take(model, text(a.provider))
    row.calls += 1
    row.input_tokens += finite(a.input_tokens)
    row.output_tokens += finite(a.output_tokens)
    row.cost_usd += finite(a.cost_usd)
    if (!row.stages.includes('plan')) row.stages.push('plan')
    planUsd += finite(a.cost_usd)
  }

  const personaEval = (run.outputs?.persona_eval ?? null) as Record<string, unknown> | null
  let judgeUsd = 0
  for (const m of rows(personaEval?.models)) {
    const model = text(m.model)
    if (!model) continue
    const row = take(model, text(m.provider))
    row.calls += finite(m.calls)
    row.input_tokens += finite(m.input_tokens)
    row.output_tokens += finite(m.output_tokens)
    row.cost_usd += finite(m.cost_usd)
    row.fallback += finite(m.fallback)
    row.cap_exceeded += finite(m.cap_exceeded)
    if (row.cap_usd == null) row.cap_usd = finiteOrNull(m.cap_usd)
    if (!row.stages.includes('judge')) row.stages.push('judge')
    judgeUsd += finite(m.cost_usd)
  }

  const models = [...byModel.values()].sort((a, b) => b.cost_usd - a.cost_usd)
  return {
    total_usd: planUsd + judgeUsd,
    plan_usd: planUsd,
    judge_usd: judgeUsd,
    input_tokens: models.reduce((s, m) => s + m.input_tokens, 0),
    output_tokens: models.reduce((s, m) => s + m.output_tokens, 0),
    models,
    billed: models.length > 0,
    capped: models.some((m) => m.cap_exceeded > 0),
    fellBack: models.some((m) => m.fallback > 0),
  }
}

/** "1.4M" / "188k" / "728" — a token count read at a glance, not audited. */
export function fmtTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`
  return String(Math.round(n))
}

/** Total spend across a set of runs, for the objective's own line. */
export function objectiveSpend(runs: Pick<ObjectiveRun, 'plan_json' | 'outputs'>[]): number {
  return runs.reduce((sum, r) => sum + runSpend(r).total_usd, 0)
}

/**
 * A collapsed row's spend, kept in two parts.
 *
 * The table folds a day's identical re-runs into one row, and a re-run costs
 * exactly as much as the run it repeats. Folding their spend into the headline
 * figure would hide the one number worth seeing: money spent screening the same
 * ground twice. So the repeats get their own line.
 */
export function groupSpend(group: {
  run: Pick<ObjectiveRun, 'plan_json' | 'outputs'>
  repeats?: Pick<ObjectiveRun, 'plan_json' | 'outputs'>[]
}): { run: RunSpend; repeats_usd: number; repeats_n: number; total_usd: number } {
  const run = runSpend(group.run)
  const repeats = group.repeats ?? []
  const repeats_usd = objectiveSpend(repeats)
  return {
    run,
    repeats_usd,
    repeats_n: repeats.length,
    total_usd: run.total_usd + repeats_usd,
  }
}

/**
 * The long-form breakdown, shown on hover. It explains the one number that
 * always looks wrong at first: a judge is an agent with tools, so every tool
 * round re-sends the whole conversation and the input count compounds. That is
 * why the same three candidates cost one model many times what they cost the
 * other, and it is the number to watch, not the output count.
 */
export function spendTooltip(spend: RunSpend, maxTurns: number | null): string {
  if (!spend.billed) return 'No model was called — heuristic judges cost nothing.'
  const lines: string[] = []
  for (const m of spend.models) {
    const parts = [
      `${m.model}: ${fmtUsd(m.cost_usd)}`,
      `${m.calls} call${m.calls === 1 ? '' : 's'}`,
      `${fmtTokens(m.input_tokens)} in / ${fmtTokens(m.output_tokens)} out`,
    ]
    if (m.fallback > 0) parts.push(`${m.fallback} fell back to heuristic`)
    if (m.cap_exceeded > 0) parts.push(`${m.cap_exceeded} refused, daily purse empty`)
    if (m.cap_usd != null) parts.push(`cap ${fmtUsd(m.cap_usd)}/day`)
    lines.push(parts.join(' · '))
  }
  lines.push(`Planning ${fmtUsd(spend.plan_usd)} · judging ${fmtUsd(spend.judge_usd)}.`)
  lines.push(
    'A judge is an agent with tools: each tool round re-sends the whole conversation, ' +
      'so input tokens compound with the number of rounds' +
      (maxTurns != null ? `, capped at ${maxTurns} turns.` : '.'),
  )
  return lines.join('\n')
}

/** "$0.0003" while it is cents of a cent, "$1.23" once it is money. */
export function fmtUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd === 0) return '$0'
  return `$${usd.toFixed(Math.abs(usd) < 0.01 ? 4 : 3)}`
}

/** "deepseek-chat $0.20 · gpt-4o-mini $0.031" — which model spent what. */
export function modelSplitLine(spend: RunSpend): string {
  return spend.models.map((m) => `${m.model} ${fmtUsd(m.cost_usd)}`).join(' · ')
}

/** The judge turn ceiling the run actually ran under, when it recorded one. */
export function judgeMaxTurns(run: Pick<ObjectiveRun, 'outputs'> | null): number | null {
  const personaEval = (run?.outputs?.persona_eval ?? null) as Record<string, unknown> | null
  return finiteOrNull(personaEval?.judge_max_turns)
}
