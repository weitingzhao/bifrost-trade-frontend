/**
 * The draft, edited where it is read (design Rev .138 §2, contract §17.5):
 * the inspector's first section is the plan itself — account, contracts,
 * each leg's strike and expiry, the rationale — and every change writes back
 * as you make it. There is no Save and no edit sheet. ⌘Z undoes through the
 * page's undo stack (`pushUndo`), and a run of typing in one field is one
 * step. Only a draft is edited here; an intent, a fill or a lapse is read-only
 * and says why in the card.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Input, InspectorField, NumberField } from '@bifrost/ui'
import { SegmentControl } from '@/components/data-display'
import { updateStrategyPlan, type PlanWriteBody } from '@/api/strategyPlans'
import { QUERY_KEYS } from '@/constants/queryKeys'
import type { StrategyPlan } from '@/lib/schemas/strategyPlan'
import { notify, pushUndo } from '@/lib/shellNotify'
import { draftOf, payloadFor, type PlanDraft, type PlanEditField } from './planEditModel'

const WRITE_DELAY_MS = 500

export function PlanEditSection({
  plan,
  accounts,
}: {
  plan: StrategyPlan
  /** The two followed accounts, labelled the way the toolbar labels them. */
  accounts: { id: string; label: string }[]
}) {
  const queryClient = useQueryClient()
  const id = plan.strategy_plan_id
  // Opened per plan (the card keys it on the id), so the fields start from it.
  const [draft, setDraft] = useState<PlanDraft>(() => draftOf(plan))
  const draftRef = useRef(draft)
  const legsRef = useRef(plan.legs_json)
  useLayoutEffect(() => {
    draftRef.current = draft
    legsRef.current = plan.legs_json
  })

  const pending = useRef<Partial<PlanWriteBody>>({})
  const timer = useRef<number | null>(null)
  const flush = useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current)
    timer.current = null
    const payload = pending.current
    pending.current = {}
    if (Object.keys(payload).length === 0) return
    updateStrategyPlan(id, payload)
      .then(() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategyPlans.root }))
      .catch((e: unknown) => {
        notify(`Plan not saved — ${e instanceof Error ? e.message : String(e)}`)
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.strategyPlans.root })
      })
  }, [id, queryClient])
  // Closing the inspector or opening another plan sends what is still waiting.
  useEffect(() => flush, [flush])

  const queue = useCallback(
    (field: PlanEditField, next: PlanDraft) => {
      const payload = payloadFor(field, next, legsRef.current)
      if (!payload) return
      pending.current = { ...pending.current, ...payload }
      if (timer.current != null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, WRITE_DELAY_MS)
    },
    [flush],
  )

  const edit = useCallback(
    (field: PlanEditField, change: (d: PlanDraft) => PlanDraft) => {
      const before = draftRef.current
      const next = change(before)
      pushUndo(`plan:${id}:${field}`, () => {
        setDraft(before)
        queue(field, before)
      })
      setDraft(next)
      queue(field, next)
    },
    [id, queue],
  )

  const leg = (i: number, key: 'strike' | 'expiry', value: string) =>
    edit(`${key}${i}`, (d) => ({
      ...d,
      legs: d.legs.map((l, j) => (j === i ? { ...l, [key]: value } : l)),
    }))

  const accountOptions = accounts.some((a) => a.id === draft.account_id)
    ? accounts
    : [...accounts, { id: draft.account_id, label: draft.account_id }]

  return (
    <section id="plan-edit" aria-label="Plan" className="flex flex-col gap-3 px-3 py-2.5">
      <h3 className="m-0 text-dense-meta font-semibold text-muted-foreground">
        Plan <span className="ml-1 font-normal text-[var(--sk-mute)]">Edits save as you type · ⌘Z undoes</span>
      </h3>
      {accountOptions.length > 1 ? (
        <InspectorField label="Account">
          <SegmentControl
            ariaLabel="Account"
            size="xs"
            value={draft.account_id}
            onChange={(v) => edit('account', (d) => ({ ...d, account_id: v }))}
            options={accountOptions.map((a) => ({ value: a.id, label: a.label }))}
          />
        </InspectorField>
      ) : null}
      <InspectorField label="Contracts">
        <NumberField
          value={draft.qty}
          onValueChange={(v) => edit('qty', (d) => ({ ...d, qty: v }))}
          className="font-mono tabular-nums"
        />
      </InspectorField>
      {plan.legs_json.map((l, i) =>
        l.sec_type === 'OPT' ? (
          <div key={i} className="grid grid-cols-2 gap-2">
            <InspectorField label={`Leg ${i + 1} · ${l.side} ${l.right ?? ''} strike`}>
              <NumberField
                value={draft.legs[i]?.strike ?? ''}
                onValueChange={(v) => leg(i, 'strike', v)}
                className="font-mono tabular-nums"
              />
            </InspectorField>
            <InspectorField label="Expiry">
              <Input
                type="date"
                value={draft.legs[i]?.expiry ?? ''}
                onChange={(e) => leg(i, 'expiry', e.target.value)}
                className="font-mono tabular-nums"
              />
            </InspectorField>
          </div>
        ) : null,
      )}
      <InspectorField label="Rationale">
        <textarea
          value={draft.rationale}
          onChange={(e) => edit('rationale', (d) => ({ ...d, rationale: e.target.value }))}
          rows={3}
          className="w-full resize-y rounded-lg border border-transparent bg-[var(--field-fill)] px-2.5 py-1.5 text-dense-body outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-glow)]"
        />
      </InspectorField>
    </section>
  )
}
