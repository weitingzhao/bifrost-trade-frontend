/**
 * Writing a plan by hand.
 *
 * The prototype's `Create order intent` button is deliberately absent: it wrote
 * an order-intent draft, and under D10 this desk is advisory — orders are placed
 * in TWS. The only button is the one that records the plan.
 *
 * `Backing check` is grey for the same reason as the table's two columns: no
 * service computes what one plan would cost in margin.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { useStructures } from '@/hooks/useStrategies'
import { usePlanAccounts } from '@/hooks/usePlanAccounts'
import { useCreateStrategyPlan, useUpdateStrategyPlan } from '@/hooks/useStrategyPlans'
import {
  planLegsFromContract,
  type PlanLegDraft,
} from '@/lib/plans/planLegFromContract'
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'
import { NOT_COMPUTED_HINT } from './PlansTable'

const FIELD = 'h-6 w-full border px-1.5 text-dense-label mat-field'
const LABEL = 'text-dense-meta font-semibold text-muted-foreground'
const CHOOSE_SIDE = 'Choose buy or sell'

/** The server's own enum — not the prototype's list, which names kinds no row can store. */
const SOURCE_KINDS = ['manual', 'symbol', 'hypothesis', 'inbox_draft', 'roll'] as const
const SOURCE_HINTS: Record<StrategyPlan['source_kind'], string> = {
  manual: 'No upstream. Still gets matched to its fill.',
  symbol: 'Came off the Symbol page — the chain pick travels in source_json.',
  hypothesis: 'Names a hypothesis, so the outcome can flow back to the board.',
  inbox_draft: 'Drafted by the Copilot or Autopilot and taken over here.',
  roll: 'Replaces an earlier plan — name it in the ref.',
}

const previewUsd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

function PreviewRow({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex items-baseline gap-2 text-dense-meta">
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold">{value}</span>
      <span className="w-40 text-right text-dense-micro text-muted-foreground">{note}</span>
    </div>
  )
}

type LegSide = 'sell' | 'buy' | ''

type LegDraft = {
  side: LegSide
  sec_type: 'OPT' | 'STK'
  right: '' | 'C' | 'P'
  strike: string
  expiry: string
  ratio: string
}

function emptyLeg(): LegDraft {
  return { side: '', sec_type: 'OPT', right: 'P', strike: '', expiry: '', ratio: '1' }
}

function contractToDraft(draft: PlanLegDraft): LegDraft {
  return {
    side: '',
    sec_type: draft.sec_type,
    right: draft.right,
    strike: String(draft.strike),
    expiry: draft.expiry,
    ratio: String(draft.ratio),
  }
}

function contractSources(plan: StrategyPlan | null): { text: string; drafts: PlanLegDraft[] }[] {
  if (!plan) return []
  return plan.source_json
    .filter((entry) => entry.kind === 'contract' && (entry.text ?? '').trim() !== '')
    .map((entry) => ({
      text: entry.text as string,
      drafts: planLegsFromContract(entry.text),
    }))
    .filter((row) => row.drafts.length > 0)
}

function isBlankLeg(leg: LegDraft): boolean {
  return leg.side === '' && leg.strike.trim() === '' && leg.expiry.trim() === ''
}

function writtenLeg(leg: LegDraft): boolean {
  return leg.strike.trim() !== '' || leg.expiry.trim() !== '' || leg.side !== ''
}

function legToDraft(leg: PlanLeg): LegDraft {
  return {
    side: leg.side,
    sec_type: leg.sec_type,
    right: leg.right ?? '',
    strike: leg.strike == null ? '' : String(leg.strike),
    expiry: leg.expiry ?? '',
    ratio: String(leg.ratio),
  }
}

/** Empty fields drop out; the server owns the rules about which combinations hold. */
function draftToLeg(draft: LegDraft): PlanLeg {
  if (draft.side !== 'buy' && draft.side !== 'sell') {
    throw new Error(CHOOSE_SIDE)
  }
  return {
    side: draft.side,
    sec_type: draft.sec_type,
    right: draft.sec_type === 'OPT' && draft.right ? draft.right : null,
    strike: draft.strike.trim() === '' ? null : Number(draft.strike),
    expiry: draft.expiry.trim() === '' ? null : draft.expiry.trim(),
    ratio: draft.ratio.trim() === '' ? 1 : Number(draft.ratio),
    contract_key: null,
    mid_at_plan: null,
    quote_asof: null,
  }
}

function numberOrNull(value: string): number | null {
  const text = value.trim()
  return text === '' ? null : Number(text)
}

function textOrNull(value: string): string | null {
  const text = value.trim()
  return text === '' ? null : text
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-0.5">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  )
}

