import { describe, expect, it } from 'vitest'
import {
  PIPELINE_PHASES,
  PIPELINE_STAGES,
  parseHarnessTrace,
  funnelInstrument,
  ruleDrift,
  ruleImpacts,
  ruleStanceSummary,
} from '@/lib/harness/harnessTrace'
import {
  phaseViews,
  type StageView,
} from '@/components/research/harness/HarnessPipelineStepper'
import {
  compactPolicyGroup,
  stageGovernors,
} from '@/components/research/harness/HarnessRulesPanel'

/**
 * The invariants that make the pipeline safe to deepen.
 *
 * Grouping six stages into phases is only worth doing if adding the seventh
 * does not mean touching the stepper. So what is asserted here is the seam —
 * that stages resolve to phases by declaration, that nothing renders by
 * position, and that a phase's status is derived rather than maintained — not
 * the six stages that happen to exist today.
 */
const stage = (step: string, over: Partial<StageView> = {}): StageView => ({
  step,
  index: 1,
  label: step,
  blurb: '',
  state: 'done',
  summary: '',
  durationMs: null,
  slowest: false,
  ...over,
})

const allStages = () => PIPELINE_STAGES.map((s) => stage(s.step))

describe('pipeline phases', () => {
  it('every stage belongs to a declared phase', () => {
    const ids = new Set<string>(PIPELINE_PHASES.map((p) => p.id))
    for (const s of PIPELINE_STAGES) {
      expect(ids.has(s.phase), `${s.step} → ${s.phase}`).toBe(true)
    }
  })

  it('accounts for every stage exactly once', () => {
    // A stage that fell through the grouping would vanish from the drawer
    // rather than render wrongly, which is the harder bug to notice.
    const grouped = phaseViews(allStages()).flatMap((p) => p.stages.map((s) => s.step))
    expect(grouped.slice().sort()).toEqual(PIPELINE_STAGES.map((s) => s.step).slice().sort())
  })

  it('keeps a phase contiguous — it is a span of the run, not a filter', () => {
    const order = PIPELINE_STAGES.map((s) => s.phase as string)
    const seen = new Map<string, number>()
    order.forEach((p, i) => {
      if (!seen.has(p)) seen.set(p, i)
    })
    for (const [phase, start] of seen) {
      const idxs = order.flatMap((p, i) => (p === phase ? [i] : []))
      expect(idxs, `${phase} is interleaved with another phase`).toEqual(
        idxs.map((_, k) => start + k),
      )
    }
  })

  it('a phase costs what its stages cost', () => {
    const views = phaseViews([
      stage('scan_universe', { durationMs: 3100 }),
      stage('propose_candidates', { durationMs: 400 }),
    ])
    expect(views.find((p) => p.id === 'screen')?.durationMs).toBe(3500)
  })

  it('reports no timing rather than zero when nothing was timed', () => {
    // "not measured" and "instant" must not render alike.
    const views = phaseViews([stage('scan_universe'), stage('propose_candidates')])
    expect(views.find((p) => p.id === 'screen')?.durationMs).toBeNull()
  })

  it('is active while any stage is, and done only when all are', () => {
    const running = phaseViews([
      stage('scan_universe', { state: 'done' }),
      stage('propose_candidates', { state: 'active' }),
    ])
    expect(running.find((p) => p.id === 'screen')?.state).toBe('active')

    const partial = phaseViews([
      stage('scan_universe', { state: 'done' }),
      stage('propose_candidates', { state: 'pending' }),
    ])
    expect(partial.find((p) => p.id === 'screen')?.state).toBe('pending')
  })

  it('drops a phase with no stages rather than rendering an empty header', () => {
    expect(phaseViews([stage('plan')]).map((p) => p.id)).toEqual(['setup'])
  })
})

