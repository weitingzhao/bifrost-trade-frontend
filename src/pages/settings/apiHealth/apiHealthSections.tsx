import { useState, type ReactNode } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { makeProbeQuery, useMassiveApiStatus } from '@/hooks/useApiHealthProbes'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusLamp } from '@/components/StatusLamp'
import { ServiceTopologyOverview } from '@/components/settings/ServiceTopologyOverview'
import { ExternalLink } from 'lucide-react'
import {
  ALL_SERVICES,
  ARCH_SERVICES,
  ACCOUNT_SERVICES,
  RESEARCH_SERVICES,
  MASSIVE_SERVICES,
  DOC_PATHS,
  type Lamp,
  type ServiceDef,
} from './apiHealthConfig'

export function worstLamp(lamps: Lamp[]): Lamp {
  if (lamps.includes('red')) return 'red'
  if (lamps.includes('yellow')) return 'yellow'
  return 'green'
}

export const LAMP_GLOW: Record<Lamp, string> = {
  green:  'shadow-[0_0_5px_1px_var(--color-lamp-green)]',
  yellow: 'shadow-[0_0_5px_1px_var(--color-lamp-yellow)]',
  red:    'shadow-[0_0_5px_1px_var(--color-lamp-red)]',
}

export function TabLamp({ services }: { services: ServiceDef[] }) {
  const results = useQueries({ queries: services.map(makeProbeQuery) })
  const lamp = worstLamp(results.map(r => (r.isPending ? 'yellow' : r.isError ? 'red' : 'green')))
  return <StatusLamp lamp={lamp} className={`h-2 w-2 ${LAMP_GLOW[lamp]}`} />
}

export function EnvBadge({ profile, ok }: { profile?: 'dev' | 'prod'; ok: boolean | null }) {
  if (profile === 'dev')
    return (
      <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-500 dark:text-sky-400 hover:bg-sky-500/15">
        Development
      </Badge>
    )
  if (profile === 'prod')
    return (
      <Badge variant="outline" className="border-green-600/40 bg-green-600/10 text-green-600 dark:text-green-400 hover:bg-green-600/15">
        Production
      </Badge>
    )
  if (ok === true)
    return <Badge variant="outline">Custom</Badge>
  if (ok === false)
    return <Badge variant="outline" className="text-muted-foreground">Unknown</Badge>
  return null
}

// ── Service health card ───────────────────────────────────────────────────────

