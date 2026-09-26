/**
 * Calibration — the calibration document rendered as a page (design
 * `System Data Calibration.dc.html`, route rev 2026-09-20.4).
 *
 * The blueprint says what Research should be; the calibration says what it
 * is, contract by contract, with the evidence behind each state. Both are read
 * live from the research API and parsed (`labCalibrationModel.ts`); the
 * document's own text is the Source view, which `/docs/research-calibration`
 * now opens. This page renders the documents; it does not judge.
 */
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { EmptyState, HealthLamp } from '@bifrost/ui'
import { DenseTag } from '@/components/data-display'
import { fetchResearchDoc } from '@/api/research/docs'
import { SegmentControl } from '@/components/data-display'
import { MarkdownContent } from '@/components/cockpit/MarkdownContent'
import { PageHead, PageShell } from '@/components/layout'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { AskCopilotButton } from '@/components/research/AskCopilotButton'
import { compactSnapshot } from '@/components/research/compactSnapshot'
import { cap, mono, panel, panelHead } from '@/components/research/labFaceUi'
import { cn } from '@/lib/utils'
import {
  countNote,
  LAYERS,
  parseBlueprintContracts,
  parseCalibration,
  rowTally,
  STATE,
  STATE_ORDER,
  talliesDisagree,
  type ContractState,
} from './labCalibrationModel'

const lampColor: Record<ContractState, string> = {
  ok: 'var(--color-lamp-green)',
  warn: 'var(--color-lamp-yellow)',
  fail: 'var(--color-lamp-red)',
  ramp: 'var(--color-lamp-gray)',
}

