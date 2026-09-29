/**
 * New objective — three origins, no blank form (design Rev .100 Console,
 * Vision §16.1; Owner 2026-09-29). Ordered by how much evidence each carries:
 * Promote transcribes something already run by hand, Fork copies a standing
 * objective that is already earning, a Template is a better-informed guess.
 *
 * What each column can offer is read from the stores, measured on DEV
 * 2026-09-29: Promote's two sources are a draft objective (schedule `adhoc`)
 * that has hand-runs, and an active saved screen (`/research/screens`, 0 on
 * DEV); Fork's are the active objectives (1); Template's the policy templates.
 */
import type { AutopilotTrackRecord, ObjectiveCreateBody, ResearchObjective } from '@/api/research/harness'
import type { SavedScreen } from '@/api/research/savedScreens'
import type { PolicyTemplate } from '@/api/research/policyTemplate'

export type OriginPick =
  | { kind: 'draft'; id: string; label: string; meta: string; objective: ResearchObjective }
  | { kind: 'screen'; id: string; label: string; meta: string; screen: SavedScreen }
  | { kind: 'fork'; id: string; label: string; meta: string; objective: ResearchObjective }
  | { kind: 'template'; id: string; label: string; meta: string; template: PolicyTemplate }

export interface OriginColumn {
  id: 'promote' | 'fork' | 'template'
  name: string
  tag: string
  why: string
  picks: OriginPick[]
  /** Said when the column has nothing to offer — which store answered empty, and why. */
  empty: string
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`

function recordText(rec: AutopilotTrackRecord | undefined): string {
  if (rec?.status === 'ok' && rec.scope !== 'source' && rec.hit_rate != null && rec.judged > 0)
    return `hit ${rec.hit_rate.toFixed(2)} over ${rec.judged} settled`
  return 'no settled record yet'
}

export function objectiveOrigins(input: {
  objectives: readonly ResearchObjective[]
  runsByObjective: ReadonlyMap<string, number>
  records: ReadonlyMap<string, AutopilotTrackRecord>
  screens: readonly SavedScreen[]
  templates: readonly PolicyTemplate[]
}): OriginColumn[] {
  const active = input.objectives.filter((o) => o.status === 'active')
  const drafts = active.filter((o) => o.schedule === 'adhoc' && (input.runsByObjective.get(o.id) ?? 0) > 0)
  const screens = input.screens.filter((s) => s.is_active && !s.retired_at)
  return [
    {
      id: 'promote',
      name: 'Promote',
      tag: 'most evidence',
      why: 'Take something you have already been running by hand and let it run itself. The policy is not guessed — it is what you ran.',
      picks: [
        ...drafts.map((o) => {
          const n = input.runsByObjective.get(o.id) ?? 0
          return { kind: 'draft' as const, id: o.id, label: o.title, meta: `draft · ${plural(n, 'hand-run')}`, objective: o }
        }),
        ...screens.map((s) => ({
          kind: 'screen' as const,
          id: s.id,
          label: s.name,
          meta: `saved screen · since ${s.created_at.slice(0, 10)}`,
          screen: s,
        })),
      ],
      empty:
        'Nothing to promote yet: no draft objective (Run now only) has a hand-run, and no saved screen is active. Hand-run a draft, or save a screen in Lab › Screener, and it appears here.',
    },
    {
      id: 'fork',
      name: 'Fork',
      tag: 'most common',
      why: 'Copy a standing objective and change a field or two. The original keeps running and keeps earning record — a record collected across a policy change describes neither policy.',
      picks: active
        .filter((o) => o.schedule !== 'adhoc')
        .map((o) => ({ kind: 'fork' as const, id: o.id, label: `⑂ ${o.title}`, meta: recordText(input.records.get(o.id)), objective: o })),
      empty: 'No standing objective to fork — every active objective is a draft that runs only when you run it.',
    },
    {
      id: 'template',
      name: 'Template',
      tag: 'from zero',
      why: 'Start from a packaged policy when you have nothing to promote or fork. It is still a guess — just a better-informed one than a blank form.',
      picks: input.templates.map((t) => ({
        kind: 'template' as const,
        id: t.id,
        label: t.name,
        meta: `${t.universe_mode}${t.is_default ? ' · default' : ''}`,
        template: t,
      })),
      empty: 'No policy template is stored.',
    },
  ]
}

/** A fork: the source's policy copied field for field, the lineage in `policy_json.origin`. */
export function forkBody(src: ResearchObjective, today: string): ObjectiveCreateBody {
  const { origin: _drop, ...policy } = src.policy_json as Record<string, unknown>
  void _drop
  return {
    title: `${src.title} · fork`,
    description: src.description,
    schedule: 'adhoc',
    persona: src.persona,
    policy_json: { ...policy, origin: { kind: 'fork', objective_id: src.id, title: src.title, at: today } },
  }
}

/** A promoted screen: a draft whose origin names the screen; its filters ride with the origin. */
export function screenOrigin(s: SavedScreen, today: string): Record<string, unknown> {
  return { kind: 'screen', screen_id: s.id, name: s.name, definition: s.definition, at: today }
}
