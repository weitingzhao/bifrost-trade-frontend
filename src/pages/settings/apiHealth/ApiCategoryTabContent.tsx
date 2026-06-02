import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { fetchOpsCapabilities, getOpsToken } from '@/api/ops'
import { OpsAuthBar } from '@/pages/settings/socket/OpsAuthBar'
import { ApiDocsTable } from './ApiDocsTable'
import { ApiServiceHealthCard } from './ApiServiceHealthCard'
import type { ServiceDef } from './apiHealthConfig'
import { API_SHUTDOWN_BY_KEY, type ApiShutdownConfig } from './apiHealthShutdown'
import {
  apiHealthCategoryContentClass,
  apiHealthDetailsSectionClass,
  apiHealthDocsSectionClass,
  apiHealthElevatedSectionClass,
  apiHealthSectionTitleClass,
  apiHealthServiceGridClass,
  apiHealthServiceGridWrapClass,
} from './apiHealthUi'

export function ApiCategoryTabContent({
  services,
  detailsPanel,
  showOpsAuth,
  shutdownMsgs,
  forceDownKeys,
  onRequestShutdown,
}: {
  services: ServiceDef[]
  detailsPanel: ReactNode
  showOpsAuth?: boolean
  shutdownMsgs?: Record<string, string>
  forceDownKeys?: Set<string>
  onRequestShutdown?: (svc: ServiceDef, cfg: ApiShutdownConfig) => void
}) {
  const [token, setToken] = useState(() => getOpsToken())
  const { data: caps, refetch: refetchCaps } = useQuery({
    queryKey: ['settings', 'api-health', 'ops-caps', token] as const,
    queryFn: () => fetchOpsCapabilities(token),
    enabled: showOpsAuth === true,
    staleTime: 30_000,
  })

  return (
    <div className={apiHealthCategoryContentClass}>
      {showOpsAuth ? (
        <div className="flex justify-end">
          <OpsAuthBar
            token={token}
            caps={caps}
            onTokenChange={setToken}
            onRefresh={() => void refetchCaps()}
          />
        </div>
      ) : null}

      <div className={cn(apiHealthServiceGridWrapClass, apiHealthServiceGridClass(services.length))}>
        {services.map((svc) => (
          <ApiServiceHealthCard
            key={svc.key}
            svc={svc}
            shutdown={API_SHUTDOWN_BY_KEY[svc.key]}
            shutdownMsg={shutdownMsgs?.[svc.key] ?? null}
            forceDown={forceDownKeys?.has(svc.key)}
            onRequestShutdown={onRequestShutdown}
          />
        ))}
      </div>

      <Separator />

      <Card variant="elevated" size="sm" className={apiHealthElevatedSectionClass}>
        <div className={apiHealthDocsSectionClass}>
          <h3 className={apiHealthSectionTitleClass}>Documentation</h3>
          <ApiDocsTable services={services} />
        </div>
      </Card>

      <Card variant="elevated" size="sm" className={apiHealthElevatedSectionClass}>
        <div className={apiHealthDetailsSectionClass}>
          <h3 className={apiHealthSectionTitleClass}>API Details</h3>
          {detailsPanel}
        </div>
      </Card>
    </div>
  )
}
