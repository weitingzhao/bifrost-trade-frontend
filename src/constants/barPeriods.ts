export const BAR_PERIODS = [
  { value: '1 D', label: 'Daily' },
  { value: '1 min', label: '1 min' },
  { value: '5 mins', label: '5 min' },
  { value: '1 hour', label: '1 hour' },
] as const

export const ALL_BAR_PERIOD_VALUES = BAR_PERIODS.map(p => p.value)
