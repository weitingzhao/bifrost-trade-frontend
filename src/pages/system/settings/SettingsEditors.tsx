/**
 * The row editors Settings opens in place (Owner 2026-09-25: the IB Connection
 * page's writes move here and the page retires).
 *
 * Each editor saves only its own part, through the two writes the retired page
 * used: `POST /api/monitor/config/ib` for the accounts, and the Flex plugin's
 * `POST /flex/config/write`, whose fields are all optional — a field left out
 * is left as stored. So a token edit cannot touch the query rows, and a blank
 * token field keeps the stored token rather than clearing it.
 *
 * The two YAML rows have no write route (config.yaml is read at process start),
 * so they open their full reading instead of a form.
 */
import { useState } from 'react'
import { postIbConfig } from '@/api/monitor'
import { pluginFlexWriteConfig, type FlexConfigSummary } from '@/api/flexQueryPlugin'
import { useInvalidateStatus } from '@/hooks/useMonitorStatus'
import { useInvalidateFlexConfigSummary } from '@/hooks/useFlexConfigSummary'
import {
  DenseDataTable,
  DenseTableBody,
  DenseTableCell,
  DenseTableHead,
  DenseTableHeader,
  DenseTableHeadRow,
  DenseTableRow,
  GroupHeaderRow,
} from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { FlexAccountItem, StatusResponse } from '@/types/monitor'
import { FLEX_QUERY_TYPES, initFlexRows, type SlotLine } from './settingsModel'

type Result = { ok: boolean; error?: string }

/** Where an opened row's form or reading sits: under its row, inside the group's card. */
const EDITOR_WELL = 'border-t border-border bg-[color-mix(in_srgb,var(--sk-ink)_3%,transparent)] px-3 py-3'

/** Save / Cancel and the outcome, under every form. */
function useSave(onSaved: () => void) {
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const run = async (write: () => Promise<Result>) => {
    setSaving(true)
    setMessage(null)
    try {
      const r = await write()
      if (r.ok) onSaved()
      else setMessage({ text: r.error ?? 'Save failed', error: true })
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true })
    } finally {
      setSaving(false)
    }
  }
  return { saving, message, run }
}

function EditorFrame({
  children,
  onSave,
  onCancel,
  saving,
  canSave = true,
  message,
  note,
}: {
  children: React.ReactNode
  onSave: () => void
  onCancel: () => void
  saving: boolean
  canSave?: boolean
  message: { text: string; error: boolean } | null
  note?: string
}) {
  return (
    <div className={cn(EDITOR_WELL, 'space-y-3')}>
      {children}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !canSave}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        {message ? (
          <span className={cn('text-dense-caption', message.error ? 'text-destructive' : 'text-muted-foreground')}>
            {message.text}
          </span>
        ) : note ? (
          <span className="text-dense-caption text-muted-foreground">{note}</span>
        ) : null}
      </div>
    </div>
  )
}

function EditorField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className="text-dense-caption text-muted-foreground" title={hint}>
        {label}
      </Label>
      {children}
    </div>
  )
}

// ── The YAML rows: read, not written ─────────────────────────────────────────

export function YamlReading({ lines, why }: { lines: SlotLine[]; why: string }) {
  return (
    <div className={cn(EDITOR_WELL, 'space-y-2')}>
      <DenseDataTable wrapClassName="max-w-xl">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead />
            <DenseTableHead>Host</DenseTableHead>
            <DenseTableHead>Secondary</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {lines.flatMap((l) => [
            ...(l.group ? [<GroupHeaderRow key={`g-${l.group}`} colSpan={3} label={l.group} />] : []),
            <DenseTableRow key={l.label}>
              <DenseTableCell className="text-muted-foreground">{l.label}</DenseTableCell>
              <DenseTableCell className="font-mono tabular-nums">{l.host}</DenseTableCell>
              <DenseTableCell className="font-mono tabular-nums">{l.secondary}</DenseTableCell>
            </DenseTableRow>,
          ])}
        </DenseTableBody>
      </DenseDataTable>
      <p className="text-dense-caption text-muted-foreground">{why}</p>
    </div>
  )
}

