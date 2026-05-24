export interface DaemonHeartbeat {
  last_ts: number
  daemon_alive: boolean
  ib_connected: boolean
  ib_client_id: number | null
  next_retry_ts: number | null
  seconds_until_retry: number | null
  heartbeat_interval_sec: number | null
  redis_quotes_connected: boolean
  mock_hedging: boolean
  last_control_message: string | null
  hedge_running: boolean
  graceful_shutdown_at: number | null
}

export interface IbPositionRow {
  account?: string
  symbol?: string
  secType?: string
  position?: number
  avgCost?: number | null
  price?: number | null
  unrealized_pnl?: number | null
  strike?: number
  right?: string
  expiry?: string
  lastTradeDateOrContractMonth?: string
  contract_key?: string | null
  updated_at?: number | null
  price_updated_at?: number | null
  daily_prev_close?: number | null
  category_id?: number | null
  category?: string | null
  strategy_opportunity_name?: string | null
  strategy_instance_label?: string | null
}

export interface IbAccountSnapshot {
  account_id?: string
  summary?: Record<string, string>
  positions?: IbPositionRow[]
}

export interface AccountSyncHeartbeat {
  last_ts: number | null
  daemon_alive: boolean
  heartbeat_interval_sec: number
  last_sync_version: number
  stream_lag: number
}

export interface StatusResponse {
  status_schema_version: number
  health: {
    status_lamp: string
    block_reasons: string[]
  }
  daemon: {
    heartbeat: DaemonHeartbeat | null
    lamp: string
    block_reasons: string[]
    trading: {
      trading_suspended: boolean
    }
  }
  portfolio: {
    accounts: IbAccountSnapshot[] | null
    accounts_fetched_at: number | null
    open_orders: unknown[]
  }
  celery: {
    broker_connected: boolean
    workers: string[]
    worker_ib_connected: boolean
    worker_ib_client_id: number | null
  }
  account_sync_daemon: {
    heartbeat: AccountSyncHeartbeat
  } | null
}
