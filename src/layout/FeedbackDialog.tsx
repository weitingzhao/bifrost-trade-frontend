/**
 * Send feedback (design Rev .96/.97, store K5).
 *
 * Four kinds, the page attached by the shell, `blocks trading` the reporter's
 * own call, up to four images by paste or pick. The loop closes in-system:
 * the FB-id comes back on save, replies land in Settings › My reports, and
 * /system/feedback is the triage face.
 *
 * A floater with its own glass (Rev .99 materials rule). Owed, by name: the
 * wrong-number cell-picking mode, the ⌘K entries, Report-this on failed
 * states, and the screenshot toggle (a renderer is a new dependency — the
 * Owner's call).
 */
import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FEEDBACK_KINDS,
  submitFeedback,
  type FeedbackKind,
} from '@/api/research/feedback'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { useThemeMode } from '@/lib/theme'
import { useCarriedSymbol } from '@/lib/symbolContext'
import { ALL_OBJECTIVES, readObjective } from '@/lib/objectiveScope'
import {
  clearPickedCell,
  closeFeedbackDialog,
  collectFeedbackContext,
  startCellPick,
  useFeedbackDialog,
} from '@/lib/feedback/feedbackDialog'
import { routeFor } from '@/layout/routeRegistry'
import { DESIGN_REV } from '@/lib/design/designRoutes.generated'
import { cn } from '@/lib/utils'

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: 'Broken',
  data: 'Wrong number',
  idea: 'Idea',
  howto: 'How do I…',
}

interface Img {
  mime: string
  data_b64: string
  name: string
}

async function fileToImg(file: File): Promise<Img | null> {
  if (!file.type.startsWith('image/') || file.size > 2_000_000) return null
  const buf = await file.arrayBuffer()
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return { mime: file.type, data_b64: btoa(bin), name: file.name || 'pasted' }
}

