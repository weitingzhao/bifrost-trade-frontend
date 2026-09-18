export const DIM_TYPES = ['direction', 'structure', 'coverage', 'risk', 'volatility', 'time'] as const
export type DimType = typeof DIM_TYPES[number]

export const DIM_LABELS: Record<DimType, string> = {
  direction: 'Direction',
  structure: 'Structure',
  coverage: 'Coverage',
  risk: 'Risk',
  volatility: 'Volatility',
  time: 'Time',
}

export const DIM_ICONS: Record<DimType, string> = {
  direction: '↕',
  structure: '⬡',
  coverage: '◎',
  risk: '⚡',
  volatility: '〰',
  time: '⏱',
}
