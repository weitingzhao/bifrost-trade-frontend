import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const uiRoot = resolve(__dirname, '../bifrost-ui')

type ApiTarget = {
  target: string
  pathPrefix: string
}

function apiTarget(base: string | undefined, fallbackPort: number): ApiTarget {
  const fallback = `http://127.0.0.1:${fallbackPort}`
  const configuredBase = base?.trim()
  if (configuredBase?.startsWith('/')) {
    return {
      target: fallback,
      pathPrefix: configuredBase.replace(/\/$/, ''),
    }
  }
  const parsed = new URL(configuredBase || fallback)
  return {
    target: parsed.origin,
    pathPrefix: parsed.pathname.replace(/\/$/, ''),
  }
}

function withTargetPath(target: ApiTarget, path: string): string {
  return `${target.pathPrefix}${path}`
}

/**
 * Route same-origin development requests to the full VITE_API_* URL.
 *
 * Local Compose values only contain a host and port. K3s values additionally
 * contain an ingress prefix (for example `/api/ops`), which must be retained.
 */
function buildDevProxies(env: Record<string, string>): Record<string, object> {
  const targets = {
    monitor: apiTarget(env.VITE_API_MONITOR, 8765),
    docs: apiTarget(env.VITE_API_DOCS, 8767),
    ops: apiTarget(env.VITE_API_OPS, 8768),
    trading: apiTarget(env.VITE_API_TRADING, 8769),
    strategy: apiTarget(env.VITE_API_STRATEGY, 8770),
    portfolio: apiTarget(env.VITE_API_PORTFOLIO, 8771),
    market: apiTarget(env.VITE_API_MARKET, 8772),
    research: apiTarget(env.VITE_API_RESEARCH, 8773),
  }
  const apiProxies = Object.fromEntries(
    Object.entries(targets).map(([domain, target]) => [
      `/api/${domain}`,
      {
        target: target.target,
        changeOrigin: true,
        // Ops Celery console SSE needs unbounded proxy timeout
        ...(domain === 'ops' ? { timeout: 0, proxyTimeout: 0 } : {}),
        rewrite: (path: string) =>
          withTargetPath(target, path.replace(`/api/${domain}`, '')),
      },
    ]),
  )

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
    ...apiProxies,
    // Market Data Plugin → platform-api (avoids DEV CORS to :8780)
    '/api/plugin/market-data': {
      target: pluginParsed.target,
      changeOrigin: true,
      rewrite: (path: string) =>
        `${pluginParsed.pathPrefix}${path.replace('/api/plugin/market-data', '')}`,
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
