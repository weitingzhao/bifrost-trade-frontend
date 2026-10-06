/**
 * Writing a plan by hand — the design's order sheet (Trade Plans rev .94):
 * fill the left, watch the right.
 *
 * The left keeps everything the plan store holds, which is more than the
 * prototype draws: any number of legs with their own side (the reader picks
 * buy or sell — the form never does), price effect, target / stop / exit-by,
 * and the plan's own expiry. The prototype's chain quick-picks are not copied
 * — they fabricate strikes from spot; the real chips are the contracts the
 * plan's source carried, beside the link to the chain.
 *
 * The right is `planCheck` on live readings (`usePlanBacking`). "Create
 * order intent" saves the plan and marks it intended — this app's intent is
 * that status, not an order: the desk copies, TWS places (D10).
 */
import { PLAN_SOURCE_KINDS, PLAN_SOURCE_LABELS, planToken } from '@/utils/tradeOrigin'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CloseButton, SegmentControl } from '@/components/data-display'
import { IconActionButton as DsIconActionButton } from '@bifrost/ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStructures } from '@/hooks/useStrategies'
import { usePlanAccounts } from '@/hooks/usePlanAccounts'
import {
  useCreateStrategyPlan,
  useIntendStrategyPlan,
  useUpdateStrategyPlan,
} from '@/hooks/useStrategyPlans'
import {
  planLegsFromContract,
  type PlanLegDraft,
} from '@/lib/plans/planLegFromContract'
import type { PlanWriteBody } from '@/api/strategyPlans'
import type { PlanLeg, StrategyPlan } from '@/lib/schemas/strategyPlan'
import { checkPasses, planCheck } from './planCheck'
import { PlanCheckPanel } from './PlanCheckPanel'
import { usePlanBacking } from './usePlanBacking'

const FIELD = 'h-7 w-full min-w-0 px-2 text-dense-body mat-field'
const NUM = `${FIELD} font-mono tabular-nums`
const LABEL = 'text-dense-meta font-semibold text-muted-foreground'
const CHOOSE_SIDE = 'Choose buy or sell'
/** Rev .108: seven columns in one row at the sheet's 464px form width. */
const LEG_GRID = 'grid grid-cols-[84px_72px_44px_minmax(64px,1fr)_minmax(96px,1.2fr)_40px_20px] gap-1.5'

