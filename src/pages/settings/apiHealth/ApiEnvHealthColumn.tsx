import type { EnvColumnState } from '@/utils/apiHealthEnv'
import {
  apiHealthDiagramClass,
  apiHealthDiagramDetailClass,
  apiHealthDiagramLabelClass,
  apiHealthDiagramLineClass,
  apiHealthDiagramNodeClass,
  apiHealthDiagramStepClass,
  apiHealthEnvColumnClass,
  apiHealthEnvColumnHeadClass,
  apiHealthEnvGroupClass,
  apiHealthEnvGroupTitleClass,
  apiHealthEnvHintClass,
  apiHealthEnvOriginClass,
  apiHealthEnvTitleClass,
  apiHealthEmptyHintClass,
} from './apiHealthEnvUi'

export function ApiEnvHealthColumn({ column }: { column: EnvColumnState }) {
  return (
    <div className={apiHealthEnvColumnClass}>
      <div className={apiHealthEnvColumnHeadClass}>
        <h4 className={apiHealthEnvTitleClass}>{column.title}</h4>
        <span className={apiHealthEnvOriginClass}>{column.display ?? 'Not configured'}</span>
      </div>
      {column.hint ? (
        <p className={apiHealthEnvHintClass}>{column.hint}</p>
      ) : (
        <>
          {column.groups.map((g) => (
            <div key={g.title} className={apiHealthEnvGroupClass}>
              <h5 className={apiHealthEnvGroupTitleClass}>{g.title}</h5>
              <div className={apiHealthDiagramClass}>
                {g.rows.map((row, i) => (
                  <div key={row.label}>
                    {i > 0 ? <div className={apiHealthDiagramLineClass} /> : null}
                    <div className={apiHealthDiagramStepClass}>
                      <div
                        className={apiHealthDiagramNodeClass(row.lamp)}
                        title={row.detail}
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className={apiHealthDiagramLabelClass}>{row.label}</div>
                        <div className={apiHealthDiagramDetailClass}>{row.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {column.groups.length === 0 ? (
            <p className={apiHealthEmptyHintClass}>Checking…</p>
          ) : null}
        </>
      )}
    </div>
  )
}
