import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    // @bifrost/ui is linked from ../bifrost-ui, which carries its own react and
    // lucide-react; without dedupe a component rendering one of its icons runs
    // hooks against a second React copy and dies on a null dispatcher.
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
