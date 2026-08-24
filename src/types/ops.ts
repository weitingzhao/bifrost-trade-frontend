export interface MarketDataPluginCeleryBeatEntry {
  name: string
  task: string
  label: string
  crontab: Record<string, string | number>
}

export interface MarketDataPluginCeleryBeatScheduleResponse {
  ok: boolean
  timezone?: string
  entries?: MarketDataPluginCeleryBeatEntry[]
  error?: string
}
