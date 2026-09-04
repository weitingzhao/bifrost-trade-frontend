import { describe, expect, it } from 'vitest'
import { PIPELINE_PHASES, PIPELINE_STAGES } from '@/lib/harness/harnessTrace'
import {
  compactPolicyGroup,
  phaseViews,
  stageGovernors,
  type StageView,
} from '@/components/research/harness/HarnessPipelineStepper'

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
