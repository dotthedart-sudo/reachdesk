import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
  },
  resolve: {
    // Add 'development' so Vite can resolve the excalidraw exports map
    // which uses "development" / "production" conditions for ./index.css
    conditions: ['development', 'browser', 'module', 'import', 'default'],
  },
  optimizeDeps: {
    include: ['@excalidraw/excalidraw'],
    exclude: [],
    force: true,
  },
  build: {
    commonjsOptions: {
      include: [/excalidraw/, /node_modules/],
    },
    // Use same conditions during production build
    rollupOptions: {
      external: [],
    },
  },
})

