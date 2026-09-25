/**
 * An objective's progress, by the mode that works it (design Rev .55, Shell
 * Spec §4 "Lens 拆分"). Each stage carries a real reading — green: there is
 * something · yellow: it waits for you · gray: nothing there yet — never a
 * tick. The one row that waits for you is `hot`, and its count rides on the
 * top-bar chip.
 *
 * Two stages the design draws have no reading on this side, and say so rather
 * than read gray: nothing links an order or a position back to the objective
 * that proposed it (the attribution the Journal also lacks), so `Ordered` and
 * `Open` are `—` with the reason, and still open the page that holds them.
 */
import type { AutopilotObjective } from '@/api/research/harness'
import { etClock } from '@/lib/freshness'

export type ObjectiveMode = 'hand' | 'assisted' | 'auto'

export interface ProgressStep {
  stage: string
  lamp: 'green' | 'yellow' | 'gray' | 'red'
  v: string
  note: string
  to: string
  hot?: boolean
}

/** The design's own sentences for who does what, per mode. */
export const MODE_WHO: Record<ObjectiveMode, string> = {
  hand: 'You find it, write the plan and place it. The objective carries its subject from page to page.',
  assisted: 'Autopilot runs and proposes; you approve each one; orders go through you.',
  auto: 'Autopilot runs and accepts inside the leash; only the order waits for you.',
}

export function isObjectiveMode(v: unknown): v is ObjectiveMode {
  return v === 'hand' || v === 'assisted' || v === 'auto'
}

const NOT_LINKED = 'no order or position carries its objective yet'

function runStep(o: AutopilotObjective | null): ProgressStep {
  const run = o?.last_run
  if (run?.started_at == null) return { stage: 'Run', lamp: 'gray', v: 'none', note: 'never run', to: '/research/loop/harness' }
  const at = Date.parse(run.started_at)
  const failed = run.status === 'failed' || run.status === 'cancelled'
  return {
    stage: 'Run',
    lamp: failed ? 'red' : 'green',
    v: `${run.started_at.slice(5, 10)} ${etClock(at)}`,
    note: run.status ? run.status.replace(/_/g, ' ') : 'ran',
    to: '/research/loop/harness',
  }
}

function settledStep(o: AutopilotObjective | null): ProgressStep {
  const t = o?.track_record
  if (t == null || t.judged === 0 || t.hit_rate == null) {
    return { stage: 'Settled', lamp: 'gray', v: '—', note: 'nothing settled yet', to: '/review/objectives' }
  }
  return {
    stage: 'Settled',
    lamp: 'green',
    v: `${t.judged} · ${Math.round(t.hit_rate * 100)}%`,
    note: t.scope === 'source' ? 'the harness-wide record stands in' : 'the record behind its standing',
    to: '/review/objectives',
  }
}

/** Assisted and auto objectives: the loop's own stages, from the Autopilot standing. */
export function loopProgress(mode: 'assisted' | 'auto', o: AutopilotObjective | null): ProgressStep[] {
  const picks = o?.last_memo?.picks.length ?? null
  const waiting = o?.pending_memos ?? 0
  const middle: ProgressStep[] =
    mode === 'assisted'
      ? [
          {
            stage: 'Proposed',
            lamp: picks ? 'green' : 'gray',
            v: picks == null ? 'none' : String(picks),
            note: o?.last_memo ? `best ★${o.last_memo.best_conviction} · ${o.last_memo.actionable} actionable` : 'no memo yet',
            to: '/research/loop/candidates',
          },
          {
            stage: 'Waiting you',
            lamp: waiting > 0 ? 'yellow' : 'gray',
            v: String(waiting),
            note: waiting > 0 ? 'approve or decline' : 'nothing to decide',
            to: '/research/loop/decisions',
            hot: waiting > 0,
          },
        ]
      : [
          {
            stage: 'Accepted',
            lamp: picks ? 'green' : 'gray',
            v: picks == null ? 'none' : String(picks),
            note: 'inside the leash',
            to: '/research/loop/candidates',
          },
          {
            stage: 'Order approval',
            lamp: waiting > 0 ? 'yellow' : 'gray',
            v: String(waiting),
            note: waiting > 0 ? 'waits for you' : 'nothing to approve',
            to: '/research/loop/decisions',
            hot: waiting > 0,
          },
        ]
  const tail: ProgressStep[] =
    mode === 'assisted'
      ? [
          { stage: 'Ordered', lamp: 'gray', v: '—', note: NOT_LINKED, to: '/trade/desk' },
          { stage: 'Open', lamp: 'gray', v: '—', note: NOT_LINKED, to: '/portfolio/positions' },
        ]
      : [{ stage: 'Ordered', lamp: 'gray', v: '—', note: NOT_LINKED, to: '/trade/desk' }]
  return [runStep(o), ...middle, ...tail, settledStep(o)]
}

/** A hand objective: the operator's own path, on its subject. */
export function handProgress(
  subject: string | null,
  plans: { open: number; draft: number; filled: number } | null,
): ProgressStep[] {
  const sym = subject ?? ''
  const plan: ProgressStep =
    !sym
      ? { stage: 'Plan', lamp: 'gray', v: '—', note: 'no subject to plan', to: '/trade/plans' }
      : plans == null
        ? { stage: 'Plan', lamp: 'gray', v: '…', note: 'reading plans', to: '/trade/plans' }
        : plans.draft > 0
          ? { stage: 'Plan', lamp: 'yellow', v: `${plans.draft} draft`, note: 'finish the plan', to: '/trade/plans', hot: true }
          : plans.open > 0
            ? { stage: 'Plan', lamp: 'green', v: `${plans.open} open`, note: 'intended', to: '/trade/plans' }
            : { stage: 'Plan', lamp: 'gray', v: 'none', note: 'no plan yet', to: '/trade/plans' }
  return [
    {
      stage: 'Analyze',
      lamp: sym ? 'green' : 'gray',
      v: sym || '—',
      note: sym ? `Research › Symbol · ${sym}` : 'no subject set',
      to: '/research/symbol',
    },
    plan,
    {
      stage: 'Order',
      lamp: plans && plans.filled > 0 ? 'green' : 'gray',
      v: plans ? String(plans.filled) : '—',
      note: plans && plans.filled > 0 ? 'plans filled' : 'nothing filled',
      to: '/trade/desk',
    },
    { stage: 'Position', lamp: 'gray', v: '—', note: 'not read in this menu — open Positions', to: '/portfolio/positions' },
    { stage: 'Settle', lamp: 'gray', v: '—', note: 'not read in this menu — open Single trade', to: '/review/fit' },
  ]
}

/** The row that waits for you, if any — its count rides on the chip. */
export function waitingStep(steps: readonly ProgressStep[]): ProgressStep | null {
  return steps.find((s) => s.hot) ?? null
}
