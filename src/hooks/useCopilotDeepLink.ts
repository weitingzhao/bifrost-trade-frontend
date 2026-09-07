/**
 * `?copilot=open` opens the Copilot panel and then removes itself from the URL.
 *
 * The sidebar's "Ask the Copilot" entry has to be a link like every other
 * entry, but the Copilot is a global panel, not a page. The link lands on
 * Research Home with this flag; the flag opens the panel once and is stripped
 * so a refresh, a back-button or a shared URL does not reopen it.
 */
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { openResearchCopilot } from '@/lib/harness/loopCopilotPrefill'

export function useCopilotDeepLink() {
  const [params, setParams] = useSearchParams()
  const flag = params.get('copilot')
  useEffect(() => {
    if (flag !== 'open') return
    openResearchCopilot()
    const next = new URLSearchParams(params)
    next.delete('copilot')
    setParams(next, { replace: true })
  }, [flag, params, setParams])
}
