import { useQueryClient } from '@tanstack/react-query'
import { PageHeader, PageShell } from '@/components/layout'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger, TabsPanel, TabsPanelContent } from '@/components/ui/tabs'
import { RefreshCw } from 'lucide-react'
import {
  ARCH_SERVICES,
  ACCOUNT_SERVICES,
  RESEARCH_SERVICES,
  MASSIVE_SERVICES,
} from './apiHealth/apiHealthConfig'
import {
  TabLamp,
  CategoryTabContent,
  ArchDetailsPanel,
  AccountDetailsPanel,
  ResearchDetailsPanel,
  MassiveDetailsPanel,
  ServiceTopologyPanel,
} from './apiHealth/apiHealthSections'

export default function ApiHealthPage() {
  const qc = useQueryClient()

  function refreshAll() {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.settings.apiHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.settings.apiHealthMassive })
  }

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="API Services"
        titleSize="large"
        description="Health status for all 9 FastAPI microservices · auto-refresh every 20 s"
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5 shrink-0">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        }
      />

      <ServiceTopologyPanel />

      <Tabs defaultValue="architecture">
        <TabsPanel>
          <TabsList variant="line" className="bg-muted/20 px-2">
            <TabsTrigger value="architecture" className="gap-2">
              <TabLamp services={ARCH_SERVICES} />
              Architecture
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <TabLamp services={ACCOUNT_SERVICES} />
              Account
            </TabsTrigger>
            <TabsTrigger value="research" className="gap-2">
              <TabLamp services={RESEARCH_SERVICES} />
              Research
            </TabsTrigger>
            <TabsTrigger value="massive" className="gap-2">
              <TabLamp services={MASSIVE_SERVICES} />
              Massive
            </TabsTrigger>
          </TabsList>

          <TabsPanelContent>
            <TabsContent value="architecture">
              <CategoryTabContent services={ARCH_SERVICES} detailsPanel={<ArchDetailsPanel />} />
            </TabsContent>
            <TabsContent value="account">
              <CategoryTabContent services={ACCOUNT_SERVICES} detailsPanel={<AccountDetailsPanel />} />
            </TabsContent>
            <TabsContent value="research">
              <CategoryTabContent services={RESEARCH_SERVICES} detailsPanel={<ResearchDetailsPanel />} />
            </TabsContent>
            <TabsContent value="massive">
              <CategoryTabContent services={MASSIVE_SERVICES} detailsPanel={<MassiveDetailsPanel />} />
            </TabsContent>
          </TabsPanelContent>
        </TabsPanel>
      </Tabs>
    </PageShell>
  )
}
