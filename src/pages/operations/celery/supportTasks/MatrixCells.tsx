import { InfoTooltip } from '@/components/ui/InfoTooltip'
import type { RunMassiveJobMatrixRow } from '@/types/ops'
import type { MatrixModeColumnVisibility } from './supportTasksFilters'

export function MatrixModeCell({
  row,
  visibility,
}: {
  row: RunMassiveJobMatrixRow
  visibility: MatrixModeColumnVisibility
}) {
  const { showMode, showModeSource } = visibility
  if (!showMode && !showModeSource) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="space-y-0.5 text-xs">
      {showMode && (
        <div>{row.mode != null ? <code className="font-mono">{row.mode}</code> : '—'}</div>
      )}
      {showModeSource && (
        <div className="text-muted-foreground">
          <code className="font-mono text-dense-caption">{row.mode_source}</code>
        </div>
      )}
    </div>
  )
}

function EffectsBullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-4 space-y-0.5 text-dense-meta text-muted-foreground">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}

type EffectsVisibility = {
  showFeedApi: boolean
  showDb: boolean
  showRedis: boolean
}

export function MatrixEffectsStacked({
  row,
  visibility,
}: {
  row: RunMassiveJobMatrixRow
  visibility: EffectsVisibility
}) {
  const feed = row.feed_apis ?? []
  const db = row.db_tables ?? []
  const redis = row.redis_nodes ?? []
  const showFeed = visibility.showFeedApi && feed.length > 0
  const showDb = visibility.showDb && db.length > 0
  const showRedis = visibility.showRedis && redis.length > 0

  if (!showFeed && !showDb && !showRedis) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="space-y-2 text-xs">
      {showFeed && (
        <div>
          <div className="flex items-center gap-1 font-medium text-foreground/80 mb-0.5">
            Feed API
            <InfoTooltip text="Massive / Polygon REST endpoints used in this job path." />
          </div>
          <EffectsBullets items={feed} />
        </div>
      )}
      {showDb && (
        <div>
          <div className="flex items-center gap-1 font-medium text-foreground/80 mb-0.5">
            DB
            <InfoTooltip text="PostgreSQL tables written or refreshed by this path." />
          </div>
          <EffectsBullets items={db} />
        </div>
      )}
      {showRedis && (
        <div>
          <div className="flex items-center gap-1 font-medium text-foreground/80 mb-0.5">
            Redis
            <InfoTooltip text="Redis key patterns or logical nodes used by this path." />
          </div>
          <EffectsBullets items={redis} />
        </div>
      )}
    </div>
  )
}
