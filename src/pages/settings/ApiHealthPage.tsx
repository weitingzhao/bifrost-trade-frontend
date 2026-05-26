import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExternalLink, RefreshCw } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceDef {
  key: string
  name: string
  base: string
  port: string
  description: string
}

interface ProbeResult {
  ms: number
  body: unknown
}

type Lamp = 'green' | 'yellow' | 'red'

// ── Service definitions ───────────────────────────────────────────────────────

const ARCH_SERVICES: ServiceDef[] = [
  { key: 'monitor',  name: 'Monitor',   base: import.meta.env.VITE_API_MONITOR  as string, port: '8765', description: 'Daemon status & control' },
  { key: 'ops',      name: 'Ops',       base: import.meta.env.VITE_API_OPS      as string, port: '8766', description: 'Celery management' },
  { key: 'docs',     name: 'Docs',      base: import.meta.env.VITE_API_DOCS     as string, port: '8767', description: 'OpenAPI gateway' },
]

const ACCOUNT_SERVICES: ServiceDef[] = [
  { key: 'trading',   name: 'Trading',   base: import.meta.env.VITE_API_TRADING   as string, port: '8769', description: 'Orders & positions' },
  { key: 'portfolio', name: 'Portfolio', base: import.meta.env.VITE_API_PORTFOLIO as string, port: '8771', description: 'Multi-account Greeks' },
]

const RESEARCH_SERVICES: ServiceDef[] = [
  { key: 'research', name: 'Research', base: import.meta.env.VITE_API_RESEARCH as string, port: '8773', description: 'SEPA screener & backtest' },
  { key: 'strategy', name: 'Strategy', base: import.meta.env.VITE_API_STRATEGY as string, port: '8770', description: 'Strategy gate' },
  { key: 'market',   name: 'Market',   base: import.meta.env.VITE_API_MARKET   as string, port: '8772', description: 'Real-time quotes SSE' },
]

const MASSIVE_SERVICES: ServiceDef[] = [
  { key: 'massive', name: 'Massive', base: import.meta.env.VITE_API_MASSIVE as string, port: '8741', description: 'Polygon data query' },
]

const ALL_SERVICES: ServiceDef[] = [
  ...ARCH_SERVICES,
  ...ACCOUNT_SERVICES,
  ...RESEARCH_SERVICES,
  ...MASSIVE_SERVICES,
]

// ── Query helpers ─────────────────────────────────────────────────────────────

function makeProbeQuery(svc: ServiceDef) {
  return {
    queryKey: ['api-health', svc.key] as const,
    queryFn: async (): Promise<ProbeResult> => {
      const start = performance.now()
      const res = await fetch(`${svc.base}/health`, {
        signal: AbortSignal.timeout(10_000),
      })
      const ms = Math.round(performance.now() - start)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body: unknown = await res.json().catch(() => null)
      return { ms, body }
    },
    refetchInterval: 20_000,
    retry: 1,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LampDot({ lamp, size = 'sm' }: { lamp: Lamp; size?: 'sm' | 'md' }) {
  const base = size === 'md' ? 'w-3 h-3' : 'w-2.5 h-2.5'
  const color = lamp === 'green' ? 'bg-green-500' : lamp === 'red' ? 'bg-red-500' : 'bg-yellow-400'
  return <span className={`inline-block ${base} rounded-full ${color} shrink-0`} />
}

function worstLamp(lamps: Lamp[]): Lamp {
  if (lamps.includes('red')) return 'red'
  if (lamps.includes('yellow')) return 'yellow'
  return 'green'
}

function TabLamp({ services }: { services: ServiceDef[] }) {
  const results = useQueries({ queries: services.map(makeProbeQuery) })
  const lamps: Lamp[] = results.map(r =>
    r.isPending ? 'yellow' : r.isError ? 'red' : 'green',
  )
  return <LampDot lamp={worstLamp(lamps)} />
}

function ServiceRow({ svc }: { svc: ServiceDef }) {
  const { data, isPending, isError, error } = useQuery(makeProbeQuery(svc))

  const lamp: Lamp = isPending ? 'yellow' : isError ? 'red' : 'green'
  const statusText = isPending
    ? 'Checking…'
    : isError
    ? String((error as Error)?.message ?? 'Error')
    : `OK · ${data!.ms} ms`
  const statusColor =
    lamp === 'green'
      ? 'text-green-600 dark:text-green-400'
      : lamp === 'red'
      ? 'text-red-500'
      : 'text-yellow-500'

  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <LampDot lamp={lamp} size="md" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{svc.name}</span>
        <span className="text-muted-foreground text-xs ml-2">{svc.description}</span>
        <span className="text-muted-foreground/60 text-xs ml-2 tabular-nums">{svc.base}</span>
      </div>
      <span className={`text-xs tabular-nums font-mono ${statusColor}`}>{statusText}</span>
      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" asChild>
        <a href={`${svc.base}/docs`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Docs
        </a>
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" asChild>
        <a href={`${svc.base}/health`} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
          Health
        </a>
      </Button>
    </div>
  )
}

function ServicesPanel({ services }: { services: ServiceDef[] }) {
  return (
    <Card>
      <CardContent className="px-4 py-0">
        {services.map(svc => (
          <ServiceRow key={svc.key} svc={svc} />
        ))}
      </CardContent>
    </Card>
  )
}

// ── Summary overview row ──────────────────────────────────────────────────────

function OverviewRow() {
  const results = useQueries({ queries: ALL_SERVICES.map(makeProbeQuery) })

  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {ALL_SERVICES.map((svc, i) => {
        const r = results[i]
        const lamp: Lamp = r.isPending ? 'yellow' : r.isError ? 'red' : 'green'
        return (
          <div key={svc.key} className="flex items-center gap-1.5">
            <LampDot lamp={lamp} />
            <span className="text-xs text-muted-foreground">{svc.name}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApiHealthPage() {
  const qc = useQueryClient()

  function refreshAll() {
    void qc.invalidateQueries({ queryKey: ['api-health'] })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">API Services</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Health status for all 9 FastAPI microservices · auto-refresh every 20 s
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5 shrink-0">
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Compact overview — all 9 lamps at a glance */}
      <Card>
        <CardContent className="px-4 py-3">
          <OverviewRow />
        </CardContent>
      </Card>

      <Tabs defaultValue="architecture">
        <TabsList className="gap-1">
          <TabsTrigger value="architecture" className="gap-1.5">
            <TabLamp services={ARCH_SERVICES} />
            Architecture
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-1.5">
            <TabLamp services={ACCOUNT_SERVICES} />
            Account
          </TabsTrigger>
          <TabsTrigger value="research" className="gap-1.5">
            <TabLamp services={RESEARCH_SERVICES} />
            Research
          </TabsTrigger>
          <TabsTrigger value="massive" className="gap-1.5">
            <TabLamp services={MASSIVE_SERVICES} />
            Massive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="architecture" className="mt-4">
          <ServicesPanel services={ARCH_SERVICES} />
        </TabsContent>
        <TabsContent value="account" className="mt-4">
          <ServicesPanel services={ACCOUNT_SERVICES} />
        </TabsContent>
        <TabsContent value="research" className="mt-4">
          <ServicesPanel services={RESEARCH_SERVICES} />
        </TabsContent>
        <TabsContent value="massive" className="mt-4">
          <ServicesPanel services={MASSIVE_SERVICES} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
