export type SystemMessageLevel = 'info' | 'success' | 'warning' | 'error'

export interface SystemMessage {
  message_id: string
  topic: string
  level: SystemMessageLevel
  service?: string
  slot?: string
  client_id?: number | null
  account?: string | null
  status_from?: string | null
  status_to?: string | null
  title: string
  message: string
  reason?: string | null
  occurred_at: number // Unix seconds
}

export interface SystemMessagesResponse {
  messages: SystemMessage[]
}
