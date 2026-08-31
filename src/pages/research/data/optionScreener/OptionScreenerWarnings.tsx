import { optionScreenerWarnBoxClass, optionScreenerWarnLineClass } from './optionScreenerUi'

type Props = {
  warnings: [string, string][]
}

export function OptionScreenerWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null
  return (
    <div className={optionScreenerWarnBoxClass}>
      {warnings.map(([sym, msg]) => (
        <p key={sym} className={optionScreenerWarnLineClass}>
          <span className="font-mono font-medium">{sym}</span>: {msg}
        </p>
      ))}
    </div>
  )
}
