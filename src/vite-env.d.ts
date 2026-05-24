/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MONITOR: string
  readonly VITE_API_MARKET: string
  readonly VITE_API_MASSIVE: string
  readonly VITE_API_OPS: string
  readonly VITE_API_TRADING: string
  readonly VITE_API_STRATEGY: string
  readonly VITE_API_PORTFOLIO: string
  readonly VITE_API_RESEARCH: string
  readonly VITE_API_DOCS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
