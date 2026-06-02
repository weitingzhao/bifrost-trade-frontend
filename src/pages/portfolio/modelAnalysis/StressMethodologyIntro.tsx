import { STRESS_METHODOLOGY_SECTIONS } from '@/utils/modelAnalysisExplain'
import {
  modelAnalysisMethodologyBlockClass,
  modelAnalysisMethodologyListClass,
  modelAnalysisProseClass,
} from './modelAnalysisUi'

export function StressMethodologyIntro() {
  return (
    <div className={modelAnalysisMethodologyBlockClass}>
      <p className={modelAnalysisProseClass}>
        Stress P&amp;L is a <strong>what-if</strong> grid, not a forecast. Theory:
      </p>
      <ul className={modelAnalysisMethodologyListClass}>
        {STRESS_METHODOLOGY_SECTIONS.map(s => (
          <li key={s.title}>
            <strong>{s.title}.</strong> {s.body}
          </li>
        ))}
      </ul>
    </div>
  )
}
