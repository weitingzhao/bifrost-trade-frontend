import { useLayoutEffect, useState } from 'react'
import { PageHeader, PageShell } from '@/components/layout'
import { useLocation } from 'react-router-dom'
import { postIbConfig, postFlexConfig } from '@/api/monitor'
import type { FlexAccountItem, StatusIbFlex, StatusResponse } from '@/types/monitor'
import { useMonitorStatus, useInvalidateStatus } from '@/hooks/useMonitorStatus'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

type PortType = 'tws_live' | 'tws_paper' | 'gateway'

const PORT_LABELS: Record<string, string> = {
  tws_paper: 'TWS Paper (7497)',
  tws_live: 'TWS Live (7496)',
  gateway: 'Gateway (4002)',
}

const FLEX_QUERY_TYPES: { purpose: string; label: string }[] = [
  { purpose: 'cash_transactions', label: 'Cash Transactions' },
  { purpose: 'trades', label: 'Trades' },
]

function makeDefaultFlexRows(): FlexAccountItem[] {
  return FLEX_QUERY_TYPES.map(({ purpose, label }) => ({
    purpose,
    query_label: label,
    query_host_id: '',
    query_secondary_id: '',
  }))
}

function initFlexRows(ibFlex: StatusIbFlex | null | undefined): FlexAccountItem[] {
  if (!Array.isArray(ibFlex?.rows) || ibFlex!.rows!.length === 0) return makeDefaultFlexRows()
  return FLEX_QUERY_TYPES.map(({ purpose, label }) => {
    const row = ibFlex!.rows!.find((r: FlexAccountItem) => (r.purpose ?? 'cash_transactions') === purpose)
    return {
      purpose,
      query_label: label,
      query_host_id: row?.query_host_id ?? '',
      query_secondary_id: row?.query_secondary_id ?? '',
    }
  })
}

// ─── Inner form — receives loaded status as props ─────────────────────────────