describe('stage governors — the trading system, shown where it acts', () => {
  it('names the policy fields that decided a stage', () => {
    const rows = stageGovernors('scan_universe', { max_candidates: 8, universe_mode: 'sepa' })
    expect(rows.map((r) => r.key)).toContain('max_candidates')
    expect(rows.find((r) => r.key === 'max_candidates')?.value).toBe(8)
  })

  it('reports an unset field as unset instead of guessing a default', () => {
    const rows = stageGovernors('propose_candidates', { min_composite_score: null })
    expect(rows.find((r) => r.key === 'min_composite_score')?.value).toBeNull()
  })

  it('shows nothing when the run carries no policy', () => {
    // Defaults invented here would be a claim about the run it never made.
    expect(stageGovernors('scan_universe', null)).toEqual([])
  })

  it('never lets two stages claim the same policy field', () => {
    // The same knob explained twice, in two places, is how a reader stops
    // trusting either explanation.
    const seen = new Map<string, string>()
    for (const s of PIPELINE_STAGES) {
      for (const k of s.governedBy as readonly string[]) {
        expect(seen.has(k), `${k} claimed by both ${seen.get(k)} and ${s.step}`).toBe(false)
        seen.set(k, s.step)
      }
    }
  })

  it('an unknown stage governs nothing rather than throwing', () => {
    expect(stageGovernors('not_a_stage', { max_candidates: 8 })).toEqual([])
  })
})

describe('compactPolicyGroup', () => {
  it('drops nulls — an unset field constrains nothing', () => {
    const out = compactPolicyGroup({ path: null, grade: null, min_score: 70 })
    expect(out).toBe('min_score 70')
  })

  it('renders a true flag as its own name', () => {
    expect(compactPolicyGroup({ required: true, min_score: 70 })).toBe('required · min_score 70')
  })

  it('omits false flags rather than printing them off', () => {
    // "required false" reads as a constraint; it is the absence of one.
    expect(compactPolicyGroup({ required: false, within_days: 5 })).toBe('within_days 5')
  })

  it('nests one level so a layer group stays on one line', () => {
    const out = compactPolicyGroup({
      sepa: { required: true, min_score: 70, path: null },
      momentum: { grade: 'A', min_score: null },
    })
    expect(out).toBe('sepa(required · min_score 70) · momentum(grade A)')
  })

  it('says so when a group carries no live setting', () => {
    // Distinguishable from "—", which is the field being absent entirely.
    expect(compactPolicyGroup({ a: null, b: false })).toBe('all defaults')
    expect(compactPolicyGroup(null)).toBe('—')
  })

  it('handles a shape it has never seen', () => {
    // A policy group added later must render without this function changing.
    expect(compactPolicyGroup({ future_knob: 3, nested: { deep: 'x' } })).toBe(
      'future_knob 3 · nested(deep x)',
    )
  })

  it('leaves primitives alone', () => {
    expect(compactPolicyGroup(8)).toBe('8')
    expect(compactPolicyGroup('stock_composite')).toBe('stock_composite')
  })
})

