/**
 * The four panes of Settings (design Rev .80), one per category. Every
 * capability of the v1 page is here (§16.1): the YAML rows open their full
 * reading, the account and the three Flex rows edit in place, Fetch now
 * queues a pull. Appearance is the user menu's second door — the same stores,
 * so a switch flipped in either place reads the same in both.
 */
import { useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { SegmentControl } from '@/components/data-display'
import { Button } from '@/components/ui/button'
import { SwitchTrack } from '@/components/ui/SwitchTrack'
import { pluginFlexTrigger } from '@/api/flexQueryPlugin'
import { useMonitorStatus } from '@/hooks/useMonitorStatus'
import { useFlexConfigSummary, useInvalidateFlexConfigSummary } from '@/hooks/useFlexConfigSummary'
import { useFlexCoverageFreshness } from '@/hooks/useFlexCoverageFreshness'
import { SHORTCUTS } from '@/lib/cockpit/shortcuts'
import { useDisplay, type TextSize } from '@/lib/display'
import { useGlass } from '@/lib/glass'
import { useThemeMode, type ThemeMode } from '@/lib/theme'
import {
  flexRows,
  flexStanding,
  ibClientIdLines,
  ibConnectionLines,
  ibRows,
  ibSlotLamp,
  ibSlotStanding,
  type SettingRow,
} from './settingsModel'
import {
  AccountEditor,
  FlexQueryEditor,
  FlexRangeEditor,
  FlexTokenEditor,
  YamlReading,
} from './SettingsEditors'
import {
  SettingGroup,
  SettingKbd,
  SettingLine,
  SettingPaneHead,
  SettingValue,
} from './SettingsGroup'

/** The two rows config.yaml owns: read in full, never written from here. */
const YAML_ROWS = new Set(['ib-user', 'ib-client'])
const YAML_WHY =
  'Set in config.yaml and read when a process starts — edit the file and restart the process; there is no write route for it.'

/**
 * One row open at a time: an editor is a form, and two half-typed forms on one
 * pane are two saves waiting to disagree.
 */
function useOpenRow() {
  const [open, setOpen] = useState<string | null>(null)
  return {
    open,
    close: () => setOpen(null),
    toggle: (id: string) => setOpen((o) => (o === id ? null : id)),
  }
}

function RowWithEditor({
  row,
  open,
  onToggle,
  editor,
}: {
  row: SettingRow
  open: boolean
  onToggle: () => void
  editor: ReactNode
}) {
  const yaml = YAML_ROWS.has(row.id)
  return (
    <div>
      <SettingLine label={row.label} sub={row.what}>
        <SettingValue>{row.reading}</SettingValue>
        <Button
          variant="secondary"
          size="xs"
          className="px-2.5"
          aria-expanded={open}
          title={yaml ? YAML_WHY : undefined}
          onClick={onToggle}
        >
          {open ? 'Close' : yaml ? 'View' : 'Edit…'}
        </Button>
      </SettingLine>
      {open ? editor : null}
    </div>
  )
}

export function IbPane() {
  const { data: status } = useMonitorStatus()
  const { open, close, toggle } = useOpenRow()
  const [user, client, account] = ibRows(status)
  return (
    <>
      <SettingPaneHead
        title="IB Connection"
        lead={ibSlotStanding(status)}
        lamp={ibSlotLamp(status)}
      />
      <SettingGroup title="Login · config.yaml" foot="Read-only. The file is the source.">
        <RowWithEditor
          row={user}
          open={open === user.id}
          onToggle={() => toggle(user.id)}
          editor={<YamlReading lines={ibConnectionLines(status)} why={YAML_WHY} />}
        />
        <RowWithEditor
          row={client}
          open={open === client.id}
          onToggle={() => toggle(client.id)}
          editor={<YamlReading lines={ibClientIdLines(status)} why={YAML_WHY} />}
        />
      </SettingGroup>
      <SettingGroup title="Account" foot="Edits apply on next reconnect.">
        <RowWithEditor
          row={account}
          open={open === account.id}
          onToggle={() => toggle(account.id)}
          editor={<AccountEditor status={status} onDone={close} />}
        />
      </SettingGroup>
    </>
  )
}

export function FlexPane() {
  const { data: status } = useMonitorStatus()
  const flexConfig = useFlexConfigSummary()
  const freshness = useFlexCoverageFreshness()
  const invalidateFlex = useInvalidateFlexConfigSummary()
  const [nowMs] = useState(() => Date.now())
  const { open, close, toggle } = useOpenRow()
  const [fetched, setFetched] = useState<{ text: string; error: boolean } | null>(null)
  const fetchNow = useMutation({
    mutationFn: () => pluginFlexTrigger('transactions'),
    onSuccess: (r) => {
      setFetched(
        r.ok === false
          ? { text: r.error ?? 'refused', error: true }
          : { text: 'Queued ✓', error: false }
      )
      invalidateFlex()
      void freshness.refetch()
      window.setTimeout(() => setFetched(null), 2500)
    },
    onError: (e) => setFetched({ text: e instanceof Error ? e.message : 'failed', error: true }),
  })
  const standing = flexStanding(freshness.data, nowMs)
  const secondaryOn = Boolean(status?.config?.ib_client?.client?.secondary_host_ip?.trim())
  const [query, preference, range] = flexRows(flexConfig.data)
  const lamp = standing.tone === 'ok' ? 'green' : standing.tone === 'warn' ? 'yellow' : 'gray'
  return (
    <>
      <SettingPaneHead
        title="Flex"
        lead={`${standing.text} · feeds Ledger and Transfer & Pay`}
        lamp={lamp}
      />
      <SettingGroup title="Query">
        <RowWithEditor
          row={query}
          open={open === query.id}
          onToggle={() => toggle(query.id)}
          editor={
            <FlexTokenEditor summary={flexConfig.data} secondaryOn={secondaryOn} onDone={close} />
          }
        />
        <RowWithEditor
          row={preference}
          open={open === preference.id}
          onToggle={() => toggle(preference.id)}
          editor={
            <FlexQueryEditor summary={flexConfig.data} secondaryOn={secondaryOn} onDone={close} />
          }
        />
      </SettingGroup>
      <SettingGroup title="Pull">
        <RowWithEditor
          row={range}
          open={open === range.id}
          onToggle={() => toggle(range.id)}
          editor={<FlexRangeEditor summary={flexConfig.data} onDone={close} />}
        />
        <SettingLine
          label="Fetch now"
          sub="Pull transactions for the default range — the same trigger Transfer & Pay’s toolbar fires"
        >
          {fetched?.error ? <SettingValue tone="error">{fetched.text}</SettingValue> : null}
          <Button
            variant="secondary"
            size="xs"
            className="px-2.5"
            disabled={fetchNow.isPending}
            onClick={() => fetchNow.mutate()}
          >
            {fetchNow.isPending
              ? 'Pulling…'
              : fetched && !fetched.error
                ? fetched.text
                : 'Fetch now'}
          </Button>
        </SettingLine>
      </SettingGroup>
    </>
  )
}

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'auto', label: 'Auto' },
]
const SIZE_OPTIONS: { value: TextSize; label: string; title: string }[] = [
  { value: 's', label: 'S', title: 'Smaller text' },
  { value: 'm', label: 'M', title: 'Default text' },
  { value: 'l', label: 'L', title: 'Larger text' },
]

