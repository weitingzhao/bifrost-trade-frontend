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
  accounts_synced?: number
  positions_synced?: number
  executions_synced?: number
  open_orders_synced?: number
}

export interface StrategyActiveRef {
  id?: number | null
  name?: string | null
}

export interface StatusStrategyActive {
  structure?: StrategyActiveRef
  gate_safety?: StrategyActiveRef
  allocation?: StrategyActiveRef
}

export interface StatusStrategy {
  active?: StatusStrategyActive
}

export interface StatusMarketData {
  quotes_redis_reader_ok?: boolean
}

export interface StatusSocketIbIngestor {
  connected?: boolean
  last_msg_age_s?: number | null
  reconnects?: number | null
  msg_count?: number | null
}

export interface StatusSocketIbOperator {
  service_alive?: boolean
  connected?: boolean
  msg_count?: number | null
  last_msg_age_s?: number | null
  reconnects?: number | null
}

export interface StatusSocketIbAccountAgent {
  connected?: boolean
  service_alive?: boolean
  last_msg_age_s?: number | null
  reconnects?: number | null
  msg_count?: number | null
  client_id?: number | null
}

export interface StatusSocket {
  ib_ingestor?: StatusSocketIbIngestor | null
  ib_operator?: StatusSocketIbOperator | null
  ib_account_agent?: StatusSocketIbAccountAgent | null
}

export interface Operation {
  daemon_auto_operations_id?: number
  ts: number
  type?: string
  side?: string
  quantity?: number
  price?: number
  state_reason?: string
}

export interface StatusLiveUi {
  subscribed_tickers?: string[]
  reference_indices?: { symbol: string; label?: string; polygon_ticker?: string }[]
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
    self_check?: string
    trading: {
      trading_suspended: boolean
      auto_status?: {
        ts?: number
        daemon_state?: string
        trading_state?: string
        spot?: number
        stock_position?: number
        daily_hedge_count?: number
        account_id?: string | null
        account_net_liquidation?: number | null
      } | null
    }
  }
  portfolio: {
    accounts: IbAccountSnapshot[] | null
    accounts_fetched_at: number | null
    open_orders: OpenOrderRow[]
  }
  celery: {
    broker_connected: boolean
    workers: string[]
    worker_ib_connected: boolean
    worker_ib_client_id: number | null
  }
  config?: {
    ib_client?: {
      account?: {
        event_host?: string
        event_secondary?: string
        trading?: string
      }
    }
  }
  account_sync_daemon: {
    heartbeat: AccountSyncHeartbeat
  } | null
  strategy?: StatusStrategy
  market_data?: StatusMarketData
  socket?: StatusSocket
  live_ui?: StatusLiveUi
}

export interface OpenOrderRow {
  order_id?: number | null
  perm_id?: number | null
  account_id?: string | null
  symbol?: string | null
  sec_type?: string | null
  action?: string | null
  total_quantity?: number | null
  filled?: number | null
  remaining?: number | null
  limit_price?: number | null
  status?: string | null
  contract_key?: string | null
  updated_ts?: number | null
}
