export const OPTION_BAR_PERIODS = [
  { value: '1 D', label: 'Daily' },
  { value: '1 hour', label: '1 hour' },
  { value: '5 mins', label: '5 min' },
  { value: '1 min', label: '1 min' },
] as const

export type OptionBarPeriodValue = (typeof OPTION_BAR_PERIODS)[number]['value']
