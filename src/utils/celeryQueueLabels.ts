export const BROKER_QUEUE_STOCKS_IB = 'stocks_ib' as const
export const BROKER_QUEUE_OPTIONS_MASSIVE = 'options_massive' as const
export const BROKER_QUEUE_OPTIONS_MASSIVE_HIGH = 'options_massive_high' as const
export const BROKER_QUEUE_STOCKS_MASSIVE = 'stocks_massive' as const
export const BROKER_QUEUE_STOCKS_MASSIVE_HIGH = 'stocks_massive_high' as const

let brokerQueueLabelsFromApi: Record<string, string> | null = null

export function setBrokerQueueLabelsFromApi(labels: Record<string, string> | undefined | null): void {
  if (labels && typeof labels === 'object' && Object.keys(labels).length > 0) {
    brokerQueueLabelsFromApi = { ...labels }
  } else {
    brokerQueueLabelsFromApi = null
  }
}

export function formatQueueLabel(brokerKey: string): string {
  const k = (brokerKey || '').trim()
  const fromApi = brokerQueueLabelsFromApi?.[k]
  if (fromApi) return fromApi
  if (k === BROKER_QUEUE_STOCKS_IB) return 'Stocks IB'
  if (k === BROKER_QUEUE_OPTIONS_MASSIVE) return 'Options Massive'
  if (k === BROKER_QUEUE_OPTIONS_MASSIVE_HIGH) return 'Massive Options (H)'
  if (k === BROKER_QUEUE_STOCKS_MASSIVE) return 'Stocks Massive'
  if (k === BROKER_QUEUE_STOCKS_MASSIVE_HIGH) return 'Stocks Massive (H)'
  return k
}

export function brokerQueueKeyTitle(brokerKey: string): string {
  return `Redis list key: ${brokerKey}`
}
