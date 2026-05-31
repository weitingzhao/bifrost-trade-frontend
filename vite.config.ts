import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { parseDevApiPorts } from './src/lib/devApiUrl'

function target(port: number): string {
  return `http://127.0.0.1:${port}`
}

/** Legacy-engine style proxies so dev same-origin paths match VITE_API_* ports. */
function buildDevProxies(ports: Record<string, number>): Record<string, object> {
  const apiProxies = Object.fromEntries(
    Object.entries(ports).map(([domain, port]) => [
      `/api/${domain}`,
      {
        target: target(port),
        changeOrigin: true,
        rewrite: (path: string) => path.replace(`/api/${domain}`, ''),
      },
    ]),
  )

  return {
    ...apiProxies,
    '/research/massive': { target: target(ports.massive), changeOrigin: true },
    '/research/docs': { target: target(ports.docs), changeOrigin: true },
    '/research/option': { target: target(ports.research), changeOrigin: true },
    '/research/screening': { target: target(ports.research), changeOrigin: true },
    '/research/data': { target: target(ports.research), changeOrigin: true },
    '/research/screener': { target: target(ports.research), changeOrigin: true },
    '/research/greeks': { target: target(ports.research), changeOrigin: true },
    '/research/iv-term-structure': { target: target(ports.research), changeOrigin: true },
    '/research/iv-volatility-cone': { target: target(ports.research), changeOrigin: true },
    '/research/max-pain': { target: target(ports.research), changeOrigin: true },
    '/ops': {
      target: target(ports.ops),
      changeOrigin: true,
      timeout: 0,
      proxyTimeout: 0,
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ports = parseDevApiPorts(env)

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
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
      proxy: buildDevProxies(ports),
    },
  }
})
