import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// API 域端口映射
const API_PORTS: Record<string, number> = {
  monitor:   8765,
  massive:   8766,
  docs:      8767,
  ops:       8768,
  trading:   8769,
  strategy:  8770,
  portfolio: 8771,
  market:    8772,
  research:  8773,
}

const apiProxies = Object.fromEntries(
  Object.entries(API_PORTS).map(([domain, port]) => [
    `/api/${domain}`,
    {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(`/api/${domain}`, ''),
    },
  ])
)

export default defineConfig({
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
    proxy: apiProxies,
  },
})