function SwitchLine({
  label,
  sub,
  on,
  onToggle,
}: {
  label: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <SettingLine label={label} sub={sub}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        className="flex rounded-full"
      >
        <SwitchTrack on={on} />
      </button>
    </SettingLine>
  )
}

export function AppearancePane() {
  const { mode, theme, choose } = useThemeMode()
  const glass = useGlass()
  const display = useDisplay()
  return (
    <>
      <SettingPaneHead
        title="Appearance"
        lead="Same switches as the user menu · kept on this device"
      />
      <SettingGroup>
        <SettingLine
          label="Theme"
          sub={`Auto is light 07:00–19:00, dark otherwise${mode === 'auto' ? ` · now ${theme}` : ''}`}
        >
          <SegmentControl
            size="xs"
            ariaLabel="Theme"
            options={THEME_OPTIONS}
            value={mode}
            onChange={(v) => choose(v as ThemeMode)}
          />
        </SettingLine>
        <SettingLine
          label="Text size"
          sub="Page content only; top bar, sidebar and panels keep their size"
        >
          <SegmentControl
            size="xs"
            ariaLabel="Text size"
            options={SIZE_OPTIONS}
            value={display.textSize}
            onChange={(v) => display.set({ textSize: v as TextSize })}
          />
        </SettingLine>
      </SettingGroup>
      <SettingGroup title="Accessibility">
        <SwitchLine
          label="Increase contrast"
          sub="Hairlines back on cards, tags and glass; brighter secondary text"
          on={display.contrast}
          onToggle={() => display.set({ contrast: !display.contrast })}
        />
        <SwitchLine
          label="Reduce transparency"
          sub="Panels, toolbar, sidebar and popovers become solid"
          on={glass.solid}
          onToggle={glass.toggle}
        />
      </SettingGroup>
    </>
  )
}

export function KeyboardPane() {
  return (
    <>
      <SettingPaneHead title="Keyboard" lead="Fixed set · hold ⌘ for the full sheet" />
      <SettingGroup foot="The same list the Omnibar answers ? with.">
        {SHORTCUTS.map((s) => (
          <SettingLine
            key={s.keys}
            label={s.name}
            sub={s.scope === 'Anywhere' ? s.what : `${s.what} · ${s.scope}`}
          >
            <SettingKbd>{s.keys}</SettingKbd>
          </SettingLine>
        ))}
      </SettingGroup>
    </>
  )
}