// ── Account ──────────────────────────────────────────────────────────────────

export function AccountEditor({ status, onDone }: { status: StatusResponse | undefined; onDone: () => void }) {
  const account = status?.config?.ib_client?.account
  const invalidateStatus = useInvalidateStatus()
  const [trading, setTrading] = useState(account?.trading ?? '')
  const [eventHost, setEventHost] = useState(account?.event_host ?? '')
  const [eventSecondary, setEventSecondary] = useState(account?.event_secondary ?? '')
  const { saving, message, run } = useSave(() => {
    invalidateStatus()
    onDone()
  })
  return (
    <EditorFrame
      saving={saving}
      message={message}
      note="Saved to the settings store; the daemon and agents pick it up on their next reconnect."
      onCancel={onDone}
      onSave={() =>
        void run(() =>
          postIbConfig({
            ib_host_account_id: trading.trim() || null,
            stream_host_account_id: eventHost.trim() || null,
            stream_secondary_account_id: eventSecondary.trim() || null,
          }),
        )
      }
    >
      <div className="grid gap-3 @md/page:grid-cols-3">
        <EditorField label="Trading account" hint="The one account the daemon trades and writes positions for. Empty = the first account on the host slot.">
          <Input value={trading} onChange={(e) => setTrading(e.target.value)} placeholder="U-number" aria-label="Trading account" />
        </EditorField>
        <EditorField label="Event account · host">
          <Input value={eventHost} onChange={(e) => setEventHost(e.target.value)} placeholder="U-number" aria-label="Event account host" />
        </EditorField>
        <EditorField label="Event account · secondary">
          <Input value={eventSecondary} onChange={(e) => setEventSecondary(e.target.value)} placeholder="U-number" aria-label="Event account secondary" />
        </EditorField>
      </div>
    </EditorFrame>
  )
}

// ── Flex ─────────────────────────────────────────────────────────────────────

function tokenHint(set: boolean | undefined, last4: string | null | undefined): string {
  if (set && last4) return `blank keeps the stored token (…${last4})`
  if (set) return 'blank keeps the stored token'
  return 'no token stored'
}

function useFlexSave(onDone: () => void) {
  const invalidate = useInvalidateFlexConfigSummary()
  return useSave(() => {
    void invalidate()
    onDone()
  })
}

export function FlexTokenEditor({
  summary,
  secondaryOn,
  onDone,
}: {
  summary: FlexConfigSummary | undefined
  secondaryOn: boolean
  onDone: () => void
}) {
  const t = summary?.tokens
  const [host, setHost] = useState('')
  const [secondary, setSecondary] = useState('')
  const { saving, message, run } = useFlexSave(onDone)
  return (
    <EditorFrame
      saving={saving}
      message={message}
      canSave={host.trim().length > 0 || secondary.trim().length > 0}
      onCancel={onDone}
      onSave={() =>
        void run(() => pluginFlexWriteConfig(host.trim() || undefined, secondary.trim() || undefined, undefined))
      }
    >
      <div className="grid gap-3 @md/page:grid-cols-2">
        <EditorField label="Token · host">
          <Input
            type="password"
            autoComplete="off"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder={tokenHint(t?.host_token_set, t?.host_token_last4)}
            aria-label="Flex token host"
          />
        </EditorField>
        <EditorField label="Token · secondary">
          <Input
            type="password"
            autoComplete="off"
            value={secondary}
            onChange={(e) => setSecondary(e.target.value)}
            placeholder={secondaryOn ? tokenHint(t?.secondary_token_set, t?.secondary_token_last4) : 'no secondary slot'}
            disabled={!secondaryOn}
            aria-label="Flex token secondary"
          />
        </EditorField>
      </div>
    </EditorFrame>
  )
}