describe('ruleImpacts — what each rule actually did', () => {
  const POLICY = {
    layers: {
      sepa: { required: true, min_score: 70, stage: ['SETUP', 'PIVOT'] },
      momentum: { required: false, grade: 'A' },
      events: { required: false, within_days: 5 },
    },
    option_overlay: { enabled: true, required: false, flag_filter: 'iv_rank:hot' },
    max_candidates: 8,
  }
  const FUNNEL = {
    events: [
      {
        step: 'scan_universe',
        funnel: [
          { name: 'sepa', in_count: 3475, out_count: 44 },
          { name: 'momentum', in_count: 44, out_count: 44 },
          { name: 'events', in_count: 44, out_count: 44 },
          { name: 'rank_cut', in_count: 44, out_count: 24 },
          { name: 'option_overlay', in_count: 24, out_count: 24 },
          { name: 'max_candidates', in_count: 24, out_count: 8 },
        ],
      },
    ],
  }

  it('attributes the drop to the rule that made it', () => {
    const r = ruleImpacts(POLICY, parseHarnessTrace(FUNNEL))
    expect(r.find((x) => x.key === 'sepa')?.dropped).toBe(3431)
    expect(r.find((x) => x.key === 'momentum')?.dropped).toBe(0)
  })

  it('charges the cap for both of the cuts it causes', () => {
    // rank_cut trims to max_candidates * 3 and max_candidates finishes the job;
    // both are the same rule and splitting them would understate it.
    const r = ruleImpacts(POLICY, parseHarnessTrace(FUNNEL))
    expect(r.find((x) => x.key === 'max_candidates')?.dropped).toBe(36)
  })

  it('calls required layers gates and the rest advisory', () => {
    const r = ruleImpacts(POLICY, parseHarnessTrace(FUNNEL))
    expect(r.find((x) => x.key === 'sepa')?.kind).toBe('gate')
    expect(r.find((x) => x.key === 'momentum')?.kind).toBe('advisory')
    expect(r.find((x) => x.key === 'max_candidates')?.kind).toBe('limit')
  })

  it('marks a disabled layer off rather than advisory', () => {
    const r = ruleImpacts(
      { ...POLICY, discovery_assist: { enabled: false } },
      parseHarnessTrace(FUNNEL),
    )
    expect(r.find((x) => x.key === 'discovery_assist')?.kind).toBe('off')
  })

  it('reports not-measured, not zero, when the run has no step for a rule', () => {
    // The distinction this console has had to relearn: a rule the run never
    // recorded is not a rule that removed nobody.
    const r = ruleImpacts(POLICY, parseHarnessTrace({ events: [{ step: 'scan_universe' }] }))
    expect(r.find((x) => x.key === 'sepa')?.dropped).toBeNull()
  })

  it('skips rules the policy does not configure', () => {
    const r = ruleImpacts({ max_candidates: 8 }, parseHarnessTrace(FUNNEL))
    expect(r.map((x) => x.key)).toEqual(['max_candidates'])
  })

  it('says nothing at all without a policy', () => {
    expect(ruleImpacts(null, parseHarnessTrace(FUNNEL))).toEqual([])
  })

  it('summarises the stance in one line', () => {
    expect(ruleStanceSummary(ruleImpacts(POLICY, parseHarnessTrace(FUNNEL)))).toBe(
      '1 gate · 3 advisory · cap 8',
    )
  })
})

describe('ruleDrift — day over day, not run over run', () => {
  const run = (started: string, sepaIn: number, sepaOut: number) => ({
    started_at: started,
    trace_json: {
      events: [
        { step: 'scan_universe', funnel: [{ name: 'sepa', in_count: sepaIn, out_count: sepaOut }] },
      ],
    },
  })

  it('collapses same-day runs instead of drawing them as separate points', () => {
    // Fifteen runs on 2026-09-04 each dropped 3,431 at sepa — they read one
    // daily snapshot. Plotting per run would draw a flat line and call it
    // stability, when it is one measurement repeated.
    const d = ruleDrift(
      [
        run('2026-09-04T04:24:00Z', 3475, 44),
        run('2026-09-04T13:30:00Z', 3475, 44),
        run('2026-09-04T16:13:00Z', 3475, 44),
      ],
      'sepa',
    )
    expect(d.days).toHaveLength(1)
    expect(d.days[0]).toMatchObject({ day: '2026-09-04', dropped: 3431, runs: 3 })
  })

  it('reports the day-over-day change', () => {
    const d = ruleDrift(
      [run('2026-09-03T13:30:00Z', 3475, 75), run('2026-09-04T13:30:00Z', 3475, 44)],
      'sepa',
    )
    expect(d.change).toBe(3431 - 3400)
  })

  it('withholds a change rather than inventing one from a single day', () => {
    expect(ruleDrift([run('2026-09-04T13:30:00Z', 3475, 44)], 'sepa').change).toBeNull()
    expect(ruleDrift([], 'sepa').change).toBeNull()
  })

  it('omits days where the rule was never measured', () => {
    // Runs recorded before the funnel accounted for its own cuts have exactly
    // this gap. Charting them as zero would invent a collapse that never
    // happened — the instrument changed, not the market.
    const noFunnel = { started_at: '2026-09-01T10:00:00Z', trace_json: { events: [] } }
    const d = ruleDrift([noFunnel, run('2026-09-04T13:30:00Z', 3475, 44)], 'sepa')
    expect(d.days.map((x) => x.day)).toEqual(['2026-09-04'])
    expect(d.change).toBeNull()
  })

  it('orders days oldest first so the last point is today', () => {
    const d = ruleDrift(
      [run('2026-09-04T13:30:00Z', 3475, 44), run('2026-09-02T13:30:00Z', 3475, 60)],
      'sepa',
    )
    expect(d.days.map((x) => x.day)).toEqual(['2026-09-02', '2026-09-04'])
  })

  it('skips runs with no usable timestamp', () => {
    const d = ruleDrift(
      [{ started_at: null, trace_json: run('x', 1, 0).trace_json }, run('2026-09-04T13:30:00Z', 3475, 44)],
      'sepa',
    )
    expect(d.days).toHaveLength(1)
  })

  it('charges the cap for both of its cuts on a day', () => {
    const capRun = {
      started_at: '2026-09-04T13:30:00Z',
      trace_json: {
        events: [
          {
            step: 'scan_universe',
            funnel: [
              { name: 'rank_cut', in_count: 44, out_count: 24 },
              { name: 'max_candidates', in_count: 24, out_count: 8 },
            ],
          },
        ],
      },
    }
    expect(ruleDrift([capRun], 'max_candidates').days[0].dropped).toBe(36)
  })
})

