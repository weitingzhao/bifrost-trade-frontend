import { useStockBenchmark } from '@/hooks/useStockBenchmark'
import { fmtUsd } from '@/utils/positions'
import styles from './stock-inspector.module.css'
import { inspectorShell } from '@/components/layout/rightInspectorUi'

interface Props {
  symbol: string
}

export function StockBenchmarkSection({ symbol }: Props) {
  const { data: benchClose, isLoading } = useStockBenchmark(symbol, true)

  return (
    <section className={inspectorShell.section} aria-labelledby="stock-inspector-benchmark">
      <div id="stock-inspector-benchmark" className={inspectorShell.sectionTitle}>
        <span>Daily benchmark</span>
      </div>
      {isLoading && <p className={styles.hint}>Loading stock_day close…</p>}
      {!isLoading && benchClose != null && (
        <div className={styles.kvGrid}>
          <span className={styles.kvKey}>stock_day close</span>
          <span>{fmtUsd(benchClose)}</span>
        </div>
      )}
      {!isLoading && benchClose == null && (
        <p className={styles.hint}>No benchmark bar for this symbol.</p>
      )}
    </section>
  )
}
