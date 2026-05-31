import { STRESS_METHODOLOGY_SECTIONS } from '@/utils/modelAnalysisExplain'
import styles from '../modelAnalysis.module.css'

export function StressMethodologyIntro() {
  return (
    <div className={styles.methodologyBlock}>
      <p className={styles.prose}>
        Stress P&amp;L is a <strong>what-if</strong> grid, not a forecast. Theory:
      </p>
      <ul className={styles.methodologyList}>
        {STRESS_METHODOLOGY_SECTIONS.map(s => (
          <li key={s.title}>
            <strong>{s.title}.</strong> {s.body}
          </li>
        ))}
      </ul>
    </div>
  )
}