export function PlanForm({
  editing,
  onDone,
  onCancel,
}: {
  /** A draft being edited, or null for a new plan. */
  editing: StrategyPlan | null
  /** The plan that was written — the page opens its card. */
  onDone: (strategyPlanId: number) => void
  onCancel: () => void
}) {
  const { accounts, defaultAccount } = usePlanAccounts()
  const structures = useStructures()
  const create = useCreateStrategyPlan()
  const update = useUpdateStrategyPlan()

  const [accountId, setAccountId] = useState(editing?.account_id ?? defaultAccount)
  const [symbol, setSymbol] = useState(editing?.symbol ?? '')
  const [structureLabel, setStructureLabel] = useState(editing?.structure_label ?? '')
  const [structureId, setStructureId] = useState(
    editing?.strategy_structure_id == null ? '' : String(editing.strategy_structure_id),
  )
  const [legs, setLegs] = useState<LegDraft[]>(
    editing && editing.legs_json.length > 0 ? editing.legs_json.map(legToDraft) : [emptyLeg()],
  )
  const [qty, setQty] = useState(String(editing?.qty ?? 1))
  const [priceEffect, setPriceEffect] = useState(editing?.price_effect ?? 'credit')
  const [limitPrice, setLimitPrice] = useState(
    editing?.limit_price == null ? '' : String(editing.limit_price),
  )
  const [targetKind, setTargetKind] = useState(editing?.target_kind ?? '')
  const [targetValue, setTargetValue] = useState(
    editing?.target_value == null ? '' : String(editing.target_value),
  )
  const [stopKind, setStopKind] = useState(editing?.stop_kind ?? '')
  const [stopValue, setStopValue] = useState(
    editing?.stop_value == null ? '' : String(editing.stop_value),
  )
  const [exitBy, setExitBy] = useState(editing?.exit_by ?? '')
  const [expiresAt, setExpiresAt] = useState(editing?.expires_at?.slice(0, 10) ?? '')
  const [rationale, setRationale] = useState(editing?.rationale ?? '')
  const [sourceKind, setSourceKind] = useState<StrategyPlan['source_kind']>(
    editing?.source_kind ?? 'manual',
  )
  const [sourceRef, setSourceRef] = useState(editing?.source_ref ?? '')
  const [sideBlocked, setSideBlocked] = useState(false)

  const pending = create.isPending || update.isPending
  const error = (create.error ?? update.error) as Error | null | undefined
  const fromContract = contractSources(editing)

  // What the drafted legs themselves pin down, recomputed as you type.
  const qtyN = Number(qty) || 1
  const draftCash = (() => {
    let sum = 0
    let found = false
    for (const leg of legs) {
      if (leg.side !== 'sell' || leg.sec_type !== 'OPT' || leg.right !== 'P') continue
      const strike = Number(leg.strike)
      if (!Number.isFinite(strike) || strike <= 0) continue
      found = true
      sum += strike * 100 * qtyN * (Number(leg.ratio) || 1)
    }
    return found ? sum : null
  })()
  const limitN = Number(limitPrice)
  const draftCredit =
    limitPrice.trim() !== '' && Number.isFinite(limitN)
      ? limitN * 100 * qtyN * (priceEffect === 'debit' ? -1 : 1)
      : null

  function setLeg(index: number, patch: Partial<LegDraft>) {
    setLegs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addFromContract(drafts: PlanLegDraft[]) {
    setLegs((rows) => {
      const added = drafts.map(contractToDraft)
      const onlyBlank = rows.length === 1 && isBlankLeg(rows[0])
      return onlyBlank ? added : [...rows, ...added]
    })
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const written = legs.filter(writtenLeg)
    if (written.some((leg) => leg.side !== 'buy' && leg.side !== 'sell')) {
      setSideBlocked(true)
      return
    }
    setSideBlocked(false)
    const body = {
      account_id: accountId.trim(),
      symbol: symbol.trim().toUpperCase(),
      structure_label: structureLabel.trim() || 'Unspecified',
      strategy_structure_id: structureId === '' ? null : Number(structureId),
      legs: written.map(draftToLeg),
      qty: Number(qty) || 1,
      price_effect: priceEffect,
      limit_price: numberOrNull(limitPrice),
      target_kind: targetKind === '' ? null : targetKind,
      target_value: numberOrNull(targetValue),
      stop_kind: stopKind === '' ? null : stopKind,
      stop_value: numberOrNull(stopValue),
      exit_by: textOrNull(exitBy),
      // A date the reader picked means end of that day, not midnight before it.
      expires_at: expiresAt.trim() === '' ? null : `${expiresAt.trim()}T23:59:59Z`,
      rationale: textOrNull(rationale),
      source_kind: sourceKind,
      source_ref: textOrNull(sourceRef),
    }
    if (editing) {
      update.mutate(
        { id: editing.strategy_plan_id, payload: body },
        { onSuccess: () => onDone(editing.strategy_plan_id) },
      )
    } else {
      create.mutate(body, { onSuccess: (created) => onDone(created.strategy_plan_id) })
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-dense-label font-semibold">
          {editing ? `Edit plan #${editing.strategy_plan_id}` : 'Plan a trade'}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-1 text-dense-meta"
          onClick={onCancel}
          aria-label="Close form"
        >
          ✕
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Account">
            {accounts.length > 0 ? (
              <select
                className={FIELD}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={FIELD}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="Account id"
              />
            )}
          </Field>
          <Field label="Symbol">
            <input
              className={`${FIELD} font-mono uppercase`}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="NVDA"
              required
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Structure">
            <select
              className={FIELD}
              value={structureId}
              onChange={(e) => {
                setStructureId(e.target.value)
                const picked = structures.data?.items.find(
                  (s) => String(s.strategy_structure_id) === e.target.value,
                )
                if (picked?.name) setStructureLabel(picked.name)
              }}
            >
              <option value="">— free label —</option>
              {(structures.data?.items ?? []).map((s) => (
                <option key={s.strategy_structure_id} value={s.strategy_structure_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Label">
            <input
              className={FIELD}
              value={structureLabel}
              onChange={(e) => setStructureLabel(e.target.value)}
              placeholder="Cash-secured put"
            />
          </Field>
        </div>

        <section className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={LABEL}>Legs</span>
            {fromContract.map((row) => (
              <Button
                key={row.text}
                type="button"
                size="sm"
                variant="outline"
                className="h-5 px-1.5 text-dense-micro"
                onClick={() => addFromContract(row.drafts)}
              >
                Add leg from {row.text}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto h-5 px-1.5 text-dense-micro"
              onClick={() => setLegs((rows) => [...rows, emptyLeg()])}
            >
              Add leg
            </Button>
          </div>
          <div className="space-y-1">
            {legs.map((leg, i) => (
              <div key={i} className="space-y-0.5">
              <div className="flex items-center gap-1">
                <select
                  aria-label={`Leg ${i + 1} side`}
                  className={`${FIELD} w-24`}
                  value={leg.side}
                  onChange={(e) => setLeg(i, { side: e.target.value as LegDraft['side'] })}
                >
                  <option value="">Choose…</option>
                  <option value="sell">Sell</option>
                  <option value="buy">Buy</option>
                </select>
                <select
                  aria-label={`Leg ${i + 1} type`}
                  className={`${FIELD} w-16`}
                  value={leg.sec_type}
                  onChange={(e) => setLeg(i, { sec_type: e.target.value as LegDraft['sec_type'] })}
                >
                  <option value="OPT">OPT</option>
                  <option value="STK">STK</option>
                </select>
                <select
                  aria-label={`Leg ${i + 1} right`}
                  className={`${FIELD} w-14`}
                  value={leg.right}
                  disabled={leg.sec_type === 'STK'}
                  onChange={(e) => setLeg(i, { right: e.target.value as LegDraft['right'] })}
                >
                  <option value="">—</option>
                  <option value="C">C</option>
                  <option value="P">P</option>
                </select>
                <input
                  aria-label={`Leg ${i + 1} strike`}
                  className={`${FIELD} w-20 font-mono`}
                  value={leg.strike}
                  inputMode="decimal"
                  placeholder="Strike"
                  onChange={(e) => setLeg(i, { strike: e.target.value })}
                />
                <input
                  aria-label={`Leg ${i + 1} expiry`}
                  type="date"
                  className={`${FIELD} w-32 font-mono`}
                  value={leg.expiry}
                  onChange={(e) => setLeg(i, { expiry: e.target.value })}
                />
                <input
                  aria-label={`Leg ${i + 1} ratio`}
                  className={`${FIELD} w-12 font-mono`}
                  value={leg.ratio}
                  inputMode="numeric"
                  onChange={(e) => setLeg(i, { ratio: e.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1 text-dense-micro text-muted-foreground"
                  aria-label={`Remove leg ${i + 1}`}
                  onClick={() => setLegs((rows) => rows.filter((_, at) => at !== i))}
                >
                  ✕
                </Button>
              </div>
              {sideBlocked && writtenLeg(leg) && (leg.side !== 'buy' && leg.side !== 'sell') ? (
                <p className="text-dense-micro text-destructive">{CHOOSE_SIDE}</p>
              ) : null}
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Qty">
            <input
              className={`${FIELD} font-mono`}
              value={qty}
              inputMode="numeric"
              onChange={(e) => setQty(e.target.value)}
            />
          </Field>
          <Field label="Price effect">
            <select
              className={FIELD}
              value={priceEffect ?? ''}
              onChange={(e) => setPriceEffect(e.target.value as 'credit' | 'debit')}
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </Field>
          <Field label="Limit price">
            <input
              className={`${FIELD} font-mono`}
              value={limitPrice}
              inputMode="decimal"
              onChange={(e) => setLimitPrice(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Target">
            <select
              className={FIELD}
              value={targetKind ?? ''}
              onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
            >
              <option value="">— none —</option>
              <option value="credit_pct">Credit %</option>
              <option value="option_price">Option price</option>
              <option value="underlying_price">Underlying price</option>
            </select>
          </Field>
          <Field label="Target value">
            <input
              className={`${FIELD} font-mono`}
              value={targetValue}
              inputMode="decimal"
              disabled={targetKind === ''}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </Field>
          <Field label="Stop">
            <select
              className={FIELD}
              value={stopKind ?? ''}
              onChange={(e) => setStopKind(e.target.value as typeof stopKind)}
            >
              <option value="">— none —</option>
              <option value="credit_multiple">Credit multiple</option>
              <option value="option_price">Option price</option>
              <option value="underlying_price">Underlying price</option>
            </select>
          </Field>
          <Field label="Stop value">
            <input
              className={`${FIELD} font-mono`}
              value={stopValue}
              inputMode="decimal"
              disabled={stopKind === ''}
              onChange={(e) => setStopValue(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Exit by">
            <input
              type="date"
              className={`${FIELD} font-mono`}
              value={exitBy}
              onChange={(e) => setExitBy(e.target.value)}
            />
          </Field>
          <Field label="Expires">
            <input
              type="date"
              className={`${FIELD} font-mono`}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Source">
          <SegmentControl
            ariaLabel="Plan source"
            size="sm"
            value={sourceKind}
            onChange={(v) => setSourceKind(v as StrategyPlan['source_kind'])}
            options={SOURCE_KINDS.map((k) => ({ value: k, label: k }))}
          />
          <p className="pt-0.5 text-dense-micro text-muted-foreground">{SOURCE_HINTS[sourceKind]}</p>
        </Field>
        <Field label="Source ref">
          <input
            className={FIELD}
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
            placeholder="H-118 · run 7c1e · what it came from"
          />
        </Field>

        <p className="text-dense-meta text-muted-foreground">
          From chain:{' '}
          <Link
            to={symbol.trim() ? `/research/symbol?symbol=${symbol.trim().toUpperCase()}` : '/research/symbol'}
            className="text-primary hover:underline"
          >
            Open Option Discovery →
          </Link>{' '}
          <span className="text-dense-micro">— pick a contract there; it lands on Symbol's chain</span>
        </p>

        <Field label="Rationale">
          <textarea
            className="min-h-16 w-full border px-1.5 py-1 text-dense-label mat-field"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Why this, why now, what makes you close it early."
          />
        </Field>

        {/* The design's live right-hand check, kept in its shape: the two
            readings the drafted legs themselves pin down, and the cells that
            need a spot mark or the account book marked, not guessed. */}
        <section className="space-y-1 border px-2 py-1.5 mat-card">
          <span className={LABEL}>Backing check</span>
          <div className="space-y-0.5 pt-0.5">
            <PreviewRow label="Cash secured" value={draftCash == null ? '—' : previewUsd(draftCash)} note={draftCash == null ? 'no short put pins cash' : 'strike × 100 × qty'} />
            <PreviewRow
              label="Est. credit at limit"
              value={draftCredit == null ? '—' : `${draftCredit < 0 ? '-' : '+'}${previewUsd(Math.abs(draftCredit))}`}
              note={draftCredit == null ? 'no limit price yet' : priceEffect}
            />
            <PreviewRow label="Reg-T margin" value="—" note="needs a spot mark · not computed" />
            <PreviewRow label="Pressure now → after" value="—" note="the account book is not read here" />
            <PreviewRow label="Max at this strike" value="—" note="needs the two above" />
          </div>
          <p className="pt-0.5 text-dense-micro text-muted-foreground" title={NOT_COMPUTED_HINT}>
            Same derivation as Room to add on Backing &amp; Model — not wired into this form; the
            fit is judged there.
          </p>
        </section>
      </div>

      {error ? (
        <p className="border-t border-border px-3 py-1.5 text-dense-meta text-destructive">
          {error.message}
        </p>
      ) : null}

      <footer className="space-y-1 border-t border-border px-3 py-2">
        <Button type="submit" size="sm" className="h-7 w-full text-dense-meta" disabled={pending}>
          {editing ? 'Save changes' : 'Save as draft'}
        </Button>
        <p className="text-dense-micro text-muted-foreground">
          Orders are placed in TWS. D10 keeps this desk advisory.
        </p>
      </footer>
    </form>
  )
}
