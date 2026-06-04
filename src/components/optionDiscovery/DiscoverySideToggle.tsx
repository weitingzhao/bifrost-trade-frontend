export type StrikeSideMode = 'all' | 'call' | 'put'

export function DiscoverySideToggle({
  value,
  onChange,
  'aria-labelledby': ariaLabelledBy,
}: {
  value: StrikeSideMode
  onChange: (mode: StrikeSideMode) => void
  id?: string
  'aria-labelledby'?: string
}) {
  return (
    <div
      className="od-strike-side-switch"
      role="group"
      aria-labelledby={ariaLabelledBy}
    >
      {(['all', 'call', 'put'] as const).map(mode => (
        <button
          key={mode}
          type="button"
          className={`od-strike-side-switch-btn${value === mode ? ' active' : ''}`}
          onClick={() => onChange(mode)}
          aria-pressed={value === mode}
        >
          {mode === 'all' ? 'All' : mode === 'call' ? 'Call' : 'Put'}
        </button>
      ))}
    </div>
  )
}
