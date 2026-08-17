import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const uiRoot = resolve(__dirname, '../bifrost-ui')

/**
 * Phase B Wave B1: single VITE_API_BASE for all Trade domains.
 *
 * Browser always requests `/api/{domain}/…`. Vite proxies `/api` to the
 * Trade gateway origin (K3s NodePort or Compose nginx). Plugin stays on
 * a separate host (platform-api).
 */
function buildDevProxies(env: Record<string, string>): Record<string, object> {
  const rawBase = env.VITE_API_BASE?.trim() || 'http://127.0.0.1:80'
  let tradeTarget = 'http://127.0.0.1:80'
  try {
    if (rawBase.startsWith('/')) {
      tradeTarget = 'http://127.0.0.1:80'
    } else {
      tradeTarget = new URL(rawBase).origin
    }
  } catch {
    tradeTarget = 'http://127.0.0.1:80'
  }

  const pluginBase =
    env.VITE_API_MARKET_DATA_PLUGIN?.trim() ||
    'http://localhost:8780/api/v1/plugins/market-data/api'
  const pluginParsed = (() => {
    try {
      const u = new URL(pluginBase)
      return { target: u.origin, pathPrefix: u.pathname.replace(/\/$/, '') }
    } catch {
      return {
        target: 'http://localhost:8780',
        pathPrefix: '/api/v1/plugins/market-data/api',
      }
    }
  })()

  return {
    // More specific rule first — Market Data Plugin → platform-api
    '/api/plugin/market-data': {
      target: pluginParsed.target,
      changeOrigin: true,
      rewrite: (path: string) =>
        `${pluginParsed.pathPrefix}${path.replace('/api/plugin/market-data', '')}`,
    },
    // All Trade domains → single gateway (path preserved: /api/monitor/…)
    // timeout 0 covers Ops Celery console SSE
    '/api': {
      target: tradeTarget,
      changeOrigin: true,
      timeout: 0,
      proxyTimeout: 0,
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        { find: '@', replacement: resolve(__dirname, 'src') },
        {
          find: '@bifrost/ui/styles',
          replacement: resolve(uiRoot, 'src/styles/bifrost-ui.css'),
        },
        { find: '@bifrost/ui', replacement: resolve(uiRoot, 'src/index.ts') },
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              /[/\\]react[/\\]/.test(id)
            ) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack')) return 'vendor-query'
            if (id.includes('radix-ui') || id.includes('@radix-ui')) return 'vendor-radix'
            if (id.includes('lucide-react')) return 'vendor-icons'
          },
        },
      },
    },
    server: {
      port: 5173,
      fs: {
        allow: [resolve(__dirname, '..'), uiRoot],
      },
      proxy: buildDevProxies(env),
    },
  }
})
