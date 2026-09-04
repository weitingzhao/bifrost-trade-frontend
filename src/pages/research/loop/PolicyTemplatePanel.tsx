/**
 * Loop policy templates — edit the strategy without a release.
 *
 * This panel replaces a read-only <pre> of two hardcoded constants
 * (RECOMMENDED_LOOP_POLICY / _STOCK). Those could not be changed without a
 * frontend release, and the backend held its own copy of the same thing, free to
 * drift — the frontend's carried min_composite_score: 0.55 against a 0-100
 * scale, a threshold two orders of magnitude below every row it gates.
 *
 * Validation runs server-side against the runtime's own LoopPolicy, so what
 * saves here is what the Loop honours. Its non-fatal notes are shown rather than
 * swallowed: "min_hit_rate is ignored in stock modes without flag_filter" is
 * exactly the kind of thing you want to read while editing, not infer later from
 * a run that quietly filtered nothing.
 */
import { useState } from 'react'
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react'
import { DenseTag, EmptyState } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { QueryErrorAlert } from '@/components/ui/QueryErrorAlert'
import { Skeleton } from '@/components/ui/skeleton'
import { validatePolicy, type PolicyTemplate } from '@/api/research/policyTemplate'
import {
  useDeletePolicyTemplate,
  usePolicyTemplates,
  useSavePolicyTemplate,
} from '@/hooks/useLoopHarness'

interface Draft {
  id?: string
  name: string
  description: string
  body: string
  is_default: boolean
}

function draftFrom(t: PolicyTemplate): Draft {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    body: JSON.stringify(t.policy_json, null, 2),
    is_default: t.is_default,
  }
}

const BLANK: Draft = {
  name: '',
  description: '',
  body: JSON.stringify({ universe_mode: 'stock_composite', max_candidates: 8 }, null, 2),
  is_default: false,
}

