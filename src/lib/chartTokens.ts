/**
 * SVG chart colors — use CSS variables from index.css / theme.
 * Discovery and risk charts import these instead of hard-coded hex.
 */
export const chartTokens = {
  profitFill: 'var(--color-success-soft)',
  lossFill: 'var(--color-danger-soft)',
  line: 'var(--foreground)',
  grid: 'var(--border)',
  axis: 'var(--color-border-strong)',
  accent: 'var(--primary)',
} as const

export const chartSurfaceFill = 'var(--card)'
export const chartAxisTickFill = 'var(--muted-foreground)'
export const chartAxisTitleFill = 'var(--color-border-strong)'
