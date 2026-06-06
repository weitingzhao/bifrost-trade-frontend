import { useEffect, useMemo } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RightInspectorHeader } from '@/components/layout/RightInspectorHeader'
import { RightInspectorShell } from '@/components/layout/RightInspectorShell'
import { inspectorShell } from '@/components/layout/rightInspectorUi'
import { InstanceDetailPanel } from '@/components/strategy/InstanceDetailPanel'
import { useStrategyInstance } from '@/hooks/useStrategies'
import { useWindowWidth } from '@/hooks/useIsNarrowViewport'
import { INSTANCE_COMPARE_MAX_WIDTH_PX } from '@/constants/instanceDetailSidebar'
import type { StrategyInstance } from '@/types/positions'
import type { RiskProfile } from '@/utils/riskProfile'
import layoutStyles from '@/components/strategy/instances/instancesLayout.module.css'

export interface InstanceDetailSidebarProps {
  open: boolean
  onClose: () => void
  /** Resolved instance when already in list cache */
  instance?: StrategyInstance | null
  /** Fetch by id when `instance` is not provided */
  instanceId?: number | null
  compareInstance?: StrategyInstance | null
  /** Parent list still loading while URL/detail id is set */
  listLoading?: boolean
  /** Id not found after list loaded */
  notFound?: boolean
  /** Compare mode panel width override */
  panelWidthPx?: number
  /** When set (e.g. from Positions inspector), overrides execution-based risk profile. */
  riskProfile?: RiskProfile | null
}

export function InstanceDetailSidebar({
  open,
  onClose,
  instance: instanceProp,
  instanceId,
  compareInstance,
  listLoading = false,
  notFound = false,
  panelWidthPx: panelWidthPxProp,
  riskProfile,
}: InstanceDetailSidebarProps) {
  const windowWidth = useWindowWidth()

  const resolvedId = instanceProp?.strategy_instance_id ?? instanceId ?? null
  const shouldFetch =
    open &&
    instanceProp == null &&
    resolvedId != null &&
    !listLoading &&
    !notFound

  const { data: fetched, isLoading: fetchLoading, isError } = useStrategyInstance(
    shouldFetch ? resolvedId : undefined,
    shouldFetch,
  )

  const instance = instanceProp ?? fetched ?? null
  const loading = listLoading || (shouldFetch && fetchLoading)
  const missing =
    notFound || (shouldFetch && !fetchLoading && (isError || instance == null))

  const isCompareMode =
    compareInstance != null &&
    instance != null &&
    compareInstance.strategy_instance_id !== instance.strategy_instance_id

  const panelWidthPx = useMemo(() => {
    if (panelWidthPxProp != null) return panelWidthPxProp
    if (isCompareMode) return Math.min(INSTANCE_COMPARE_MAX_WIDTH_PX, windowWidth - 40)
    return undefined
  }, [panelWidthPxProp, isCompareMode, windowWidth])

  const headerTitle =
    instance?.label?.trim() ||
    instance?.strategy_opportunity_name?.trim() ||
    'Strategy Instance'

  const headerMeta =
    isCompareMode && compareInstance != null && resolvedId != null
      ? `· #${resolvedId} vs #${compareInstance.strategy_instance_id}`
      : resolvedId != null
        ? `· #${resolvedId}`
        : undefined

  useEffect(() => {
    if (!open) return
    const onKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        evt.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <RightInspectorShell
      open
      ariaLabel="Strategy instance detail"
      panelWidthPx={panelWidthPx}
    >
      <RightInspectorHeader
        title={headerTitle}
        meta={headerMeta}
        onClose={onClose}
        closeLabel="Close strategy instance detail"
      />
      {missing ? (
        <div className={inspectorShell.section}>
          <Alert variant="destructive">
            <AlertDescription>Instance not found.</AlertDescription>
          </Alert>
        </div>
      ) : loading || instance == null ? (
        <div className={`${inspectorShell.section} space-y-3`} aria-busy="true">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : isCompareMode && compareInstance != null ? (
        <div className={layoutStyles.compareSplit}>
          <div className={layoutStyles.comparePane}>
            <InstanceDetailPanel instance={instance} riskProfile={riskProfile} />
          </div>
          <div className={layoutStyles.compareDivider} aria-hidden />
          <div className={layoutStyles.comparePane}>
            <InstanceDetailPanel instance={compareInstance} />
          </div>
        </div>
      ) : (
        <InstanceDetailPanel instance={instance} riskProfile={riskProfile} />
      )}
    </RightInspectorShell>
  )
}