export function FeedbackDialog() {
  const { open, kind: openedKind, prefill, cell } = useFeedbackDialog()
  const { pathname } = useLocation()
  const { mode } = useThemeMode()
  const carried = useCarriedSymbol()
  const qc = useQueryClient()
  const [kind, setKind] = useState<FeedbackKind>(openedKind)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [blocks, setBlocks] = useState<'no' | 'yes'>('no')
  const [images, setImages] = useState<Img[]>([])
  const [ctxOpen, setCtxOpen] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)
  // Opening transition, the docs' derive-during-render shape: adopt the
  // requested kind, clear the last receipt, take a seed when one rode along
  // (ViewState's Report-this). The draft text survives a close on purpose.
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setKind(openedKind)
      setSent(null)
      setError(null)
      if (prefill?.title != null) setTitle(prefill.title)
      if (prefill?.body != null) setBody(prefill.body)
    }
  }

  const route = routeFor(pathname)
  const obj = readObjective()
  const context = collectFeedbackContext({
    pathname,
    pageLabel: route.label,
    designRev: DESIGN_REV,
    theme: mode,
    symbol: (carried ?? '').trim().toUpperCase() || null,
    objective: obj !== ALL_OBJECTIVES ? obj : null,
  })
  const contextWithCell = cell ? { ...context, picked: cell } : context

  const autoTitle =
    kind === 'data' && cell
      ? ['Wrong value: ' + cell.value, cell.column, cell.row].filter(Boolean).join(' · ').slice(0, 120)
      : ''
  const send = useMutation({
    mutationFn: () =>
      submitFeedback({
        kind,
        title: title.trim() || autoTitle,
        body_md: body.trim(),
        page_route: pathname,
        page_label: route.label,
        blocks_trading: blocks === 'yes',
        context: contextWithCell,
        images: images.map(({ mime, data_b64 }) => ({ mime, data_b64 })),
      }),
    onSuccess: (r) => {
      setSent(r.report.id)
      setTitle('')
      setBody('')
      setImages([])
      setBlocks('no')
      clearPickedCell()
      void qc.invalidateQueries({ queryKey: ['research', 'feedback'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  async function addFiles(files: FileList | File[]) {
    const next: Img[] = []
    for (const f of files) {
      const img = await fileToImg(f)
      if (img) next.push(img)
    }
    setImages((prev) => [...prev, ...next].slice(0, 4))
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Send feedback"
      className="fixed right-4 top-12 z-[70] w-[400px] rounded-xl border border-[var(--sk-line)] p-3 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.6)] backdrop-blur-[18px]"
      style={{ background: 'color-mix(in srgb, var(--sk-raised) 88%, transparent)' }}
      onPaste={(e) => {
        const files = [...e.clipboardData.files]
        if (files.length) void addFiles(files)
      }}
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <span className="text-dense-meta font-semibold text-muted-foreground">Send feedback</span>
        <span className="min-w-0 truncate text-dense-micro text-muted-foreground/80">
          on {route.label} — this page rides along
        </span>
        <button
          type="button"
          onClick={closeFeedbackDialog}
          aria-label="Close"
          className="ml-auto text-dense-meta text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      {sent ? (
        <p className="mb-2 rounded bg-[color-mix(in_srgb,var(--color-profit)_12%,transparent)] px-2 py-1 text-dense-meta text-foreground">
          Sent — <span className="font-mono">{sent}</span>. Replies land in Settings › My reports.
        </p>
      ) : null}

      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <SegmentControl
          ariaLabel="Kind"
          size="xs"
          value={kind}
          onChange={(v) => setKind(v as FeedbackKind)}
          options={FEEDBACK_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))}
        />
      </div>
      {kind === 'data' ? (
        cell ? (
          <div className="mb-1.5 flex flex-col gap-1 rounded-lg bg-[color-mix(in_srgb,var(--sk-ink)_5%,transparent)] px-2.5 py-2">
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 font-mono text-base font-semibold tabular-nums [overflow-wrap:anywhere]">
                {cell.value}
              </span>
              <button
                type="button"
                onClick={clearPickedCell}
                aria-label="Remove the picked cell"
                className="ml-auto text-dense-meta text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </span>
            <dl className="grid grid-cols-[52px_minmax(0,1fr)] gap-x-2.5 gap-y-0.5 text-dense-micro">
              {(
                [
                  ['Column', cell.column],
                  ['Row', cell.row],
                  ['Panel', cell.panel],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <span key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="m-0 font-mono text-[var(--sk-soft)] [overflow-wrap:anywhere]">{v}</dd>
                  </span>
                ))}
            </dl>
          </div>
        ) : (
          <div className="mb-1.5 flex items-center gap-2">
            <button
              type="button"
              onClick={startCellPick}
              className="mat-btn px-2 py-1 text-dense-meta text-foreground"
            >
              Point at the number
            </button>
            <span className="min-w-0 text-dense-micro text-muted-foreground">
              its column, row and panel come with it — or describe it below
            </span>
          </div>
        )
      ) : null}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="One line — what happened?"
        aria-label="Title"
        className="mat-field mb-1.5 h-7 w-full px-2 text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)] focus:shadow-[0_0_0_3px_var(--mat-focus)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Anything more (optional). Paste images here."
        aria-label="Details"
        className="mat-field w-full resize-y px-2 py-1.5 text-dense-body text-foreground outline-none placeholder:text-[var(--sk-mute)] focus:shadow-[0_0_0_3px_var(--mat-focus)]"
      />

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <span className="text-dense-micro text-muted-foreground">Blocks trading</span>
        <SegmentControl
          ariaLabel="Blocks trading"
          size="xs"
          value={blocks}
          onChange={(v) => setBlocks(v as 'no' | 'yes')}
          options={[
            { value: 'no', label: 'No' },
            { value: 'yes', label: 'Yes' },
          ]}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
          disabled={images.length >= 4}
        >
          + image ({images.length}/4)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {images.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {images.map((img, i) => (
            <button
              key={`${img.name}-${i}`}
              type="button"
              onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
              title="Remove"
              className="mat-tag font-mono text-dense-micro text-foreground"
            >
              {img.name} ×
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setCtxOpen((v) => !v)}
        className="mt-1.5 text-dense-micro text-muted-foreground hover:text-foreground hover:underline"
      >
        {ctxOpen ? 'Hide' : 'Show'} what rides along
      </button>
      {ctxOpen ? (
        <pre className="mt-1 max-h-28 overflow-auto rounded bg-[color-mix(in_srgb,var(--sk-ink)_6%,transparent)] p-2 font-mono text-dense-micro text-muted-foreground">
          {JSON.stringify(contextWithCell, null, 1)}
        </pre>
      ) : null}

      {error ? <p className="mt-1 text-dense-micro text-destructive">{error}</p> : null}
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-dense-micro text-muted-foreground">closes in-system · nothing leaves</span>
        <Button
          size="sm"
          className={cn('ml-auto h-6')}
          disabled={(!title.trim() && !autoTitle) || send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
