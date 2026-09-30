/**
 * Stock screen · method (`/research/lab/stocks`, design Rev .121 #5): one
 * head, four tabs — Models · Conditions · Screens · Queue. Each tab body draws
 * the shared head with the tab strip, so the face reads as one page.
 */
import type { PageHeadTab } from '@/components/layout'

export type MethodTab = 'models' | 'conditions' | 'screens' | 'queue'

export interface MethodHead {
  tabs: PageHeadTab[]
  tab: MethodTab
  onTab: (v: string) => void
}

export const METHOD_PATH = '/research/lab/stocks'
export const METHOD_TITLE = 'Stock screen · method'
export const METHOD_INFO =
  'How Stock screen’s numbers are made: the three models, the condition vocabulary, the screens, and the nightly candidate queue. Analysis only; crossing to Stock screen or to Trade is what places an order.'
