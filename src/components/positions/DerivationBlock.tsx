/**
 * "How was this computed" as a derivation the reader can walk: one row per
 * computed variable — name, value, the formula in the names of its inputs,
 * where it comes from, and whether the broker's own identity holds — with
 * every variable name a link. Clicking one opens its card: what it means,
 * its inputs with their values, the re-run and what a gap would mean, and
 * where the figure goes next. The fields the tree rests on are listed once
 * under it. A wall of sentences said all of this before; the tree says it
 * in the order the reader would compute it themselves.
 */
import { Fragment, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import {
  derivationFields,
  derivationRows,
  feedsOf,
  formulaTokens,
  type Derivation,
  type Variable,
  type VariableCheck,
} from '@/utils/derivation'

const DEPTH_PAD = ['', 'pl-4', 'pl-8', 'pl-12', 'pl-16'] as const

function VarLink({
  name,
  value,
  active = false,
  strong = false,
  onClick,
}: {
  name: string
  value?: string
  active?: boolean
  strong?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid="var-link"
      data-var={name}
      className={cn(
        'inline whitespace-nowrap rounded-sm font-mono underline decoration-dotted underline-offset-2 hover:text-link',
        strong && 'font-semibold',
        active ? 'text-link decoration-solid' : 'text-foreground',
      )}
    >
      {name}
      {value ? (
        <>
          {' '}
          <span className="font-normal tabular-nums text-muted-foreground">{value}</span>
        </>
      ) : null}
    </button>
  )
}

const SOURCE_BADGE: Record<Variable['source'], { text: string; title: string }> = {
  broker: { text: 'IB', title: 'An IB account-summary field, read verbatim' },
  page: { text: 'page', title: 'A step this page adds' },
  implied: { text: 'implied', title: 'Not a reported field: the difference of two broker fields' },
}

function SourceBadge({ source, strong = false }: { source: Variable['source']; strong?: boolean }) {
  const b = SOURCE_BADGE[source]
  return (
    <span
      className={cn(
        'text-dense-label uppercase tracking-wide text-muted-foreground/70',
        strong && 'rounded-sm border border-border/60 px-1 text-muted-foreground',
      )}
      title={b.title}
    >
      {b.text}
    </span>
  )
}

function VerdictTag({ check }: { check: VariableCheck }) {
  if (check.verdict === 'agrees')
    return (
      <span className="whitespace-nowrap text-profit" data-testid="verdict">
        ✓ agrees
      </span>
    )
  if (check.verdict === 'near')
    return (
      <span className="whitespace-nowrap text-muted-foreground" data-testid="verdict" title="Within timing noise of the reported figure">
        ≈ Δ {check.gap}
      </span>
    )
  if (check.verdict === 'differs')
    return (
      <span className="whitespace-nowrap text-warning" data-testid="verdict">
        Δ {check.gap}
      </span>
    )
  return (
    <span className="whitespace-nowrap text-muted-foreground" data-testid="verdict">
      unchecked
    </span>
  )
}

function Formula({
  formula,
  variables,
  withValues = false,
  activeName,
  onPick,
}: {
  formula: string
  variables: Record<string, Variable>
  withValues?: boolean
  activeName: string | null
  onPick: (name: string) => void
}) {
  return (
    <span className="font-mono">
      {formulaTokens(formula).map((t, i) =>
        t.kind === 'text' ? (
          <span key={i} className="text-muted-foreground/70">
            {t.text}
          </span>
        ) : (
          <VarLink
            key={i}
            name={t.name}
            value={withValues ? variables[t.name]?.value : undefined}
            active={activeName === t.name}
            onClick={() => onPick(t.name)}
          />
        ),
      )}
    </span>
  )
}

export function DerivationBlock({
  derivation: d,
  onClose,
  className,
}: {
  derivation: Derivation
  onClose: () => void
  className?: string
}) {
  const [openName, setOpenName] = useState<string | null>(null)
  const rows = derivationRows(d)
  const fields = derivationFields(d)
  const open = openName ? (d.variables[openName] ?? null) : null
  const feeds = open ? feedsOf(d, open.name) : []
  const pick = (name: string) => setOpenName((cur) => (cur === name ? null : name))
  const fieldsLabel = fields.every((n) => d.variables[n]?.source === 'broker') ? 'IB fields' : 'Inputs'

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    if (openName) setOpenName(null)
    else onClose()
  }

  return (
    <div
      className={cn('mt-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-dense-caption', className)}
      role="region"
      aria-label={`How ${d.title} is computed`}
      data-testid="explanation"
      onKeyDown={onKeyDown}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground">How · {d.title}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-dense-caption text-muted-foreground hover:text-foreground"
          aria-label="Close explanation"
          title="Close (Esc)"
        >
          ×
        </button>
      </div>
      <p className="leading-snug text-muted-foreground">{d.intro}</p>

      <div className="mt-1.5 flex flex-col gap-y-0.5" data-testid="derivation-rows">
        {rows.map(({ name, depth }) => {
          const v = d.variables[name]
          return (
            <div
              key={name}
              className={cn(
                'flex min-w-0 flex-wrap items-baseline gap-x-2 rounded-sm px-1 -mx-1 hover:bg-muted/30',
                openName === name && 'bg-muted/40',
                DEPTH_PAD[Math.min(depth, DEPTH_PAD.length - 1)],
              )}
              data-testid="derivation-row"
              data-var={name}
            >
              {depth > 0 ? (
                <span aria-hidden="true" className="font-mono text-muted-foreground/60">
                  └
                </span>
              ) : null}
              <VarLink name={name} strong active={openName === name} onClick={() => pick(name)} />
              <span className={cn('font-mono text-dense-body font-semibold tabular-nums', v.warn ? 'text-warning' : 'text-foreground')}>
                {v.value}
              </span>
              {v.formula ? (
                <>
                  <span className="font-mono text-muted-foreground/70">=</span>
                  <Formula formula={v.formula} variables={d.variables} activeName={openName} onPick={pick} />
                </>
              ) : null}
              <span className="ml-auto flex items-center gap-x-1.5 font-mono">
                <SourceBadge source={v.source} />
                {v.check ? <VerdictTag check={v.check} /> : null}
              </span>
            </div>
          )
        })}
      </div>

      {fields.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5" data-testid="derivation-fields">
          <span className="text-dense-label font-semibold uppercase tracking-wide text-muted-foreground/70">{fieldsLabel}</span>
          {fields.map((name) => (
            <VarLink
              key={name}
              name={name}
              value={d.variables[name].value}
              active={openName === name}
              onClick={() => pick(name)}
            />
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          className="mt-1.5 rounded-md border border-border/60 bg-secondary/60 px-2.5 py-1.5"
          role="region"
          aria-label={`${open.name} explained`}
          data-testid="variable-card"
        >
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono font-semibold text-foreground">{open.name}</span>
            <SourceBadge source={open.source} strong />
            <span className={cn('ml-auto font-mono text-dense-body font-semibold tabular-nums', open.warn ? 'text-warning' : 'text-foreground')}>
              {open.value}
            </span>
          </div>
          <p className="mt-0.5 leading-snug text-foreground">{open.meaning}</p>
          {open.note ? <p className="leading-snug text-muted-foreground">{open.note}</p> : null}
          {open.formula ? (
            <p className="mt-1 font-mono leading-snug tabular-nums">
              <span className="text-muted-foreground">= </span>
              <Formula formula={open.formula} variables={d.variables} withValues activeName={null} onPick={pick} />
              {open.check ? (
                <>
                  <span className="text-muted-foreground"> → </span>
                  <span className="text-foreground">{open.check.computed}</span> <VerdictTag check={open.check} />
                </>
              ) : null}
            </p>
          ) : null}
          {open.check ? <p className="leading-snug text-muted-foreground">{open.check.note}</p> : null}
          {open.items && open.items.length > 0 ? (
            <div
              className="mt-1 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 font-mono tabular-nums"
              data-testid="variable-items"
            >
              {open.items.map((it, i) => (
                <Fragment key={i}>
                  <span className={cn(it.dim ? 'text-muted-foreground/60' : 'text-foreground')} data-dim={it.dim ? 'true' : undefined}>
                    {it.label}
                  </span>
                  <span className={cn('min-w-0 truncate', it.dim ? 'text-muted-foreground/50' : 'text-muted-foreground')} title={it.sub}>
                    {it.sub}
                  </span>
                  <span
                    className={cn(
                      'text-right font-semibold',
                      it.warn ? 'text-warning' : it.dim ? 'font-normal text-muted-foreground/60' : 'text-foreground',
                    )}
                  >
                    {it.value}
                  </span>
                </Fragment>
              ))}
            </div>
          ) : null}
          {open.itemsCaption ? <p className="mt-0.5 leading-snug text-muted-foreground">{open.itemsCaption}</p> : null}
          {feeds.length > 0 ? (
            <p className="mt-1 leading-snug text-muted-foreground">
              feeds{' '}
              {feeds.map((n, i) => (
                <Fragment key={n}>
                  {i > 0 ? ' · ' : null}
                  <VarLink name={n} onClick={() => pick(n)} />
                </Fragment>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      {d.scale && d.scale.length > 0 ? (
        <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
          {d.scale.map((s, i) => (
            <li key={i} className="font-mono tabular-nums">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
