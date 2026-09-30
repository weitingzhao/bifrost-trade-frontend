/**
 * Stock screen · method — `/research/lab/stocks` (design Rev .121 #5, .123).
 *
 * The back face of Stock screen: Models · Conditions · Screens · Queue.
 * Conditions is the old Screener authoring face and Queue the old Ratings
 * method face (the night batch's candidates, in its three states); their
 * old addresses land on these tabs.
 */
import { useSearchParams } from 'react-router-dom'
import { ConditionsFace } from './method/ConditionsFace'
import { ModelsFace } from './method/ModelsFace'
import { QueueFace } from './method/QueueFace'
import { ScreensFace } from './method/ScreensFace'
import type { MethodHead, MethodTab } from './method/methodHead'

const TABS: MethodTab[] = ['models', 'conditions', 'screens', 'queue']

export default function StockScreenMethodPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab') as MethodTab | null
  const tab: MethodTab = raw && TABS.includes(raw) ? raw : 'models'
  const head: MethodHead = {
    tabs: [
      { value: 'models', label: 'Models' },
      { value: 'conditions', label: 'Conditions' },
      { value: 'screens', label: 'Screens' },
      { value: 'queue', label: 'Queue' },
    ],
    tab,
    onTab: (v) => {
      const next = new URLSearchParams(params)
      if (v === 'models') next.delete('tab')
      else next.set('tab', v)
      setParams(next, { replace: true })
    },
  }
  if (tab === 'conditions') return <ConditionsFace head={head} />
  if (tab === 'screens') return <ScreensFace head={head} />
  if (tab === 'queue') return <QueueFace head={head} />
  return <ModelsFace head={head} />
}
