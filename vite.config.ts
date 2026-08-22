import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const uiRoot = resolve(__dirname, '../bifrost-ui')

/**
 * Phase B Wave B1: single VITE_API_BASE for all Trade domains.
 *
 * Browser always requests `/api/{domain}/…`, `/api/plugin/market-data/…`,
 * and `/api/plugin/flex-query/…`.
 * Default: all proxy to the Trade gateway origin (K3s NodePort / Compose nginx)
 * so DEV matches PROD same-origin topology.
 *
 * Escape hatch: set absolute VITE_API_MARKET_DATA_PLUGIN or
 * VITE_API_FLEX_QUERY_PLUGIN (e.g. platform-api
 * `http://localhost:8780/api/v1/plugins/flex-query/api`) to bypass Trade gateway.
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

  const pluginOverride = env.VITE_API_MARKET_DATA_PLUGIN?.trim() || ''
  const flexOverride = env.VITE_API_FLEX_QUERY_PLUGIN?.trim() || ''
  const researchOverride = env.VITE_API_RESEARCH_ENGINE?.trim() || ''
  const pluginProxy = (() => {
    if (!pluginOverride || pluginOverride === '/') {
      return {
        target: tradeTarget,
        changeOrigin: true,
      }
    }
    try {
      const u = new URL(pluginOverride)
      const pathPrefix = u.pathname.replace(/\/$/, '')
      return {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) =>
          `${pathPrefix}${path.replace('/api/plugin/market-data', '')}`,
      }
    } catch {
      return {
        target: 'http://localhost:8780',
        changeOrigin: true,
        rewrite: (path: string) =>
          `/api/v1/plugins/market-data/api${path.replace('/api/plugin/market-data', '')}`,
      }
    }
  })()
  const flexPluginProxy = (() => {
    if (!flexOverride || flexOverride === '/') {
      return {
        target: tradeTarget,
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      }
    }
    try {
      const u = new URL(flexOverride)
      const pathPrefix = u.pathname.replace(/\/$/, '')
      return {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) =>
          `${pathPrefix}${path.replace('/api/plugin/flex-query', '')}`,
      }
    } catch {
      return {
        target: 'http://localhost:8780',
        changeOrigin: true,
        rewrite: (path: string) =>
          `/api/v1/plugins/flex-query/api${path.replace('/api/plugin/flex-query', '')}`,
      }
    }
  })()

  const researchPluginProxy = (() => {
    if (!researchOverride || researchOverride === '/') {
      return {
        target: tradeTarget,
        changeOrigin: true,
      }
    }
    try {
      const u = new URL(researchOverride)
      const pathPrefix = u.pathname.replace(/\/$/, '')
      return {
        target: u.origin,
        changeOrigin: true,
        rewrite: (path: string) =>
          `${pathPrefix}${path.replace('/api/plugin/research', '')}`,
      }
    } catch {
      return {
        target: 'http://localhost:8780',
        changeOrigin: true,
        rewrite: (path: string) =>
          `/api/v1/plugins/research/api${path.replace('/api/plugin/research', '')}`,
      }
    }
  })()

  return {
    '/api/plugin/market-data': pluginProxy,
    '/api/plugin/flex-query': flexPluginProxy,
    '/api/plugin/research': researchPluginProxy,
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
