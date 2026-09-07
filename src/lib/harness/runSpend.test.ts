import { describe, it, expect } from 'vitest'
import {
  fmtTokens,
  groupSpend,
  fmtUsd,
  judgeMaxTurns,
  modelSplitLine,
  objectiveSpend,
  runSpend,
  spendTooltip,
} from './runSpend'
import type { ObjectiveRun } from '@/api/research/harness'

/** Shaped from run_1a07a44e9da0771e5 on DEV, 2026-09-07. */
const real = {
  plan_json: {
    llm_attempts: [
      {
        ok: true,
        model: 'deepseek-chat',
        provider: 'deepseek',
        cost_usd: 0.000165,
        input_tokens: 728,
        output_tokens: 226,
      },
    ],
  },
  outputs: {
    triage: {
      status: 'ok',
      source: 'llm',
      model: 'gpt-4o-mini',
      provider: 'openai',
      calls: 1,
      input_tokens: 558,
      output_tokens: 81,
      cost_usd: 0.000133,
    },
    persona_eval: {
      judge_max_turns: 8,
      models: [
        {
          model: 'deepseek-chat',
          provider: 'deepseek',
          calls: 3,
          ok: 2,
          fallback: 1,
          cap_exceeded: 0,
          cap_usd: 1.5,
          cost_usd: 0.200157,
          input_tokens: 1369635,
          output_tokens: 30030,
          spent_today_usd: 0.699375,
        },
        {
          model: 'gpt-4o-mini',
          provider: 'openai',
          calls: 3,
          ok: 3,
          fallback: 0,
          cap_exceeded: 0,
          cap_usd: 2.0,
          cost_usd: 0.031321,
          input_tokens: 188481,
          output_tokens: 5082,
          spent_today_usd: 0.10736,
        },
      ],
    },
  },
} as unknown as ObjectiveRun

describe('runSpend', () => {
  it('adds the planner and triage to the judges, merging a model that did more than one', () => {
    const s = runSpend(real)
    expect(s.total_usd).toBeCloseTo(0.231776, 6)
    expect(s.plan_usd).toBeCloseTo(0.000165, 6)
    expect(s.triage_usd).toBeCloseTo(0.000133, 6)
    expect(s.judge_usd).toBeCloseTo(0.231478, 6)
    // The comparison the stage exists for: choosing cost a hundredth of a cent,
    // judging cost a quarter of a dollar.
    expect(s.judge_usd / s.triage_usd).toBeGreaterThan(1000)
    // deepseek planned and judged; one row, both stages, four calls.
    expect(s.models.map((m) => m.model)).toEqual(['deepseek-chat', 'gpt-4o-mini'])
    expect(s.models[0]).toMatchObject({ calls: 4, stages: ['plan', 'judge'], fallback: 1 })
    // gpt-4o-mini ran triage as well as judging, so it is one row with both stages.
    expect(s.models[1]).toMatchObject({ calls: 4, stages: ['triage', 'judge'] })
    expect(s.models[0].input_tokens).toBe(1370363)
    expect(s.input_tokens).toBe(1559402)
    expect(s.billed).toBe(true)
    expect(s.fellBack).toBe(true)
    expect(s.capped).toBe(false)
  })

  it('never sums spent_today_usd — that is the day, not the run', () => {
    // The two models' spent_today_usd add to $0.807; the run cost $0.232.
    // Reading the wrong key would have overstated every run on the page.
    expect(runSpend(real).total_usd).toBeLessThan(0.3)
  })

  it('reports a heuristic run as unbilled rather than as free', () => {
    const heuristic = {
      plan_json: { generated_by: 'template' },
      outputs: { persona_eval: { mode: 'heuristic', models: [] } },
    } as unknown as ObjectiveRun
    const s = runSpend(heuristic)
    expect(s).toMatchObject({ billed: false, total_usd: 0, models: [] })
    expect(spendTooltip(s, null)).toBe('No model was called — heuristic judges cost nothing.')
  })

  it('survives a run with no plan, no outputs, or junk in the arrays', () => {
    expect(runSpend(null).billed).toBe(false)
    expect(runSpend({ plan_json: null, outputs: null } as unknown as ObjectiveRun).total_usd).toBe(0)
    const junk = {
      plan_json: { llm_attempts: 'nope' },
      outputs: { persona_eval: { models: [null, { model: '' }, { cost_usd: 1 }] } },
    } as unknown as ObjectiveRun
    expect(runSpend(junk).models).toEqual([])
  })

  it('sorts models by what they cost, dearest first', () => {
    expect(modelSplitLine(runSpend(real))).toBe('deepseek-chat $0.200 · gpt-4o-mini $0.031')
  })

  it('totals an objective across its runs', () => {
    expect(objectiveSpend([real, real])).toBeCloseTo(0.463552, 6)
    expect(objectiveSpend([])).toBe(0)
  })

  it('keeps a folded row’s re-run spend visible instead of merging it away', () => {
    // Three identical re-runs of the same screen cost three times the screen.
    // Folding that into one headline figure would hide the waste the fold
    // itself created.
    const g = groupSpend({ run: real, repeats: [real, real, real] })
    expect(g.run.total_usd).toBeCloseTo(0.231776, 6)
    expect(g.repeats_usd).toBeCloseTo(0.695328, 6)
    expect(g.repeats_n).toBe(3)
    expect(g.total_usd).toBeCloseTo(0.927104, 6)
    expect(groupSpend({ run: real }).repeats_usd).toBe(0)
  })

  it('carries the turn ceiling the run ran under', () => {
    expect(judgeMaxTurns(real)).toBe(8)
    expect(judgeMaxTurns(null)).toBeNull()
  })
})

describe('formatting', () => {
  it('keeps four decimals while the spend is cents of a cent', () => {
    expect(fmtUsd(0.000165)).toBe('$0.0002')
    expect(fmtUsd(0.031321)).toBe('$0.031')
    expect(fmtUsd(1.5)).toBe('$1.500')
    expect(fmtUsd(0)).toBe('$0')
    expect(fmtUsd(Number.NaN)).toBe('$0')
  })

  it('abbreviates token counts without pretending to precision', () => {
    expect(fmtTokens(1369635)).toBe('1.4M')
    expect(fmtTokens(188481)).toBe('188k')
    expect(fmtTokens(5082)).toBe('5.1k')
    expect(fmtTokens(728)).toBe('728')
    expect(fmtTokens(0)).toBe('0')
  })

  it('explains the compounding input count, which is the number that looks wrong', () => {
    const tip = spendTooltip(runSpend(real), 8)
    expect(tip).toContain('deepseek-chat: $0.200 · 4 calls · 1.4M in / 30k out')
    expect(tip).toContain('1 fell back to heuristic')
    expect(tip).toContain('cap $1.500/day')
    expect(tip).toContain('Planning $0.0002 · triage $0.0001 · judging $0.231')
    expect(tip).toContain('capped at 8 turns')
  })
})
