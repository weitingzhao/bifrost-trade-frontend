import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ScreenerResponse } from '@/types/research'
import { optionScreenerResultsMetaClass } from './optionScreenerUi'

type Props = {
  data: ScreenerResponse
  onExport: () => void
}

export function OptionScreenerResultsBar({ data, onExport }: Props) {
  return (
    <div className={optionScreenerResultsMetaClass}>
      <span>
        {data.total_contracts ?? 0} contracts across {data.symbols_scanned?.length ?? 0} symbols
        {(data.symbols_failed?.length ?? 0) > 0 && (
          <span className="ml-2 text-destructive">
            Failed: {data.symbols_failed?.join(', ')}
          </span>
        )}
      </span>
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export CSV
      </Button>
    </div>
  )
}
