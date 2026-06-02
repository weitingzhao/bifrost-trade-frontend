import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { PageHeader, PageShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Tabs, TabsContent, TabsList, TabsPanel, TabsPanelContent, TabsTrigger } from '@/components/ui/tabs'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { ApiCategoryTabContent } from './apiHealth/ApiCategoryTabContent'
import { ApiEnvHealthGrid } from './apiHealth/ApiEnvHealthGrid'
import {
  ACCOUNT_SERVICES,
  ARCH_SERVICES,
  MASSIVE_SERVICES,
  RESEARCH_SERVICES,
} from './apiHealth/apiHealthConfig'
import type { ServiceDef } from './apiHealth/apiHealthConfig'
import type { ApiShutdownConfig } from './apiHealth/apiHealthShutdown'
import { apiHealthOverviewCardClass } from './apiHealth/apiHealthUi'
import { TabLamp } from './apiHealth/TabLamp'
import { AccountDetailsPanel } from './apiHealth/panels/AccountDetailsPanel'
import { ArchDetailsPanel } from './apiHealth/panels/ArchDetailsPanel'
import { MassiveDetailsPanel } from './apiHealth/panels/MassiveDetailsPanel'
import { ResearchDetailsPanel } from './apiHealth/panels/ResearchDetailsPanel'

const API_HEALTH_INFO =
  'Health probes for all 9 FastAPI microservices. Services Overview shows configured routes and Dev/Prod probes. Open the global Reactor Map from the sidebar footer for full-stack topology. Auto-refresh every 20 s.'

interface ShutdownConfirmState {
  open: boolean
  confirming: boolean
  error: string | null
  svc: ServiceDef | null
  cfg: ApiShutdownConfig | null
}

const INITIAL_CONFIRM: ShutdownConfirmState = {
  open: false,
  confirming: false,
  error: null,
  svc: null,
  cfg: null,
}

export default function ApiHealthPage() {
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState<ShutdownConfirmState>(INITIAL_CONFIRM)
  const [shutdownMsgs, setShutdownMsgs] = useState<Record<string, string>>({})
  const [forceDownKeys, setForceDownKeys] = useState<Set<string>>(new Set())

  function refreshAll() {
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.settings.apiHealth })
    void qc.invalidateQueries({ queryKey: QUERY_KEYS.settings.apiHealthMassive })
    void qc.invalidateQueries({ queryKey: ['settings', 'api-health', 'env-overview'] })
  }

  const onRequestShutdown = useCallback((svc: ServiceDef, cfg: ApiShutdownConfig) => {
    setConfirm({ open: true, confirming: false, error: null, svc, cfg })
  }, [])

  async function runShutdown() {
    if (!confirm.svc || !confirm.cfg) return
    setConfirm((s) => ({ ...s, confirming: true, error: null }))
    const res = await confirm.cfg.post()
    if (res.ok) {
      const key = confirm.svc.key
      setShutdownMsgs((m) => ({
        ...m,
        [key]: `${confirm.cfg!.label} stop requested. Refresh or run: ${confirm.cfg!.scriptHint}`,
      }))
      setForceDownKeys((prev) => new Set(prev).add(key))
      setConfirm(INITIAL_CONFIRM)
      window.setTimeout(() => {
        void qc.invalidateQueries({ queryKey: [...QUERY_KEYS.settings.apiHealth, key] })
      }, 4000)
    } else {
      setConfirm((s) => ({
        ...s,
        confirming: false,
        error: res.error?.trim() || 'Shut down failed',
      }))
    }
  }

  return (
    <PageShell padding="default" className="space-y-3">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1">
            API Services
            <InfoTooltip text={API_HEALTH_INFO} />
          </span>
        }
        titleSize="large"
        description="Health status for all 9 FastAPI microservices · auto-refresh every 20 s"
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll} className="shrink-0 gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </Button>
        }
      />

      <Card variant="elevated" size="sm" className={apiHealthOverviewCardClass}>
        <ApiEnvHealthGrid />
      </Card>

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
            <Card variant="elevated" size="sm" className="p-4">
              <TabsContent value="architecture">
                <ApiCategoryTabContent
                  services={ARCH_SERVICES}
                  detailsPanel={<ArchDetailsPanel />}
                  showOpsAuth
                  shutdownMsgs={shutdownMsgs}
                  forceDownKeys={forceDownKeys}
                  onRequestShutdown={onRequestShutdown}
                />
              </TabsContent>
              <TabsContent value="account">
                <ApiCategoryTabContent
                  services={ACCOUNT_SERVICES}
                  detailsPanel={<AccountDetailsPanel />}
                  shutdownMsgs={shutdownMsgs}
                  forceDownKeys={forceDownKeys}
                  onRequestShutdown={onRequestShutdown}
                />
              </TabsContent>
              <TabsContent value="research">
                <ApiCategoryTabContent
                  services={RESEARCH_SERVICES}
                  detailsPanel={<ResearchDetailsPanel />}
                  shutdownMsgs={shutdownMsgs}
                  forceDownKeys={forceDownKeys}
                  onRequestShutdown={onRequestShutdown}
                />
              </TabsContent>
              <TabsContent value="massive">
                <ApiCategoryTabContent
                  services={MASSIVE_SERVICES}
                  detailsPanel={<MassiveDetailsPanel />}
                  shutdownMsgs={shutdownMsgs}
                  forceDownKeys={forceDownKeys}
                  onRequestShutdown={onRequestShutdown}
                />
              </TabsContent>
            </Card>
          </TabsPanelContent>
        </TabsPanel>
      </Tabs>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.cfg ? `Shut down ${confirm.cfg.label}` : 'Shut down API'}
        message={
          confirm.cfg
            ? `This will request a graceful shutdown of the ${confirm.cfg.label} process. After stopping, restart with: ${confirm.cfg.scriptHint}`
            : ''
        }
        confirmLabel="Shut down"
        confirming={confirm.confirming}
        bodyExtra={
          confirm.error ? (
            <p className="text-sm text-destructive">{confirm.error}</p>
          ) : confirm.cfg?.requiresOpsToken ? (
            <p className="text-sm text-muted-foreground">
              Requires an Ops API token with operator or admin role (set via Authenticate above).
            </p>
          ) : null
        }
        onConfirm={() => void runShutdown()}
        onCancel={() => {
          if (!confirm.confirming) setConfirm(INITIAL_CONFIRM)
        }}
      />
    </PageShell>
  )
}