export function PolicyTemplatePanel() {
  const templatesQ = usePolicyTemplates()
  const save = useSavePolicyTemplate()
  const del = useDeletePolicyTemplate()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PolicyTemplate | null>(null)

  const items = templatesQ.data?.items ?? []

  /** Parse locally first — a syntax error should not need a round trip. */
  function parsed(body: string): Record<string, unknown> | null {
    try {
      const v = JSON.parse(body)
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null
    } catch {
      return null
    }
  }

  async function check(body: string) {
    const obj = parsed(body)
    if (!obj) {
      setParseError('Not a JSON object')
      setWarnings([])
      return
    }
    setParseError(null)
    try {
      const res = await validatePolicy(obj)
      setWarnings(res.warnings)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err))
      setWarnings([])
    }
  }

  if (templatesQ.isError) return <QueryErrorAlert error={templatesQ.error} />
  if (templatesQ.isLoading) return <Skeleton className="h-24 w-full rounded-md" />

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-dense-meta text-muted-foreground">
          Policy = what to pick (funnel). Personas = how to judge (eval chain). Editing a
          template changes the next run&apos;s universe — no release.
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-7 gap-1 text-dense-meta"
          onClick={() => {
            setDraft(BLANK)
            setWarnings([])
            setParseError(null)
          }}
        >
          <Plus className="size-3" />
          New template
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No policy templates"
          description="Seed one from the stock-first default, or create one here."
        />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setDraft(draftFrom(t))
                setWarnings(t.warnings ?? [])
                setParseError(null)
              }}
              className={
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-left transition-colors ' +
                (draft?.id === t.id
                  ? 'border-primary/60 bg-secondary'
                  : 'border-border/60 hover:bg-secondary/60')
              }
            >
              <span className="text-dense-label font-medium">{t.name}</span>
              <DenseTag variant="category" size="cell">
                {t.universe_mode}
              </DenseTag>
              {t.is_default ? (
                <DenseTag variant="success" size="cell">
                  default
                </DenseTag>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {draft ? (
        <div className="space-y-2 rounded-md border border-border/60 bg-secondary/30 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-7 min-w-48 flex-1 rounded border border-border bg-background px-2 text-dense-label"
              placeholder="Template name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <label className="flex items-center gap-1 text-dense-meta text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.is_default}
                onChange={(e) => setDraft({ ...draft, is_default: e.target.checked })}
              />
              default for its universe mode
            </label>
          </div>
          <input
            className="h-7 w-full rounded border border-border bg-background px-2 text-dense-meta"
            placeholder="What this template is for"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <textarea
            className="h-64 w-full rounded border border-border bg-background p-2 font-mono text-dense-micro"
            spellCheck={false}
            value={draft.body}
            onChange={(e) => {
              setDraft({ ...draft, body: e.target.value })
              setParseError(null)
            }}
            onBlur={(e) => void check(e.target.value)}
          />

          {(() => {
            const obj = parsed(draft.body)
            if (!obj) return null
            const assist =
              obj.discovery_assist &&
              typeof obj.discovery_assist === 'object' &&
              !Array.isArray(obj.discovery_assist)
                ? (obj.discovery_assist as Record<string, unknown>)
                : {}
            const enabled = assist.enabled === true
            const maxVeto =
              typeof assist.max_veto_fraction === 'number'
                ? assist.max_veto_fraction
                : 0.35
            const patchAssist = (next: Record<string, unknown>) => {
              const updated = {
                ...obj,
                discovery_assist: { ...assist, ...next },
              }
              setDraft({ ...draft, body: JSON.stringify(updated, null, 2) })
              setParseError(null)
            }
            return (
              <div className="space-y-1.5 rounded-md border border-border/50 bg-background px-2 py-1.5">
                <p className="text-dense-meta font-medium">Discovery assist (funnel exit)</p>
                <p className="text-dense-micro text-muted-foreground">
                  Optional nominate/veto after Policy — never replaces resolve_universe. Syncs into
                  the JSON body above.
                </p>
                <label className="flex items-center gap-1.5 text-dense-meta">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => patchAssist({ enabled: e.target.checked })}
                  />
                  discovery_assist.enabled
                </label>
                <label className="flex flex-wrap items-center gap-2 text-dense-meta">
                  <span className="text-muted-foreground">max_veto_fraction</span>
                  <input
                    type="number"
                    min={0}
                    max={0.9}
                    step={0.05}
                    className="h-7 w-20 rounded border border-border bg-background px-1.5 font-mono text-dense-micro"
                    value={maxVeto}
                    disabled={!enabled}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      if (!Number.isFinite(n)) return
                      patchAssist({
                        enabled,
                        max_veto_fraction: Math.max(0, Math.min(0.9, n)),
                      })
                    }}
                  />
                </label>
              </div>
            )
          })()}

          {parseError ? (
            <p className="text-dense-meta text-destructive">{parseError}</p>
          ) : null}

          {warnings.length > 0 ? (
            <div className="space-y-1 rounded-sm border border-warning/40 bg-warning/10 px-2 py-1.5">
              {warnings.map((w) => (
                <p key={w} className="flex items-start gap-1.5 text-dense-meta text-warning">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  {w}
                </p>
              ))}
              <p className="text-dense-micro text-muted-foreground">
                Warnings do not block saving — the policy is valid, it just may not do
                what it reads like.
              </p>
            </div>
          ) : null}

          {save.isError ? <QueryErrorAlert error={save.error} /> : null}
          {del.isError ? <QueryErrorAlert error={del.error} /> : null}

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 text-dense-meta"
              disabled={save.isPending || !draft.name.trim() || !parsed(draft.body)}
              onClick={() => {
                const obj = parsed(draft.body)
                if (!obj) {
                  setParseError('Not a JSON object')
                  return
                }
                save.mutate(
                  {
                    id: draft.id,
                    name: draft.name.trim(),
                    description: draft.description,
                    policy_json: obj,
                    is_default: draft.is_default,
                  },
                  {
                    onSuccess: (t) => {
                      setDraft(draftFrom(t))
                      setWarnings(t.warnings ?? [])
                    },
                  },
                )
              }}
            >
              <Check className="size-3.5" />
              {save.isPending ? 'Saving…' : draft.id ? 'Save' : 'Create'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-dense-meta"
              onClick={() => void check(draft.body)}
            >
              Validate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-dense-meta"
              onClick={() => setDraft(null)}
            >
              Close
            </Button>
            {draft.id ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ml-auto h-7 gap-1 text-dense-meta text-destructive"
                disabled={del.isPending}
                onClick={() => {
                  const t = items.find((x) => x.id === draft.id)
                  if (t) setDeleting(t)
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete policy template"
        message={
          deleting
            ? `Delete “${deleting.name}”? Objectives already created from it keep their own copy of the policy — only the template goes. The API refuses if any objective still names it as its source.`
            : ''
        }
        confirmLabel="Delete"
        confirming={del.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            del.mutate(deleting.id, {
              onSuccess: () => {
                setDeleting(null)
                setDraft(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
