export const BROKER_QUEUE_STOCKS_IB = 'stocks_ib' as const

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
  return k
}

export function brokerQueueKeyTitle(brokerKey: string): string {
  return `Redis list key: ${brokerKey}`
}