export function FlexQueryEditor({
  summary,
  secondaryOn,
  onDone,
}: {
  summary: FlexConfigSummary | undefined
  secondaryOn: boolean
  onDone: () => void
}) {
  const [rows, setRows] = useState<FlexAccountItem[]>(() => initFlexRows(summary?.query_rows))
  const { saving, message, run } = useFlexSave(onDone)
  const set = (i: number, key: 'query_host_id' | 'query_secondary_id', v: string) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [key]: v } : r)))
  return (
    <EditorFrame
      saving={saving}
      message={message}
      // The plugin refuses a write with no host query id at all.
      canSave={rows.some((r) => (r.query_host_id ?? '').trim().length > 0)}
      note="A query with no host id is not imported."
      onCancel={onDone}
      onSave={() =>
        void run(() =>
          pluginFlexWriteConfig(
            undefined,
            undefined,
            rows.map((r) => ({
              purpose: r.purpose,
              query_label: r.query_label,
              query_host_id: (r.query_host_id ?? '').trim(),
              query_secondary_id: (r.query_secondary_id ?? '').trim() || undefined,
            })),
          ),
        )
      }
    >
      <DenseDataTable wrapClassName="max-w-xl">
        <DenseTableHeader>
          <DenseTableHeadRow>
            <DenseTableHead>Query</DenseTableHead>
            <DenseTableHead>Host query id</DenseTableHead>
            <DenseTableHead>Secondary query id</DenseTableHead>
          </DenseTableHeadRow>
        </DenseTableHeader>
        <DenseTableBody>
          {FLEX_QUERY_TYPES.map(({ purpose, label }, i) => (
            <DenseTableRow key={purpose}>
              <DenseTableCell className="text-muted-foreground">{label}</DenseTableCell>
              <DenseTableCell>
                <Input
                  className="h-7 font-mono"
                  value={rows[i]?.query_host_id ?? ''}
                  onChange={(e) => set(i, 'query_host_id', e.target.value)}
                  aria-label={`${label} host query id`}
                />
              </DenseTableCell>
              <DenseTableCell>
                <Input
                  className="h-7 font-mono"
                  value={rows[i]?.query_secondary_id ?? ''}
                  onChange={(e) => set(i, 'query_secondary_id', e.target.value)}
                  disabled={!secondaryOn}
                  aria-label={`${label} secondary query id`}
                />
              </DenseTableCell>
            </DenseTableRow>
          ))}
        </DenseTableBody>
      </DenseDataTable>
    </EditorFrame>
  )
}

const clampDays = (v: string, fallback: number) => Math.max(1, Math.min(9999, Math.round(Number(v) || fallback)))

export function FlexRangeEditor({ summary, onDone }: { summary: FlexConfigSummary | undefined; onDone: () => void }) {
  const [def, setDef] = useState(() => summary?.range_days.default ?? 30)
  const [init, setInit] = useState(() => summary?.range_days.init ?? 360)
  const { saving, message, run } = useFlexSave(onDone)
  return (
    <EditorFrame
      saving={saving}
      message={message}
      note="Used when a pull is sent without a date range; the first pull reaches back the longer one."
      onCancel={onDone}
      onSave={() => void run(() => pluginFlexWriteConfig(undefined, undefined, undefined, def, init))}
    >
      <div className="flex flex-wrap gap-4">
        <EditorField label="Default range · days">
          <Input
            type="number"
            min={1}
            max={9999}
            className="w-24 text-right font-mono"
            value={def}
            onChange={(e) => setDef(clampDays(e.target.value, 30))}
            aria-label="Default Flex range in days"
          />
        </EditorField>
        <EditorField label="First pull · days">
          <Input
            type="number"
            min={1}
            max={9999}
            className="w-24 text-right font-mono"
            value={init}
            onChange={(e) => setInit(clampDays(e.target.value, 360))}
            aria-label="First Flex pull range in days"
          />
        </EditorField>
      </div>
    </EditorFrame>
  )
}
