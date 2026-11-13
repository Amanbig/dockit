import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/marked/')) {
            return 'vendor-marked'
          }
          if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/@hugeicons/')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/@xterm/')) {
            return 'vendor-xterm'
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
