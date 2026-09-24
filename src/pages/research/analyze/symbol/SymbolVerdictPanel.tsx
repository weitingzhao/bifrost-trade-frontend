/**
 * `Your verdict` — the design's write form, kept honestly.
 *
 * The earlier walk left the form undrawn because no research route accepted a
 * stance. The design's own hint settles where it belongs: “a hand verdict is
 * the same artifact a judge persona writes — stance, one line, optional
 * citations — and it settles into the same record.” That artifact store
 * exists: `research.hypothesis`. Record verdict writes one, tagged
 * `hand-verdict` with the stance, the cited faces in `origin_ref`, and the
 * 20d horizon named — a real write, not a form that keeps nothing. The list
 * below reads the same store back, and the machine's own claims on the name
 * stay underneath, labelled as not yours.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionPanel } from '@/components/layout'
import { DenseTag } from '@/components/data-display'
import { useCreateHypothesis, useHypothesisList } from '@/hooks/useHypotheses'
import { useSymbolVerdicts } from '@/hooks/useSymbolVerdicts'
import { cn } from '@/lib/utils'

const STANCES = [
  { id: 'support', cls: 'border-success/50 text-success', on: 'bg-success/15' },
  { id: 'caution', cls: 'border-warning/50 text-warning', on: 'bg-warning/15' },
  { id: 'oppose', cls: 'border-destructive/50 text-destructive', on: 'bg-destructive/15' },
] as const

const CITES = ['Volatility', 'Dealer', 'Scenario', 'Flow'] as const

function stateVariant(state: string): 'success' | 'warning' | 'info' | 'neutral' {
  const s = state.toLowerCase()
  if (s.includes('accept') || s.includes('active') || s.includes('executed')) return 'success'
  if (s.includes('await') || s.includes('propos')) return 'warning'
  if (s.includes('reject') || s.includes('held')) return 'neutral'
  return 'info'
}

export function SymbolVerdictPanel({ symbol }: { symbol: string; thesis?: string }) {
  const sym = symbol.trim().toUpperCase()
  const [stance, setStance] = useState<string | null>(null)
  const [line, setLine] = useState('')
  const [cites, setCites] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)
  const createHyp = useCreateHypothesis()

  const mineQ = useHypothesisList({ symbol: sym, limit: 30 }, Boolean(sym))
  const mine = (mineQ.data?.rows ?? []).filter((h) => h.tags?.includes('hand-verdict')).slice(0, 4)
  const machineQ = useSymbolVerdicts(sym)
  const proposals = machineQ.data?.proposals ?? []

  const record = () => {
    if (!stance || !line.trim()) return
    createHyp.mutate(
      {
        title: `${sym} · ${stance} · 20d`,
        thesis: line.trim(),
        symbols: [sym],
        tags: ['hand-verdict', stance],
        origin_page: 'symbol:verdict',
        origin_ref: { stance, cites, horizon_days: 20 },
      },
      {
        onSuccess: () => {
          setNote('Recorded — it settles into the same record the personas are scored by.')
          setLine('')
          setStance(null)
          setCites([])
        },
        onError: (e) => setNote(`Record failed: ${(e as Error).message}`),
      }
    )
  }

  return (
    <SectionPanel
      cap="Your verdict"
      title={`on ${sym} · 20d`}
      note="operator · hand"
      action={
        <Link to="/research/journal" className="text-dense-meta hover:underline">
          Journal ↗
        </Link>
      }
    >
      <div className="flex flex-col gap-1.5 border-b border-border/60 px-3 py-2">
        <div className="flex gap-1">
          {STANCES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStance(stance === s.id ? null : s.id)}
              className={cn(
                'h-6 flex-1 cursor-pointer rounded-[5px] border text-dense-caption font-semibold',
                s.cls,
                stance === s.id ? s.on : 'bg-transparent opacity-80 hover:opacity-100'
              )}
            >
              {s.id}
            </button>
          ))}
        </div>
        <input
          value={line}
          onChange={(e) => setLine(e.target.value)}
          placeholder="One line — the claim, and what would prove it wrong"
          className="h-7 rounded-[5px] border border-border bg-background px-2 text-dense-meta text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-dense-micro font-semibold uppercase tracking-wide text-muted-foreground">
            cites
          </span>
          {CITES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setCites((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]))
              }
              className={cn(
                'cursor-pointer rounded border px-1.5 py-0.5 font-mono text-dense-micro',
                cites.includes(c)
                  ? 'border-[color-mix(in_srgb,var(--sk-accent)_50%,transparent)] text-[var(--sk-accent)]'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
              title={`Cite the ${c} face's reading behind this call.`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={record}
            disabled={!stance || !line.trim() || createHyp.isPending}
            className={cn(
              'rounded-[5px] border px-2.5 py-1 text-dense-label font-semibold',
              stance && line.trim()
                ? 'cursor-pointer border-[color-mix(in_srgb,var(--sk-accent)_50%,transparent)] bg-[rgb(var(--sk-accent-rgb)/0.16)] text-[var(--sk-accent)] hover:brightness-110'
                : 'cursor-default border-border text-muted-foreground'
            )}
            title="Writes the verdict as a hand-verdict artifact in the hypothesis store — the same store the personas' claims settle in."
          >
            Record verdict
          </button>
          <span className="text-dense-micro leading-tight text-muted-foreground">
            {note ?? 'Stance is required; a line without one is a note, not a verdict. Citations are optional.'}
          </span>
        </div>
      </div>

      {mine.length > 0 ? (
        <>
          {mine.map((h) => {
            const st = h.tags?.find((t) => t === 'support' || t === 'caution' || t === 'oppose')
            return (
              <div
                key={h.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border/50 px-3 py-1.5"
                title={`${h.created_at?.slice(0, 10) ?? ''} · ${h.status}`}
              >
                <span
                  className={cn(
                    'font-mono text-dense-micro font-bold uppercase',
                    st === 'support'
                      ? 'text-success'
                      : st === 'oppose'
                        ? 'text-destructive'
                        : 'text-warning'
                  )}
                >
                  {st ?? 'hand'}
                </span>
                <span className="min-w-0 truncate text-dense-meta text-secondary-foreground">
                  {h.thesis}
                </span>
                <span className="font-mono text-dense-micro text-muted-foreground">{h.status}</span>
              </div>
            )
          })}
        </>
      ) : null}

      {machineQ.isLoading ? (
        <p className="px-3 py-2 text-dense-meta text-muted-foreground">Reading the claims…</p>
      ) : proposals.length === 0 ? null : (
        <>
          {proposals.slice(0, 4).map((p, i) => (
            <div
              key={`${p.kind}:${p.id ?? i}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2 border-b border-border/50 px-3 py-1.5"
              title={[p.kind, p.state, p.created_at?.slice(0, 10), p.origin_page]
                .filter(Boolean)
                .join(' · ')}
            >
              <span className="font-mono text-dense-micro uppercase text-muted-foreground">
                {p.kind}
              </span>
              <span className="min-w-0 truncate text-dense-meta">{p.title ?? p.id ?? '—'}</span>
              <DenseTag variant={stateVariant(p.state)} size="cell">
                {p.state}
              </DenseTag>
            </div>
          ))}
        </>
      )}
      <p className="px-3 py-2 text-dense-caption leading-relaxed text-muted-foreground">
        Your hand verdicts settle at 20d into the same record the lenses are scored by; the rows
        under them are the machine&rsquo;s claims, read in{' '}
        <Link to="/research/loop/decisions" className="text-primary hover:underline">
          the Inbox
        </Link>
        .
      </p>
    </SectionPanel>
  )
}