describe('ruleDrift — never compare across instruments', () => {
  const withFunnel = (started: string, funnel: unknown[]) => ({
    started_at: started,
    trace_json: { events: [{ step: 'scan_universe', funnel }] },
  })
  const OLD = [{ name: 'sepa', in_count: 47, out_count: 47 }]
  const NEW = [
    { name: 'sepa', in_count: 3475, out_count: 44 },
    { name: 'rank_cut', in_count: 44, out_count: 24 },
    { name: 'max_candidates', in_count: 24, out_count: 8 },
  ]

  it('excludes days measured by a different funnel shape', () => {
    // Real regression: 2026-09-01 opened the funnel at SEPA's own output and
    // emitted no rank_cut, so sepa read as removing nobody. Compared against a
    // later run it produced "+3,431 vs 09-01" — a market collapse that never
    // happened. The instrument changed, not the market.
    const d = ruleDrift(
      [withFunnel('2026-09-01T10:00:00Z', OLD), withFunnel('2026-09-04T13:30:00Z', NEW)],
      'sepa',
      funnelInstrument(NEW as never),
    )
    expect(d.days.map((x) => x.day)).toEqual(['2026-09-04'])
    expect(d.change).toBeNull()
  })

  it('compares freely when the instrument matches', () => {
    const older = [
      { name: 'sepa', in_count: 3475, out_count: 75 },
      { name: 'rank_cut', in_count: 44, out_count: 24 },
      { name: 'max_candidates', in_count: 24, out_count: 8 },
    ]
    const d = ruleDrift(
      [withFunnel('2026-09-03T13:30:00Z', older), withFunnel('2026-09-04T13:30:00Z', NEW)],
      'sepa',
      funnelInstrument(NEW as never),
    )
    expect(d.days).toHaveLength(2)
    expect(d.change).toBe(3431 - 3400)
  })

  it('compares everything when no instrument is named', () => {
    const d = ruleDrift(
      [withFunnel('2026-09-01T10:00:00Z', OLD), withFunnel('2026-09-04T13:30:00Z', NEW)],
      'sepa',
    )
    expect(d.days).toHaveLength(2)
  })

  it('reads the instrument from the step set, not their order or counts', () => {
    const a = funnelInstrument([
      { name: 'sepa', in_count: 1, out_count: 1 },
      { name: 'rank_cut', in_count: 1, out_count: 1 },
    ] as never)
    const b = funnelInstrument([
      { name: 'rank_cut', in_count: 9, out_count: 2 },
      { name: 'sepa', in_count: 9, out_count: 9 },
    ] as never)
    expect(a).toBe(b)
  })
})