/** The server's own enum — not the prototype's list, which names kinds no row can store. */
const SOURCE_KINDS = PLAN_SOURCE_KINDS
const SOURCE_LABELS = PLAN_SOURCE_LABELS
const SOURCE_REF_HINTS: Record<StrategyPlan['source_kind'], string> = {
  manual: 'Optional note',
  symbol: 'Option Scan · composite 88',
  hypothesis: 'The hypothesis id, e.g. nvda-stage-2a-…-6a1e9d34c5',
  inbox_draft: 'D-0412',
  roll: 'The plan it replaces, e.g. #212',
}
const SOURCE_HINTS: Record<StrategyPlan['source_kind'], string> = {
  manual: 'No upstream. Still gets matched to its fill.',
  symbol: 'Came off the Symbol page — the chain pick travels in source_json.',
  hypothesis: 'The hypothesis id exactly as Research stores it. Once the plan is linked to its fill, Research reads the trade back onto the hypothesis and Review › Objectives counts it.',
  inbox_draft: 'Drafted by the Copilot or Autopilot and taken over here.',
  roll: 'Replaces an earlier plan — name it in the ref.',
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

/** Every `PlanLegRow` field may be absent: no side reads as unchosen, no type as the form's OPT, no ratio as 1. */
function legToDraft(leg: PlanLeg): LegDraft {
  return {
    side: leg.side ?? '',
    sec_type: leg.sec_type ?? 'OPT',
    right: leg.right ?? '',
    strike: leg.strike == null ? '' : String(leg.strike),
    expiry: leg.expiry ?? '',
    ratio: String(leg.ratio ?? 1),
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
  if (text === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

function textOrNull(value: string): string | null {
  const text = value.trim()
  return text === '' ? null : text
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
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
  /** `intended`: it was saved as an intent, not a draft. */
  onDone: (strategyPlanId: number, intended: boolean) => void
  onCancel: () => void
}) {
  const { accounts, defaultAccount, host, secondary } = usePlanAccounts()
  const structures = useStructures()
  const create = useCreateStrategyPlan()
  const update = useUpdateStrategyPlan()
  const intend = useIntendStrategyPlan()

  // Null until the reader picks one: the default arrives with monitor /status,
  // after the first render, and a state seeded from it would stay empty.
  const [pickedAccount, setAccountId] = useState<string | null>(editing?.account_id ?? null)
  const accountId = pickedAccount ?? defaultAccount
  const [symbol, setSymbol] = useState(editing?.symbol ?? '')
  const [structureLabel, setStructureLabel] = useState(editing?.structure_label ?? '')
  const [structureId, setStructureId] = useState(
    editing?.strategy_structure_id == null ? '' : String(editing.strategy_structure_id),
  )
  const [legs, setLegs] = useState<LegDraft[]>(
    editing && editing.legs_json.length > 0 ? editing.legs_json.map(legToDraft) : [emptyLeg()],
  )
  const [qty, setQty] = useState(String(editing?.qty ?? 1))
  const [priceEffect, setPriceEffect] = useState<'credit' | 'debit'>(editing?.price_effect ?? 'credit')
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

  const pending = create.isPending || update.isPending || intend.isPending
  const error = (create.error ?? update.error ?? intend.error) as Error | null | undefined
  const fromContract = contractSources(editing)

  // The account as the scope bar names it; any other id reads as itself.
  const accountName = (id: string) => (id === host ? 'HOST' : id === secondary ? 'Secondary' : id)
  const rank = (id: string) => (id === host ? 0 : id === secondary ? 1 : 2)
  // Up to three accounts fit the design's segment; more fall back to a list.
  const segmentAccounts = accounts.length > 0 && accounts.length <= 3

  const backing = usePlanBacking({
    symbol,
    accountId,
    editingId: editing?.strategy_plan_id ?? null,
  })
  const check = planCheck({
    symbol: symbol.trim().toUpperCase(),
    legs: legs.map((leg) => ({
      side: leg.side,
      secType: leg.sec_type,
      right: leg.right,
      strike: numberOrNull(leg.strike),
      ratio: numberOrNull(leg.ratio) ?? 1,
    })),
    qty: Number(qty) || 0,
    limit: numberOrNull(limitPrice),
    priceEffect,
    accountLabel: accountName(accountId),
    ...backing,
  })
  const canIntend = !editing && checkPasses(check)

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

  function write(asIntent: boolean) {
    const written = legs.filter(writtenLeg)
    if (written.some((leg) => leg.side !== 'buy' && leg.side !== 'sell')) {
      setSideBlocked(true)
      return
    }
    setSideBlocked(false)
    const body: PlanWriteBody = {
      account_id: accountId.trim(),
      symbol: symbol.trim().toUpperCase(),
      structure_label: structureLabel.trim() || 'Unspecified',
      strategy_structure_id: structureId === '' ? null : Number(structureId),
      legs_json: written.map(draftToLeg),
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
        { onSuccess: () => onDone(editing.strategy_plan_id, editing.status === 'intended') },
      )
      return
    }
    create.mutate(body, {
      onSuccess: (created) => {
        if (!asIntent) {
          onDone(created.strategy_plan_id, false)
          return
        }
        // The plan is written either way; if marking it fails, its card
        // opens as the draft it is and still offers Mark intended.
        intend.mutate(created.strategy_plan_id, {
          onSettled: (_r, err) => onDone(created.strategy_plan_id, err == null),
        })
      },
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        write(false)
      }}
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex items-center gap-2.5 border-b border-border bg-card px-4 py-2.5">
        <span className="shrink-0 text-sm font-semibold">
          {editing ? `Edit plan ${planToken(editing.strategy_plan_id)}` : 'Plan a trade'}
        </span>
        <span className="min-w-0 truncate text-dense-label text-muted-foreground">
          Fill the left, watch the right. Nothing is sent anywhere — an intent is a plan marked for TWS, and TWS is
          where you click.
        </span>
        <CloseButton label="Close form" title="Close — Esc does the same" className="ml-auto shrink-0" onClick={onCancel} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] max-[860px]:grid-cols-1 max-[860px]:overflow-y-auto">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-border p-4 max-[860px]:overflow-visible">
          <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2.5">
            <Field label="Symbol">
              <input
                className={`${FIELD} font-mono uppercase`}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="NVDA"
                required
                autoFocus={!editing}
              />
            </Field>
            <Field label="Structure">
              <input
                className={FIELD}
                list="plan-structures"
                value={structureLabel}
                placeholder="A rule’s structure, or your own label"
                onChange={(e) => {
                  const label = e.target.value
                  setStructureLabel(label)
                  // Naming a rulebook structure exactly links it; anything else is a hand label.
                  const picked = structures.data?.items.find((s) => s.name === label)
                  setStructureId(picked ? String(picked.strategy_structure_id) : '')
                }}
              />
              <datalist id="plan-structures">
                {(structures.data?.items ?? []).map((s) => (
                  <option key={s.strategy_structure_id} value={s.name ?? ''} />
                ))}
              </datalist>
            </Field>
          </div>
          {/* Rev .108 draws the link under the field. What the form links is the
              structure — no opportunity is named here, and rule coverage is
              read through the opportunity — so the line says exactly that. */}
          <p className="-mt-1.5 text-dense-label text-muted-foreground text-pretty">
            {structureId
              ? `Trading › Rules structure · ${structureLabel.trim()} — linked by id. No opportunity is named here, so the plan card reads it as a hand plan until one is.`
              : structureLabel.trim()
                ? 'Hand label — no structure in Trading › Rules has this name. Tracked all the same.'
                : 'Pick a structure from Trading › Rules, or type your own label.'}
          </p>

          <div className="flex">
            <Field label="Account" className="flex-none">
              {segmentAccounts ? (
                <SegmentControl
                  ariaLabel="Account"
                  size="sm"
                  value={accountId}
                  onChange={setAccountId}
                  // HOST · Secondary · any other account, as the design orders them.
                  options={[...accounts]
                    .sort((x, y) => rank(x) - rank(y))
                    .map((id) => ({ value: id, label: accountName(id), title: id }))}
                />
              ) : accounts.length > 0 ? (
                <select className={FIELD} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
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
          </div>

          <section className="flex flex-col gap-1.5" aria-label="Legs">
            <div className="flex items-baseline gap-2">
              <span className={LABEL}>Legs</span>
              <span className="text-dense-meta text-muted-foreground">
                {legs.length} {legs.length === 1 ? 'leg' : 'legs'}
                {legs.length > 1 ? ' · checked on Backing & Model' : ''}
              </span>
              <button
                type="button"
                className="ml-auto text-dense-label whitespace-nowrap text-primary hover:underline"
                onClick={() => setLegs((rows) => [...rows, emptyLeg()])}
              >
                ＋ Add leg
              </button>
            </div>
            <div className={cn(LEG_GRID, 'text-dense-meta text-muted-foreground')}>
              {['Side', 'Type', 'Right', 'Strike', 'Expiry', 'Ratio'].map((h) => (
                <span key={h}>{h}</span>
              ))}
              <span />
            </div>
            {legs.map((leg, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className={cn(LEG_GRID, 'items-center')}>
                  <select
                    aria-label={`Leg ${i + 1} side`}
                    className={cn(FIELD, 'pr-0.5 pl-1.5', leg.side === '' && 'text-muted-foreground')}
                    value={leg.side}
                    onChange={(e) => setLeg(i, { side: e.target.value as LegDraft['side'] })}
                  >
                    <option value="">Choose…</option>
                    <option value="sell">Sell</option>
                    <option value="buy">Buy</option>
                  </select>
                  <select
                    aria-label={`Leg ${i + 1} type`}
                    className={cn(FIELD, 'pr-0.5 pl-1.5')}
                    value={leg.sec_type}
                    onChange={(e) => setLeg(i, { sec_type: e.target.value as LegDraft['sec_type'] })}
                  >
                    <option value="OPT">Option</option>
                    <option value="STK">Stock</option>
                  </select>
                  <select
                    aria-label={`Leg ${i + 1} right`}
                    title="Put or call"
                    className={cn(FIELD, 'pr-0.5 pl-1.5')}
                    value={leg.right}
                    disabled={leg.sec_type === 'STK'}
                    onChange={(e) => setLeg(i, { right: e.target.value as LegDraft['right'] })}
                  >
                    <option value="P" title="Put">
                      P
                    </option>
                    <option value="C" title="Call">
                      C
                    </option>
                  </select>
                  <input
                    aria-label={`Leg ${i + 1} strike`}
                    className={NUM}
                    value={leg.strike}
                    inputMode="decimal"
                    placeholder="140"
                    disabled={leg.sec_type === 'STK'}
                    onChange={(e) => setLeg(i, { strike: e.target.value })}
                  />
                  <input
                    aria-label={`Leg ${i + 1} expiry`}
                    type="date"
                    className={NUM}
                    value={leg.expiry}
                    disabled={leg.sec_type === 'STK'}
                    onChange={(e) => setLeg(i, { expiry: e.target.value })}
                  />
                  <input
                    aria-label={`Leg ${i + 1} ratio`}
                    className={NUM}
                    value={leg.ratio}
                    inputMode="numeric"
                    placeholder="1"
                    onChange={(e) => setLeg(i, { ratio: e.target.value })}
                  />
                  {/* The DS close directly: the one leg left cannot go (CloseButton has no disabled). */}
                  <DsIconActionButton
                    variant="close"
                    ariaLabel={`Remove leg ${i + 1}`}
                    title="Remove leg"
                    disabled={legs.length === 1}
                    onClick={() => setLegs((rows) => rows.filter((_, at) => at !== i))}
                  />
                </div>
                {sideBlocked && writtenLeg(leg) && leg.side !== 'buy' && leg.side !== 'sell' ? (
                  <p className="text-dense-meta text-destructive">{CHOOSE_SIDE}</p>
                ) : null}
              </div>
            ))}
          </section>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(136px,1.2fr)] gap-2.5">
            <Field label="Price effect">
              <SegmentControl
                ariaLabel="Price effect"
                size="sm"
                value={priceEffect}
                onChange={(v) => setPriceEffect(v as 'credit' | 'debit')}
                options={[
                  { value: 'credit', label: 'Credit' },
                  { value: 'debit', label: 'Debit' },
                ]}
              />
            </Field>
            <Field label="Contracts">
              <input className={NUM} value={qty} inputMode="numeric" placeholder="5" onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Field label={`Limit (${priceEffect})`}>
              <input
                className={NUM}
                value={limitPrice}
                inputMode="decimal"
                placeholder="mid"
                onChange={(e) => setLimitPrice(e.target.value)}
              />
            </Field>
            <Field label="Plan expires">
              <input type="date" className={NUM} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-dense-label text-muted-foreground">
            {fromContract.length > 0 ? (
              fromContract.map((row) => (
                <Button
                  key={row.text}
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-6 px-2 text-dense-meta"
                  title="Adds the contract the source carries; you still choose buy or sell"
                  onClick={() => addFromContract(row.drafts)}
                >
                  Add leg from <span className="font-mono">{row.text}</span>
                </Button>
              ))
            ) : (
              <span>The source carries no contract.</span>
            )}
            <Link
              to={symbol.trim() ? `/research/symbol?symbol=${symbol.trim().toUpperCase()}` : '/research/symbol'}
              className="text-primary hover:underline"
              title="The chain lives on Symbol — pick a contract there and ＋ Plan this brings it here"
            >
              Open Option Discovery →
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <span className={LABEL}>Source</span>
            <SegmentControl
              ariaLabel="Plan source"
              size="sm"
              className="self-start"
              value={sourceKind}
              onChange={(v) => setSourceKind(v as StrategyPlan['source_kind'])}
              options={SOURCE_KINDS.map((k) => ({ value: k, label: SOURCE_LABELS[k] }))}
            />
            <input
              aria-label="Source ref"
              className={cn(FIELD, 'mt-1')}
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder={SOURCE_REF_HINTS[sourceKind]}
            />
            <p className="mt-0.5 text-dense-label text-muted-foreground">{SOURCE_HINTS[sourceKind]}</p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Field label="Target">
              <select
                className={FIELD}
                value={targetKind ?? ''}
                onChange={(e) => setTargetKind(e.target.value as typeof targetKind)}
              >
                <option value="">None</option>
                <option value="credit_pct">% of credit kept</option>
                <option value="option_price">Premium at</option>
                <option value="underlying_price">Underlying at</option>
              </select>
            </Field>
            <Field label="Target value">
              <input
                className={NUM}
                value={targetValue}
                inputMode="decimal"
                placeholder="50"
                disabled={targetKind === ''}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </Field>
            <Field label="Exit by">
              <input type="date" className={NUM} value={exitBy} onChange={(e) => setExitBy(e.target.value)} />
            </Field>
            <Field label="Stop">
              <select
                className={FIELD}
                value={stopKind ?? ''}
                onChange={(e) => setStopKind(e.target.value as typeof stopKind)}
              >
                <option value="">None</option>
                <option value="credit_multiple">Loss × credit</option>
                <option value="option_price">Premium at</option>
                <option value="underlying_price">Underlying at</option>
              </select>
            </Field>
            <Field label="Stop value">
              <input
                className={NUM}
                value={stopValue}
                inputMode="decimal"
                placeholder="2"
                disabled={stopKind === ''}
                onChange={(e) => setStopValue(e.target.value)}
              />
            </Field>
            <p className="self-end text-dense-meta text-muted-foreground text-pretty">
              The plan card’s exit rules and Review › Discipline read these.
            </p>
          </div>

          <Field label="Rationale">
            <textarea
              className="min-h-[4.5rem] w-full resize-y px-2 py-1.5 text-dense-body leading-snug mat-field"
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why this, why now, what makes you close it early."
            />
          </Field>

          {error ? <p className="text-dense-label text-destructive">{error.message}</p> : null}

          <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <Button type="submit" size="sm" variant="secondary" className="h-7" disabled={pending}>
              {editing ? 'Save changes' : 'Save as draft'}
            </Button>
            {editing ? null : (
              <Button
                type="button"
                size="sm"
                className="h-7"
                disabled={pending || !canIntend}
                title={
                  canIntend
                    ? 'Saves the plan and marks it intended — advisory: the desk copies, TWS places'
                    : 'The backing check must pass first'
                }
                onClick={() => write(true)}
              >
                Create order intent
              </Button>
            )}
            <span className="text-dense-label text-muted-foreground">
              {editing
                ? 'A draft stays a draft; mark it intended from its card.'
                : canIntend
                  ? 'Saves and marks it intended; link its fill from the card once TWS fills it.'
                  : check.lamp === 'unknown'
                    ? 'Save as draft, or finish the plan for the check on the right.'
                    : 'Fix the right-hand panel first, or save as draft.'}
            </span>
          </footer>
        </div>

        <PlanCheckPanel check={check} symbol={symbol} />
      </div>
    </form>
  )
}