function IbConnectionForm({ status, initialHash }: { status: StatusResponse; initialHash: string }) {
  const invalidateStatus = useInvalidateStatus()

  const ibClient = status.config?.ib_client
  const ibFlex = status.config?.ib_flex

  const ibHost = ibClient?.client?.host_ip ?? ''
  const ibPortType = (ibClient?.client?.host_port_type ?? 'tws_paper') as PortType
  const ib2Host = ibClient?.client?.secondary_host_ip ?? ''
  const ib2PortType = (ibClient?.client?.secondary_port_type ?? 'tws_paper') as PortType
  const port = ibClient?.port ?? {}
  const hasSecondary = ib2Host.trim().length > 0

  const [streamHostAccountId, setStreamHostAccountId] = useState(
    () => ibClient?.account?.event_host ?? '',
  )
  const [streamSecondaryAccountId, setStreamSecondaryAccountId] = useState(
    () => ibClient?.account?.event_secondary ?? '',
  )
  const [hostAccountId, setHostAccountId] = useState(
    () => ibClient?.account?.trading ?? '',
  )
  const [flexHostToken, setFlexHostToken] = useState(() => ibFlex?.host_token ?? '')
  const [flexSecondaryToken, setFlexSecondaryToken] = useState(
    () => ibFlex?.secondary_token ?? '',
  )
  const [flexRows, setFlexRows] = useState<FlexAccountItem[]>(() => initFlexRows(ibFlex))
  const [defaultFlexRangeDays, setDefaultFlexRangeDays] = useState(
    () => ibFlex?.default_range_days ?? 30,
  )
  const [initFlexRangeDays, setInitFlexRangeDays] = useState(
    () => ibFlex?.init_range_days ?? 360,
  )

  // Scroll to hash-targeted section
  useLayoutEffect(() => {
    if (initialHash) {
      const el = document.getElementById(initialHash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }, [initialHash])

  const [saveMsg, setSaveMsg] = useState({ text: '', isErr: false })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg({ text: 'Saving…', isErr: false })
    const flexToSave = flexRows.map((row, i) => ({
      purpose: FLEX_QUERY_TYPES[i]?.purpose ?? row.purpose ?? '',
      query_label: FLEX_QUERY_TYPES[i]?.label ?? row.query_label ?? '',
      query_host_id: (row.query_host_id ?? '').trim(),
      query_secondary_id: (row.query_secondary_id ?? '').trim() || undefined,
    }))
    try {
      const [r1, r2] = await Promise.all([
        postIbConfig({
          ib_host_account_id: hostAccountId.trim() || null,
          stream_host_account_id: streamHostAccountId.trim() || null,
          stream_secondary_account_id: streamSecondaryAccountId.trim() || null,
        }),
        postFlexConfig(
          flexHostToken.trim() || undefined,
          flexSecondaryToken.trim() || undefined,
          flexToSave,
          defaultFlexRangeDays,
          initFlexRangeDays,
        ),
      ])
      if (r1.ok && r2.ok) {
        setSaveMsg({
          text: 'Settings saved. Account/stream IDs and Flex config updated.',
          isErr: false,
        })
        invalidateStatus()
      } else {
        setSaveMsg({ text: r1.error ?? r2.error ?? 'Save failed', isErr: true })
      }
    } catch (e) {
      setSaveMsg({ text: String(e), isErr: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell className="space-y-4">
      <PageHeader
        title="IB Connection"
        description="Configure Interactive Brokers connection and Flex Query"
        actions={
          <>
            {saveMsg.text && (
              <span
                className={cn(
                  'text-sm max-w-xs text-right',
                  saveMsg.isErr ? 'text-destructive' : 'text-green-600 dark:text-green-400',
                )}
              >
                {saveMsg.text}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              Save settings
            </Button>
          </>
        }
      />

      {/* ── Connection ────────────────────────────────────────────────────── */}
      <Card id="ib-users">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Connection</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">Read-only · YAML</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Host &amp; port are sourced from config.yaml — restart processes after file changes.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]" />
                  <TableHead>Host</TableHead>
                  <TableHead>Secondary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">IP/Host</TableCell>
                  <TableCell className="font-mono">{ibHost || '—'}</TableCell>
                  <TableCell className="font-mono">
                    {ib2Host || <span className="text-muted-foreground italic font-sans">disabled</span>}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Port type</TableCell>
                  <TableCell>{PORT_LABELS[ibPortType] ?? ibPortType}</TableCell>
                  <TableCell>{PORT_LABELS[ib2PortType] ?? ib2PortType}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Client IDs ────────────────────────────────────────────────────── */}
      <Card id="ib-client-ids">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Client IDs</CardTitle>
            <Badge variant="outline" className="text-[10px] font-normal">Read-only · YAML</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Service</TableHead>
                  <TableHead className="text-right">Host</TableHead>
                  <TableHead className="text-right">Secondary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Daemon */}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={3} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Daemon
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Trading</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.trading ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Listener</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.listener_host ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.listener_secondary ?? '—'}</TableCell>
                </TableRow>

                {/* Socket Services */}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={3} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Socket Services
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Operator (cmd RPC)</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.operator_host ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {hasSecondary ? (port.operator_secondary ?? '—') : '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">
                    Ingestor
                    <span className="ml-1 text-[10px] text-muted-foreground/50" title="Host only, no secondary ingestor">ⓘ</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.ingestor ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">
                    Account Agent
                    <span className="ml-1 text-[10px] text-muted-foreground/50" title="ib.host.client_id.account_agent; secondary: ib.secondary.client_id.account_agent">ⓘ</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.account_agent ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {hasSecondary ? (port.account_agent_secondary ?? '—') : '—'}
                  </TableCell>
                </TableRow>

                {/* Celery */}
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={3} className="py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Celery
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6">Market Data</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{port.market_data_worker ?? '—'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Account ───────────────────────────────────────────────────────── */}
      <Card id="ib-account">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Account</CardTitle>
          <p className="text-xs text-muted-foreground">
            Account &amp; stream IDs saved to the database via this page.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Event Account — Host</Label>
              <Input
                value={streamHostAccountId}
                onChange={(e) => setStreamHostAccountId(e.target.value)}
                placeholder="e.g. U17113214"
                aria-label="Stream host account ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Event Account — Secondary</Label>
              <Input
                value={streamSecondaryAccountId}
                onChange={(e) => setStreamSecondaryAccountId(e.target.value)}
                placeholder="e.g. U98765432"
                aria-label="Stream secondary account ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Trading Account — Host
                <span
                  className="ml-1 text-[10px] text-muted-foreground/50"
                  title="Single IB account used by daemon for trading and position writes. Empty = first account from Host User's TWS."
                >
                  ⓘ
                </span>
              </Label>
              <Input
                value={hostAccountId}
                onChange={(e) => setHostAccountId(e.target.value)}
                placeholder="e.g. U17113214 (empty = first from Host User)"
                aria-label="Trading Account — Host"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Trading Account — Secondary</Label>
              <p className="h-8 flex items-center text-sm text-muted-foreground">—</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Flex Query ────────────────────────────────────────────────────── */}
      <Card id="ib-flex-query">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Flex Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Flex Token — Host</Label>
              <Input
                value={flexHostToken}
                onChange={(e) => setFlexHostToken(e.target.value)}
                placeholder="IB Flex token (Host account)"
                aria-label="Flex token — Host"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Flex Token — Secondary</Label>
              <Input
                value={flexSecondaryToken}
                onChange={(e) => setFlexSecondaryToken(e.target.value)}
                placeholder="IB Flex token (empty if not used)"
                disabled={!hasSecondary}
                aria-label="Flex token — Secondary"
              />
            </div>
          </div>

          <Separator />

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Query</TableHead>
                  <TableHead>Host Query ID</TableHead>
                  <TableHead>Secondary Query ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FLEX_QUERY_TYPES.map(({ purpose, label }, i) => (
                  <TableRow key={purpose}>
                    <TableCell className="text-muted-foreground">{label}</TableCell>
                    <TableCell>
                      <Input
                        placeholder="Query ID"
                        value={flexRows[i]?.query_host_id ?? ''}
                        onChange={(e) =>
                          setFlexRows((prev) => {
                            const next = [...prev]
                            next[i] = { ...next[i], query_host_id: e.target.value }
                            return next
                          })
                        }
                        aria-label={`${label} — Host Query ID`}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Query ID"
                        value={flexRows[i]?.query_secondary_id ?? ''}
                        onChange={(e) =>
                          setFlexRows((prev) => {
                            const next = [...prev]
                            next[i] = { ...next[i], query_secondary_id: e.target.value }
                            return next
                          })
                        }
                        aria-label={`${label} — Secondary Query ID`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Flex Preference ────────────────────────────────────────────────── */}
      <Card id="flex-preference">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Flex Preference</CardTitle>
          <p className="text-xs text-muted-foreground">
            Default ranges for Flex Query when no date range is sent. Init: for initial/full pull.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Default range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={defaultFlexRangeDays}
                  onChange={(e) =>
                    setDefaultFlexRangeDays(
                      Math.max(1, Math.min(9999, Math.round(Number(e.target.value) || 30))),
                    )
                  }
                  className="w-24 text-right"
                  aria-label="Default Flex Query range in days"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Init range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={9999}
                  value={initFlexRangeDays}
                  onChange={(e) =>
                    setInitFlexRangeDays(
                      Math.max(1, Math.min(9999, Math.round(Number(e.target.value) || 360))),
                    )
                  }
                  className="w-24 text-right"
                  aria-label="Init Flex Query range in days"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export default function IbConnectionPage() {
  const { data: status } = useMonitorStatus()
  const { hash } = useLocation()
  const initialHash = hash.replace('#', '')

  if (!status) {
    return (
      <PageShell className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </PageShell>
    )
  }

  return <IbConnectionForm status={status} initialHash={initialHash} />
}
