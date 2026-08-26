/**
 * Per-diff_kind preview rendering for Copilot write approvals (Wave RS-E4.3).
 */
import { DenseTag } from '@/components/data-display'
import { cn } from '@/lib/utils'

export type DiffKind =
  | 'create_hypothesis'
  | 'patch_hypothesis'
  | 'retire_hypothesis'
  | 'run_backtest'
  | string

export type DiffPreviewPayload = {
  diff_kind?: DiffKind
  preview?: Record<string, unknown>
  impact?: Record<string, unknown>
  dry_run?: boolean
}

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x)).filter(Boolean)
}

export function DiffPayloadRenderer({
  diffKind,
  preview,
  impact,
  className,
}: {
  diffKind: DiffKind
  preview?: Record<string, unknown>
  impact?: Record<string, unknown>
  className?: string
}) {
  const p = preview ?? {}

  if (diffKind === 'create_hypothesis') {
    const symbols = asStringList(p.symbols)
    const tags = asStringList(p.tags)
    return (
      <div className={cn('space-y-1.5 text-dense-meta', className)}>
        <p className="text-dense-label font-medium">{String(p.title ?? 'Untitled')}</p>
        <p className="text-muted-foreground whitespace-pre-wrap leading-snug">
          {String(p.thesis ?? '')}
        </p>
        <div className="flex flex-wrap gap-1">
          {symbols.map((s) => (
            <DenseTag key={s} variant="symbol" size="cell">
              {s}
            </DenseTag>
          ))}
          {tags.map((t) => (
            <DenseTag key={t} variant="category" size="cell">
              {t}
            </DenseTag>
          ))}
          {typeof p.status === 'string' ? (
            <DenseTag variant="warning" size="cell">
              {p.status}
            </DenseTag>
          ) : null}
        </div>
        {impact?.table ? (
          <p className="text-dense-caption text-muted-foreground font-mono">
            → INSERT {String(impact.table)}
          </p>
        ) : null}
      </div>
    )
  }

  if (diffKind === 'patch_hypothesis') {
    const fields =
      p.fields && typeof p.fields === 'object'
        ? (p.fields as Record<string, unknown>)
        : {}
    return (
      <div className={cn('space-y-1.5 text-dense-meta', className)}>
        <p className="font-mono text-dense-caption text-muted-foreground">
          id: {String(p.hypothesis_id ?? '—')}
        </p>
        <ul className="space-y-0.5">
          {Object.entries(fields).map(([k, v]) => (
            <li key={k} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">{k}:</span>
              <span className="min-w-0 break-all font-mono text-dense-caption">
                {typeof v === 'string' ? v : JSON.stringify(v)}
              </span>
            </li>
          ))}
        </ul>
        {impact?.table ? (
          <p className="text-dense-caption text-muted-foreground font-mono">
            → UPDATE {String(impact.table)}
          </p>
        ) : null}
      </div>
    )
  }

  if (diffKind === 'retire_hypothesis') {
    return (
      <div className={cn('space-y-1 text-dense-meta', className)}>
        <p>
          Retire hypothesis{' '}
          <span className="font-mono">{String(p.hypothesis_id ?? '—')}</span>
        </p>
        <p className="text-dense-caption text-muted-foreground">
          Soft-delete (retired_at) · status → archived
        </p>
      </div>
    )
  }

  if (diffKind === 'run_backtest') {
    const eventDef =
      p.event_def && typeof p.event_def === 'object'
        ? (p.event_def as Record<string, unknown>)
        : {}
    return (
      <div className={cn('space-y-1.5 text-dense-meta', className)}>
        <p className="text-dense-label font-medium">
          {String(p.strategy_template ?? 'strategy')}
        </p>
        <p className="text-muted-foreground">
          Event: {String(eventDef.kind ?? '—')} · lookback{' '}
          {String(p.lookback_years ?? '—')}y
        </p>
        {p.hypothesis_id ? (
          <p className="font-mono text-dense-caption text-muted-foreground">
            link → {String(p.hypothesis_id)}
          </p>
        ) : null}
        {p.template_known === false ? (
          <p className="text-warning text-dense-caption">Unknown template</p>
        ) : null}
        {impact?.table ? (
          <p className="text-dense-caption text-muted-foreground font-mono">
            → INSERT {String(impact.table)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <pre
      className={cn(
        'max-h-40 overflow-auto whitespace-pre-wrap break-all text-dense-caption font-mono',
        className,
      )}
    >
      {JSON.stringify({ diff_kind: diffKind, preview: p, impact }, null, 2).slice(0, 2500)}
    </pre>
  )
}
