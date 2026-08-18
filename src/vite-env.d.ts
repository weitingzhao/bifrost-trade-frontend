/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Trade gateway origin (empty = same-origin `/api/{domain}`). */
  readonly VITE_API_BASE?: string
  readonly VITE_API_MARKET_DATA_PLUGIN: string
  readonly VITE_API_FLEX_QUERY_PLUGIN?: string
  readonly VITE_OPS_CONSOLE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
