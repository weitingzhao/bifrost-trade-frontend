import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Compass, Radar, Sparkles, Zap } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  SepaDailyCoreActions,
  SepaDailyCoreBody,
} from './SepaDailyCorePage'
import {
  MomentumRadarActions,
  MomentumRadarBody,
} from './MomentumRadarPage'
import {
  EventRadarActions,
  EventRadarBody,
} from './EventRadarPage'

type TabKey = 'sepa' | 'momentum' | 'events' | 'rules'

const TAB_LABELS: Record<TabKey, { label: string; description: string; icon: typeof Compass }> = {
  sepa: {
    label: 'SEPA',
    description: 'Minervini SEPA — Fundamental · Trend Template · Momentum · Options Structure',
    icon: Compass,
  },
  momentum: {
    label: 'Momentum',
    description: 'A+/A/B/C/D grade — trend deviation · volume · VWAP · sector RS',
    icon: Radar,
  },
  events: {
    label: 'Events',
    description: 'Catalyst radar — earnings · news · themes · forward calendar',
    icon: Zap,
  },
  rules: {
    label: 'Rules',
    description: 'Free-form multi-condition screening (SEPA · Technical · Extended catalogs)',
    icon: BookOpen,
  },
}

const VALID_TABS: TabKey[] = ['sepa', 'momentum', 'events', 'rules']

function isTabKey(v: string | null): v is TabKey {
  return v != null && (VALID_TABS as string[]).includes(v)
}

export default function StockExplorerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawTab = searchParams.get('tab')
  const active: TabKey = isTabKey(rawTab) ? rawTab : 'sepa'

  const onTabChange = useCallback(
    (v: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (v === 'sepa') {
            next.delete('tab')
          } else {
            next.set('tab', v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const description = useMemo(() => TAB_LABELS[active].description, [active])

  const actions = useMemo(() => {
    if (active === 'sepa') return <SepaDailyCoreActions />
    if (active === 'momentum') return <MomentumRadarActions />
    if (active === 'events') return <EventRadarActions />
    return null
  }, [active])

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title="Stock Explorer"
        description={description}
        actions={actions}
      />

      <Tabs value={active} onValueChange={onTabChange}>
        <TabsList variant="line" className="px-0">
          {VALID_TABS.map((key) => {
            const meta = TAB_LABELS[key]
            const Icon = meta.icon
            return (
              <TabsTrigger key={key} value={key}>
                <Icon className="size-3.5" aria-hidden />
                {meta.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="sepa" className="mt-3 outline-none">
          <SepaDailyCoreBody />
        </TabsContent>

        <TabsContent value="momentum" className="mt-3 outline-none">
          <MomentumRadarBody />
        </TabsContent>

        <TabsContent value="events" className="mt-3 outline-none">
          <EventRadarBody />
        </TabsContent>

        <TabsContent value="rules" className="mt-3 outline-none">
          <RulesLandingCard />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}

function RulesLandingCard() {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-3 px-4 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-dense-body font-semibold">Rule-based screening</h2>
        </div>
        <p className="text-dense-meta text-muted-foreground">
          Compose free-form filters across SEPA · Technical · Extended catalogs, drill into
          readiness snapshots per symbol, and load results directly into the Inspector Drawer.
          The full Stock Screener lives on its own page for the extra vertical space.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to="/research/stock-screener">Open Stock Screener</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/research/loop/candidates">Candidate Pool</Link>
          </Button>
        </div>
        <p className="text-dense-caption text-muted-foreground">
          Tip: promote screener results to the Candidate Pool with the <kbd>+</kbd> action, then
          come back to Explorer → SEPA / Momentum / Events for cross-cutting views.
        </p>
      </CardContent>
    </Card>
  )
}
