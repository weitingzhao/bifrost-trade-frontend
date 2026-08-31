import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { optionScreenerFilterLabelClass, optionScreenerNumInputClass } from './optionScreenerUi'

type Props = {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
}

export function OptionScreenerNumInput({ label, value, onChange, placeholder }: Props) {
  return (
    <div className="space-y-1">
      <Label className={optionScreenerFilterLabelClass}>{label}</Label>
      <Input
        type="number"
        step="any"
        className={optionScreenerNumInputClass}
        placeholder={placeholder ?? '—'}
        value={value ?? ''}
        onChange={e => {
          const v = e.target.value === '' ? null : parseFloat(e.target.value)
          onChange(Number.isNaN(v ?? 0) ? null : v)
        }}
      />
    </div>
  )
}
