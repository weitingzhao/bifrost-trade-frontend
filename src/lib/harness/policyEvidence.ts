/**
 * A policy suggestion's evidence, in the shape a reader can take in.
 *
 * The Decision Inbox printed `payload.evidence` with one `JSON.stringify` — on
 * the weekly review's draft of 2026-09-13 that was 36 KB on a single line: every
 * candidate, every judge, every note in two languages. The data was structured
 * all along (`copilot/agents/weekly_policy_review.py`, `harness/persona_eval.py`);
 * only the rendering threw the structure away.
 *
 * Every field is optional here because the two writers differ: the weekly
 * review sends outcomes and a persona eval, a harness run sends only the eval.
 */
type Rec = Record<string, unknown>

const rec = (v: unknown): Rec | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : null)
const recs = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(rec).filter((x): x is Rec => x != null) : [])
const evidenceNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const txt = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

export interface OutcomeHorizon {
  horizonDays: number | null
  hitRate: number | null
  hits: number | null
  judged: number | null
  avgExcess: number | null
}

export interface OutcomeEvidence {
  days: number | null
  candidates: number | null
  pending: number | null
  horizons: OutcomeHorizon[]
}

export interface JudgeModelRun {
  model: string
  provider: string | null
  calls: number | null
  ok: number | null
  fallback: number | null
  costUsd: number | null
}

export interface SymbolVerdict {
  agent: string
  model: string | null
  stance: string | null
  summary: string | null
  summaryZh: string | null
}

export interface SymbolEvidence {
  symbol: string
  /** Whether the judge models reached one stance: agree / dissent / single / none. */
  agreement: string | null
  netStance: string | null
  validateStance: string | null
  blocked: boolean
  byModel: { model: string; net: string | null; validate: string | null; fallback: boolean }[]
  verdicts: SymbolVerdict[]
}

export interface PersonaEvidence {
  evaluated: number | null
  blocked: number | null
  dissent: number | null
  eligible: number | null
  models: JudgeModelRun[]
  symbols: SymbolEvidence[]
}

export interface PolicyEvidenceView {
  outcomes: OutcomeEvidence | null
  persona: PersonaEvidence | null
}

export function policyEvidenceView(evidence: Rec): PolicyEvidenceView {
  const o = rec(evidence.outcome_summary)
  const p = rec(evidence.persona_eval)
  return {
    outcomes: o
      ? {
          days: evidenceNumber(o.days) ?? evidenceNumber(evidence.window_days),
          candidates: evidenceNumber(o.candidates),
          pending: evidenceNumber(o.pending),
          horizons: recs(o.horizons).map((h) => ({
            horizonDays: evidenceNumber(h.horizon_days),
            hitRate: evidenceNumber(h.hit_rate),
            hits: evidenceNumber(h.hits),
            judged: evidenceNumber(h.judged),
            avgExcess: evidenceNumber(h.avg_excess),
          })),
        }
      : null,
    persona: p
      ? {
          evaluated: evidenceNumber(p.symbols_evaluated),
          blocked: evidenceNumber(p.blocked_by_validate),
          dissent: evidenceNumber(p.dissent_count),
          eligible: evidenceNumber(p.eligible_count),
          models: recs(p.models).flatMap((m) => {
            const model = txt(m.model)
            return model
              ? [{ model, provider: txt(m.provider), calls: evidenceNumber(m.calls), ok: evidenceNumber(m.ok), fallback: evidenceNumber(m.fallback), costUsd: evidenceNumber(m.cost_usd) }]
              : []
          }),
          symbols: recs(p.per_symbol).flatMap((s) => {
            const symbol = txt(s.symbol)
            if (!symbol) return []
            return [
              {
                symbol,
                agreement: txt(s.agreement),
                netStance: txt(s.net_stance),
                validateStance: txt(s.validate_stance),
                blocked: s.blocked_by_validate === true,
                byModel: recs(s.models).flatMap((m) => {
                  const model = txt(m.model)
                  return model ? [{ model, net: txt(m.net), validate: txt(m.validate), fallback: m.fallback === true }] : []
                }),
                verdicts: recs(s.verdicts).flatMap((v) => {
                  const agent = txt(v.agent)
                  return agent
                    ? [{ agent, model: txt(v.model), stance: txt(v.stance), summary: txt(v.summary), summaryZh: txt(v.summary_zh) }]
                    : []
                }),
              },
            ]
          }),
        }
      : null,
  }
}

/** `0.0010677` → `+0.11%`. Excess return is signed, and the sign is the point. */
export function fmtSignedPct(x: number | null, digits = 2): string {
  if (x == null) return '—'
  return `${x >= 0 ? '+' : ''}${(x * 100).toFixed(digits)}%`
}