export function ServiceCard({ svc }: { svc: ServiceDef }) {
  const { data, isPending, isError, error } = useQuery(makeProbeQuery(svc))
  const lamp: Lamp = isPending ? 'yellow' : isError ? 'red' : 'green'
  const ok: boolean | null = isPending ? null : !isError
  const body = data?.body

  const statusText = isPending
    ? 'Checking…'
    : isError
    ? `Unreachable · ${String((error as Error)?.message ?? 'Error')}`
    : `Running · ${data!.ms} ms`

  const statusColor =
    lamp === 'green'
      ? 'text-green-600 dark:text-green-400'
      : lamp === 'red'
      ? 'text-red-500'
      : 'text-yellow-500'

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        {/* Header: lamp + name + env badge + status */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <StatusLamp lamp={lamp} />
            <span className="font-semibold text-sm">{svc.name}</span>
            {(body?.config_profile === 'dev' || body?.config_profile === 'prod') && (
              <EnvBadge profile={body.config_profile} ok={ok} />
            )}
          </div>
          <span className={`text-xs font-mono tabular-nums shrink-0 ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs items-baseline">
          <span className="text-muted-foreground">Port</span>
          <span className="tabular-nums font-mono">
            {typeof body?.port === 'number' ? body.port : svc.port}
          </span>

          {typeof body?.service === 'string' ? (
            <>
              <span className="text-muted-foreground">Service</span>
              <span className="font-mono">{body.service}</span>
            </>
          ) : null}

          {typeof body?.ts === 'number' ? (
            <>
              <span className="text-muted-foreground">Server time</span>
              <span className="tabular-nums">{new Date(body.ts * 1000).toLocaleString()}</span>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Documentation table ───────────────────────────────────────────────────────

export function DocLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      Open <ExternalLink className="h-3 w-3" />
    </a>
  )
}

export function DocsTable({ services }: { services: ServiceDef[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">API</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Base URL</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-24">Swagger UI</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-20">ReDoc</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-28">OpenAPI JSON</th>
          </tr>
        </thead>
        <tbody>
          {services.map((svc, idx) => {
            const paths = DOC_PATHS[svc.key]
            const isLast = idx === services.length - 1
            return (
              <tr key={svc.key} className={isLast ? '' : 'border-b'}>
                <td className="px-4 py-2.5 font-medium text-sm">{svc.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-[180px] truncate">
                  {svc.base || '–'}
                </td>
                <td className="px-4 py-2.5">
                  {svc.base
                    ? <DocLink href={`${svc.base}${paths.swagger}`} />
                    : <span className="text-xs text-muted-foreground">–</span>}
                </td>
                <td className="px-4 py-2.5">
                  {svc.base
                    ? <DocLink href={`${svc.base}${paths.redoc}`} />
                    : <span className="text-xs text-muted-foreground">–</span>}
                </td>
                <td className="px-4 py-2.5">
                  {svc.base && paths.openapi
                    ? <DocLink href={`${svc.base}${paths.openapi}`} />
                    : <span className="text-xs text-muted-foreground">–</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Shared detail helpers ─────────────────────────────────────────────────────

export function DetailKV({
  label,
  mono = false,
  children,
}: {
  label: string
  mono?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex gap-4 py-2 border-b last:border-0 text-xs">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className={mono ? 'font-mono break-all text-muted-foreground' : ''}>{children}</span>
    </div>
  )
}

export function SubTabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: { key: string; label: string }[]
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {tabs.map(t => (
        <Button
          key={t.key}
          variant={active === t.key ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSelect(t.key)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}

// ── API Details panels ────────────────────────────────────────────────────────

export function ArchDetailsPanel() {
  const [tab, setTab] = useState<'monitor' | 'ops' | 'docs'>('monitor')

  const monitorSvc = ARCH_SERVICES.find(s => s.key === 'monitor')!
  const docsSvc    = ARCH_SERVICES.find(s => s.key === 'docs')!
  const opsSvc     = ARCH_SERVICES.find(s => s.key === 'ops')!

  // Reads from TanStack Query cache (already populated by ServiceCard/TabLamp above).
  const { data: monitorData } = useQuery(makeProbeQuery(monitorSvc))
  const { data: docsData }    = useQuery(makeProbeQuery(docsSvc))
  const monitorBody = monitorData?.body ?? null
  const docsBody    = docsData?.body ?? null

  return (
    <div className="space-y-4">
      <SubTabBar
        tabs={[
          { key: 'monitor', label: 'Monitor API' },
          { key: 'ops',     label: 'Ops API'     },
          { key: 'docs',    label: 'Docs API'    },
        ]}
        active={tab}
        onSelect={k => setTab(k as typeof tab)}
      />

      {tab === 'monitor' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Sidecar ports (from YAML)</p>
          <p className="text-xs text-muted-foreground">
            From Monitor GET /health — listen ports declared in the merged server config.
          </p>
          {monitorBody ? (
            <Card>
              <CardContent className="px-4 py-0">
                {([
                  ['Massive API',   monitorBody.massive_port],
                  ['Ops API',       monitorBody.ops_port],
                  ['Docs API',      monitorBody.docs_port],
                  ['Trading API',   monitorBody.trading_port],
                  ['Strategy API',  monitorBody.strategy_port],
                  ['Portfolio API', monitorBody.portfolio_port],
                  ['Market API',    monitorBody.market_port],
                  ['Research API',  monitorBody.research_port],
                ] as [string, number | undefined][]).map(([label, port]) => (
                  <DetailKV key={label} label={label}>
                    <span className="tabular-nums font-mono">{port ?? '–'}</span>
                  </DetailKV>
                ))}
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No data yet. When Monitor API is reachable, GET /health returns YAML sidecar listen ports here.
            </p>
          )}
        </div>
      )}

      {tab === 'ops' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Main and Ops OpenAPI JSON</p>
          <p className="text-xs text-muted-foreground">Resolved OpenAPI endpoints used by tooling.</p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Main API" mono>{monitorSvc.base}/openapi.json</DetailKV>
              <DetailKV label="Ops API"  mono>{opsSvc.base}/ops/openapi.json</DetailKV>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'docs' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Upstream OpenAPI sources</p>
          <p className="text-xs text-muted-foreground">
            URLs the Docs server uses to fetch and merge OpenAPI specs.
          </p>
          {docsBody?.main_url ? (
            <Card>
              <CardContent className="px-4 py-0">
                <DetailKV label="Main API"     mono>{String(docsBody.main_url)}</DetailKV>
                <DetailKV label="Massive API"  mono>{String(docsBody.massive_url ?? '–')}</DetailKV>
                <DetailKV label="Research API" mono>{String(docsBody.research_url ?? '–')}</DetailKV>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No data yet. When Docs API is reachable, GET /health returns upstream OpenAPI source URLs here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function AccountDetailsPanel() {
  const [tab, setTab] = useState<'trading' | 'portfolio'>('trading')
  const tradingBase   = ACCOUNT_SERVICES.find(s => s.key === 'trading')!.base
  const portfolioBase = ACCOUNT_SERVICES.find(s => s.key === 'portfolio')!.base

  return (
    <div className="space-y-4">
      <SubTabBar
        tabs={[
          { key: 'trading',   label: 'Trading API'   },
          { key: 'portfolio', label: 'Portfolio API'  },
        ]}
        active={tab}
        onSelect={k => setTab(k as typeof tab)}
      />

      {tab === 'trading' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Executions, performance, and cash flows</p>
          <p className="text-xs text-muted-foreground">
            Account-level trades and derived views (R-A2, performance book, Flex ingest).
            Uses IB operator client on startup when configured.
          </p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Typical routes">
                <code className="text-xs">/executions</code>
                <span className="text-muted-foreground text-xs">, performance and transaction helpers (see OpenAPI)</span>
              </DetailKV>
              <DetailKV label="OpenAPI JSON" mono>
                {tradingBase ? `${tradingBase}/trading/openapi.json` : '–'}
              </DetailKV>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'portfolio' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Model analysis and portfolio configuration</p>
          <p className="text-xs text-muted-foreground">
            Portfolio payoff / Greeks style analysis and position category CRUD
            (Postgres-backed writes when available).
          </p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Typical routes">
                <code className="text-xs">/portfolio/model-analysis</code>
                <span className="text-muted-foreground text-xs">, /position-categories, execution strategy attribution</span>
              </DetailKV>
              <DetailKV label="OpenAPI JSON" mono>
                {portfolioBase ? `${portfolioBase}/portfolio/openapi.json` : '–'}
              </DetailKV>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export function ResearchDetailsPanel() {
  const [tab, setTab] = useState<'research' | 'strategy' | 'market'>('research')
  const researchBase = RESEARCH_SERVICES.find(s => s.key === 'research')!.base
  const strategyBase = RESEARCH_SERVICES.find(s => s.key === 'strategy')!.base
  const marketBase   = RESEARCH_SERVICES.find(s => s.key === 'market')!.base

  return (
    <div className="space-y-4">
      <SubTabBar
        tabs={[
          { key: 'research', label: 'Research API' },
          { key: 'strategy', label: 'Strategy API' },
          { key: 'market',   label: 'Market API'   },
        ]}
        active={tab}
        onSelect={k => setTab(k as typeof tab)}
      />

      {tab === 'research' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Option discovery and max pain</p>
          <p className="text-xs text-muted-foreground">
            IB-backed option chains, snapshots, and max pain compute endpoints.
            Uses IB operator client on startup when configured.
          </p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Typical routes">
                <code className="text-xs">/research/option-snapshot</code>
                <span className="text-muted-foreground text-xs">, /research/max-pain/compute (see OpenAPI)</span>
              </DetailKV>
              <DetailKV label="OpenAPI JSON" mono>
                {researchBase ? `${researchBase}/openapi.json` : '–'}
              </DetailKV>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'strategy' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Structures, instances, allocations</p>
          <p className="text-xs text-muted-foreground">
            Strategy templates, scoring, opportunity views, and instance CRUD
            (Postgres-backed when available).
          </p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Typical routes">
                <code className="text-xs">/strategy/*</code>
                <span className="text-muted-foreground text-xs"> REST resources (see OpenAPI)</span>
              </DetailKV>
              <DetailKV label="OpenAPI JSON" mono>
                {strategyBase ? `${strategyBase}/strategy/openapi.json` : '–'}
              </DetailKV>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'market' && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Bars, quotes, watchlist</p>
          <p className="text-xs text-muted-foreground">
            Market data and SSE quote streams; Redis subscriber when configured.
            IB operator client on startup when configured.
          </p>
          <Card>
            <CardContent className="px-4 py-0">
              <DetailKV label="Typical routes">
                <code className="text-xs">/market/*</code>
                <span className="text-muted-foreground text-xs"> bars, quotes, watchlist (see OpenAPI)</span>
              </DetailKV>
              <DetailKV label="OpenAPI JSON" mono>
                {marketBase ? `${marketBase}/market/openapi.json` : '–'}
              </DetailKV>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

const TIER_LABELS: Record<string, string> = {
  starter:   'Starter (free)',
  developer: 'Developer',
  advanced:  'Advanced',
  business:  'Business',
}

export function MassiveDetailsPanel() {
  const { data, isPending, isError } = useMassiveApiStatus(MASSIVE_SERVICES[0].base)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Polygon data source</p>
      <p className="text-xs text-muted-foreground">
        Configuration status of the Polygon.io market data provider (GET /research/massive/status).
      </p>
      <Card>
        <CardContent className="px-4 py-0">
          <DetailKV label="Configured">
            {isPending ? '…' : isError ? '–' : (data!.configured ? 'Yes' : 'No')}
          </DetailKV>
          <DetailKV label="Tier">
            {isPending ? '…' : isError ? '–' : (TIER_LABELS[String(data!.tier ?? '')] ?? String(data!.tier ?? '–'))}
          </DetailKV>
          <DetailKV label="Trades enabled">
            {isPending ? '…' : isError ? '–' : (data!.trades_enabled ? 'Yes' : 'No')}
          </DetailKV>
          {data?.delay_notice ? (
            <DetailKV label="Delay notice">{String(data.delay_notice)}</DetailKV>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Category tab layout ───────────────────────────────────────────────────────

export function CategoryTabContent({
  services,
  detailsPanel,
}: {
  services: ServiceDef[]
  detailsPanel: ReactNode
}) {
  const cols =
    services.length === 1
      ? 'grid-cols-1 max-w-xs'
      : services.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="space-y-6">
      {/* Service health cards */}
      <div className={`grid gap-4 ${cols}`}>
        {services.map(svc => (
          <ServiceCard key={svc.key} svc={svc} />
        ))}
      </div>

      <Separator />

      {/* Documentation */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Documentation</h3>
        <DocsTable services={services} />
      </div>

      <Separator />

      {/* API Details */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">API Details</h3>
        {detailsPanel}
      </div>
    </div>
  )
}

// ── Topology overview ─────────────────────────────────────────────────────────

export function ServiceTopologyPanel() {
  const results = useQueries({ queries: ALL_SERVICES.map(makeProbeQuery) })
  const services = ALL_SERVICES.map((svc, i) => {
    const r = results[i]
    const lamp: Lamp = r.isPending ? 'yellow' : r.isError ? 'red' : 'green'
    const rawProfile = r.isSuccess ? r.data.body?.config_profile : undefined
    const profile: 'dev' | 'prod' | undefined =
      rawProfile === 'dev' || rawProfile === 'prod' ? rawProfile : undefined
    return {
      key: svc.key,
      name: svc.name,
      port: svc.port,
      lamp,
      ms: r.isSuccess ? r.data.ms : undefined,
      profile,
    }
  })
  return <ServiceTopologyOverview services={services} />
}