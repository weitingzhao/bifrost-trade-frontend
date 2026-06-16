import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { EnvBadge } from './EnvBadge'
import type { UtilizedServiceRow } from '@/utils/utilizedServices'
import {
  apiHealthConfiguredCatLabelClass,
  apiHealthConfiguredCategoryClass,
  apiHealthConfiguredChipClass,
  apiHealthConfiguredChipsClass,
  apiHealthConfiguredServiceNameClass,
  apiHealthConfiguredStripClass,
  apiHealthEmptyHintClass,
} from './apiHealthEnvUi'
import { apiHealthSectionTitleClass } from './apiHealthUi'

function formatServiceLabel(service: string): string {
  const t = service.toLowerCase()
  if (t === 'massive') return 'Massive'
  if (t === 'docs') return 'Docs'
  if (t === 'ops') return 'Ops'
  if (t === 'research') return 'Research'
  if (t === 'server' || t === 'main' || t === 'api' || t === 'monitor') return 'Monitor'
  if (t === 'trading') return 'Trading'
  if (t === 'strategy') return 'Strategy'
  if (t === 'portfolio') return 'Portfolio'
  if (t === 'market') return 'Market'
  if (t === 'ib') return 'IB'
  return service.charAt(0).toUpperCase() + service.slice(1)
}

const GROUP_ORDER = ['Architecture', 'Account', 'Research', 'Feed', 'Other'] as const

function configuredServiceGroup(service: string): (typeof GROUP_ORDER)[number] {
  const k = service.toLowerCase()
  if (['server', 'main', 'api', 'monitor', 'ops', 'docs'].includes(k)) return 'Architecture'
  if (['trading', 'portfolio'].includes(k)) return 'Account'
  if (['research', 'strategy', 'market'].includes(k)) return 'Research'
  if (['massive', 'ib'].includes(k)) return 'Feed'
  return 'Other'
}

function groupRows(rows: UtilizedServiceRow[]): Array<{ title: string; rows: UtilizedServiceRow[] }> {
  const buckets: Record<string, UtilizedServiceRow[]> = {
    Architecture: [],
    Account: [],
    Research: [],
    Feed: [],
    Other: [],
  }
  for (const r of rows) {
    buckets[configuredServiceGroup(r.service)].push(r)
  }
  return GROUP_ORDER.filter((t) => buckets[t].length > 0).map((t) => ({
    title: t,
    rows: buckets[t],
  }))
}

function envProfile(env: string): 'dev' | 'prod' | null {
  const t = env.toLowerCase().trim()
  if (t === 'dev' || t === 'development') return 'dev'
  if (t === 'prod' || t === 'production') return 'prod'
  return null
}

export function ApiConfiguredRoutesStrip({
  utilizedServices,
}: {
  utilizedServices: UtilizedServiceRow[]
}) {
  return (
    <div className={apiHealthConfiguredStripClass} aria-labelledby="api-health-configured-head">
      <h4 id="api-health-configured-head" className={apiHealthSectionTitleClass}>
        Configured routes
        <InfoTooltip text="From YAML utilized.services: map service keys (server/monitor, ops, docs, market, trading, portfolio, research, strategy, massive, ib, …) to dev or prod. Shown under Architecture, Account, Research, and Feed. Restart bifrost-server after YAML changes." />
      </h4>
      {utilizedServices.length === 0 ? (
        <p className={apiHealthEmptyHintClass}>
          No utilized.services in config, or bifrost-server did not return them (unreachable / timed out).
        </p>
      ) : (
        <div role="list" className="space-y-3">
          {groupRows(utilizedServices).map((g) => (
            <div key={g.title} className={apiHealthConfiguredCategoryClass} role="listitem">
              <span className={apiHealthConfiguredCatLabelClass}>{g.title}</span>
              <div className={apiHealthConfiguredChipsClass} role="group" aria-label={g.title}>
                {g.rows.map((row) => {
                  const profile = envProfile(row.env)
                  return (
                    <div
                      key={`${row.service}-${row.env}`}
                      className={apiHealthConfiguredChipClass}
                      title={`${formatServiceLabel(row.service)} → ${row.env}`}
                    >
                      <span className={apiHealthConfiguredServiceNameClass}>
                        {formatServiceLabel(row.service)}
                      </span>
                      {profile ? (
                        <EnvBadge profile={profile} ok />
                      ) : (
                        <span className="text-muted-foreground text-dense-caption">{row.env}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
