import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Increase limit slightly to reduce noisy warnings while still highlighting very large chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Use default vendor chunking to avoid cross-chunk circular import issues
        // (removing aggressive manual chunking that can lead to React exports
        // being read before initialization in some environments)
      }
    }
  }
})