/** The evidence cells carry inline markdown — bold and code — and nothing else. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground/85">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="font-mono text-[0.95em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  )
}

export default function LabCalibrationPage() {
  const [layer, setLayer] = useState('all')
  const [pick, setPick] = useState<ContractState | 'all'>('all')
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'source' ? 'source' : 'contracts'

  // Both documents, live: the calibration carries the states and evidence,
  // the blueprint the contracts' own wording.
  const calQ = useQuery({
    queryKey: ['research', 'docs', 'calibration'],
    queryFn: () => fetchResearchDoc('calibration'),
    staleTime: 5 * 60_000,
  })
  const blueQ = useQuery({
    queryKey: ['research', 'docs', 'blueprint'],
    queryFn: () => fetchResearchDoc('blueprint'),
    staleTime: 5 * 60_000,
  })
  const doc = calQ.data
  const parsed = useMemo(
    () =>
      doc && blueQ.data
        ? parseCalibration(doc.markdown, parseBlueprintContracts(blueQ.data.markdown))
        : null,
    [doc, blueQ.data]
  )
  const ROWS = useMemo(() => parsed?.rows ?? [], [parsed])
  const FIXES = parsed?.fixes ?? []
  const docTally = parsed?.docTally ?? null

  const counts = useMemo(() => rowTally(ROWS), [ROWS])
  const shown = useMemo(
    () =>
      ROWS.filter(
        (r) => (layer === 'all' || r.layer === layer) && (pick === 'all' || r.state === pick)
      ),
    [ROWS, layer, pick]
  )
  const groups = useMemo(
    () =>
      LAYERS.map(([key, title, sub]) => {
        const rows = shown.filter((r) => r.layer === key)
        const tally = STATE_ORDER.filter((k) => rows.some((r) => r.state === k))
          .map((k) => `${STATE[k].sym} ${rows.filter((r) => r.state === k).length}`)
          .join('  ')
        return { key, title, sub, tally, rows }
      }).filter((g) => g.rows.length > 0),
    [shown]
  )
  const disagrees = docTally != null && talliesDisagree(docTally, counts)

  // The Blueprint's `state →` lands on its contract's row (`#C-F1`): scrolled
  // to once the rows exist, and marked while it is the target.
  const target = useLocation().hash.slice(1)
  useEffect(() => {
    if (!target || ROWS.length === 0) return
    document.getElementById(target)?.scrollIntoView({ block: 'center' })
  }, [target, ROWS.length])

  return (
    <PageShell padding="compact" className="space-y-3">
      <PageHead
        title="Calibration"
        info="The blueprint says what Research should be; the calibration says what it is — contract by contract, each with the evidence behind its state, read live from both documents."
        stamp={
          doc?.version ? (
            <span
              className="inline-flex h-6 items-center border px-2 font-mono text-dense-micro tracking-wide text-muted-foreground mat-tag"
              title={`The calibration document's own round${doc.updated ? ` · updated ${doc.updated}` : ''}`}
            >
              ROUND {doc.version}
            </span>
          ) : undefined
        }
      />

      {/* Rev .52: the view switch leads the toolbar (§16.10 — a page's face
          switch is the toolbar's first item), then where both documents are
          read from, then the way to the blueprint. The document's round is
          the page head's stamp, where the design puts it. */}
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border px-3 py-1.75 mat-card">
        <SegmentControl
          ariaLabel="View"
          size="xs"
          value={view}
          onChange={(v) => {
            const next = new URLSearchParams(params)
            if (v === 'source') next.set('view', 'source')
            else next.delete('view')
            setParams(next, { replace: true })
          }}
          options={[
            { value: 'contracts', label: 'Contracts' },
            { value: 'source', label: 'Source' },
          ]}
        />
        <span className={cn(mono, 'text-dense-caption text-muted-foreground')}>
          read live · GET /research/docs/calibration · /research/docs/blueprint
          {doc?.updated ? ` · updated ${doc.updated}` : ''}
        </span>
        {doc?.status ? (
          <DenseTag size="cell" variant="neutral">
            {doc.status}
          </DenseTag>
        ) : null}
        <Link
          to="/docs/research-blueprint"
          className={cn(mono, 'ml-auto text-dense-caption text-primary hover:underline')}
          title="/docs/research-blueprint — System › Alignment"
        >
          Blueprint →
        </Link>
      </div>

      {calQ.isError || blueQ.isError ? (
        <QueryErrorAlert
          error={calQ.error ?? blueQ.error}
          onRetry={() => {
            void calQ.refetch()
            void blueQ.refetch()
          }}
        />
      ) : !doc || (view === 'contracts' && !parsed) ? (
        <Skeleton className="h-96 w-full rounded-md" />
      ) : view === 'source' ? (
        // The document itself, in a panel that names it (Rev .52). The whole
        // document rather than the prototype's §2 excerpt: the text is read
        // live, and cutting it here would be a second copy of its structure.
        <section className={cn(panel, 'overflow-hidden')}>
          <header className={panelHead}>
            <span className="font-semibold">RESEARCH_CALIBRATION.md</span>
            <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
              {doc.version ? `round ${doc.version} · ` : ''}the document’s own text · /docs/research-calibration forwards
              here
            </span>
          </header>
          {/* Prose keeps its measure (§5a.3). */}
          <article className="mx-auto max-w-4xl px-3 py-2">
            <MarkdownContent className="prose prose-sm prose-invert max-w-none [&_table]:text-dense-meta [&_pre]:text-dense-micro">
              {doc.markdown}
            </MarkdownContent>
          </article>
        </section>
      ) : (
        <>
      <div className="flex flex-wrap gap-2">
        {STATE_ORDER.map((k) => {
          const st = STATE[k]
          const on = pick === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => setPick(on ? 'all' : k)}
              className={cn(panel, 'flex-[1_1_150px] cursor-pointer px-3 py-2.25 text-left')}
              style={
                on
                  ? {
                      background: `color-mix(in oklab, ${lampColor[k]} 10%, var(--sk-raised))`,
                      borderColor: lampColor[k],
                    }
                  : undefined
              }
            >
              <span className="flex items-center gap-1.75">
                <HealthLamp lamp={st.lamp} variant="dot" title={st.label} />
                <span className={cap}>{st.label}</span>
              </span>
              <span
                className={cn(mono, 'mt-0.75 block type-section font-semibold')}
                style={{ color: lampColor[k] }}
              >
                {counts[k]}
              </span>
              <span className="block text-dense-caption text-muted-foreground">
                {st.note}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className={cap}>layer</span>
        <SegmentControl
          ariaLabel="Layer"
          size="xs"
          value={layer}
          onChange={setLayer}
          options={[{ value: 'all', label: 'All' }].concat(
            LAYERS.map(([key, title]) => ({ value: key, label: title.split(' · ')[1] ?? title }))
          )}
        />
        <span className={cn(mono, 'ml-auto text-dense-caption text-muted-foreground')}>
          {shown.length} of {ROWS.length} contracts shown
          {pick === 'all' ? '' : ` · ${STATE[pick].label}`}
        </span>
      </div>

      <div className={panel}>
        {groups.map((g) => (
          <div key={g.key}>
            <header className={panelHead}>
              <span className="text-dense-body font-semibold">{g.title}</span>
              <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>{g.sub}</span>
              <span className={cn(mono, 'ml-auto text-dense-micro text-muted-foreground')}>
                {g.tally}
              </span>
            </header>
            {g.rows.map((r) => {
              const st = STATE[r.state]
              const fix = FIXES.find((f) => f.ids.includes(r.id))
              return (
                <div
                  key={r.id}
                  id={r.id}
                  className={cn(
                    'grid grid-cols-1 items-start gap-x-3.5 gap-y-2 border-b border-border/60 px-3 py-2.75 md:grid-cols-[56px_20px_minmax(0,1.05fr)_minmax(0,1.35fr)]',
                    r.id === target && 'bg-[color-mix(in_srgb,var(--sk-accent)_8%,transparent)]',
                  )}
                >
                  <span className={cn(mono, 'text-dense-caption font-semibold text-primary')}>
                    {r.id}
                  </span>
                  <span className="pt-0.75">
                    <HealthLamp
                      lamp={st.lamp}
                      variant="dot"
                      title={`${st.sym} ${st.label} — ${st.note}`}
                    />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.75">
                    <span className="text-dense-body leading-normal text-pretty">
                      {r.contract || '— not in the blueprint'}
                    </span>
                    <span className={cn(mono, 'text-dense-micro text-muted-foreground')}>
                      blueprint · stable anchor
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
                      {inline(r.evidence)}
                    </p>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <DenseTag size="cell" variant={st.variant}>
                        {st.label}
                      </DenseTag>
                      {fix ? (
                        <span className="text-dense-caption text-muted-foreground">
                          smallest change listed below
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        {shown.length === 0 ? (
          <div className="p-3.5">
            <EmptyState
              title="No contract in this state at this layer"
              description={`Filter: ${layer === 'all' ? 'all layers' : layer} · ${pick === 'all' ? 'all states' : STATE[pick].label}`}
            />
          </div>
        ) : null}
      </div>

      <div className={panel}>
        <header className={panelHead}>
          <span className="text-dense-body font-semibold">Smallest change that closes it</span>
          <span className="text-dense-caption text-muted-foreground">
            the document&rsquo;s own list, not a plan invented here
          </span>
        </header>
        {FIXES.map((f) => (
          <div
            key={f.ids}
            className="grid grid-cols-1 items-start gap-x-3.5 gap-y-1.5 border-b border-border/60 px-3 py-2.5 md:grid-cols-[112px_minmax(0,1fr)_minmax(0,1.4fr)]"
          >
            <span className={cn(mono, 'text-dense-caption text-primary')}>{f.ids}</span>
            <span className="text-dense-body text-pretty">{f.gap}</span>
            <span className="text-dense-caption leading-normal text-muted-foreground text-pretty">
              {inline(f.fix)}
            </span>
          </div>
        ))}
      </div>

      {disagrees ? (
        <div className={cn(panel, 'border-[color-mix(in_srgb,var(--color-lamp-yellow)_60%,transparent)]')}>
          <div className="flex flex-col gap-1.25 px-3 py-2.75">
            <div className="text-dense-caption font-semibold uppercase tracking-[0.1em] text-warning">
              Count disagrees with its own rows
            </div>
            <p className="m-0 max-w-[78ch] text-dense-body leading-relaxed text-pretty">
              {countNote(docTally!, counts)}
            </p>
          </div>
        </div>
      ) : null}

          {parsed && parsed.unread.length > 0 ? (
            <p className={cn(mono, 'm-0 text-dense-caption text-warning')}>
              {parsed.unread.length} row{parsed.unread.length === 1 ? '' : 's'} in §2 carried a state this
              page cannot read ({parsed.unread.join(', ')}) — left out rather than guessed.
            </p>
          ) : null}
        </>
      )}

      <div className="flex">
        <AskCopilotButton
          originPage="lab-calibration"
          originLabel="Calibration"
          snapshot={compactSnapshot({
            round: doc?.version ?? null,
            tally: counts,
            open: ROWS.filter((r) => r.state !== 'ok').map((r) => r.id),
          })}
          suggestedPrompt="Which open contracts close through one change, and which one is worth reading twice?"
        />
      </div>

      <p className="m-0 text-dense-caption leading-normal text-muted-foreground text-pretty">
        State symbols belong to the calibration document only — the blueprint never carries one,
        and a test holds that line. This page renders the document; it does not judge. Contracts
        are referenced by number because the numbers are the stable anchor and the wording is not.
      </p>
    </PageShell>
  )
}
