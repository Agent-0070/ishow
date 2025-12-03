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
        // Manual chunks to split large vendor libraries into logical bundles
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor.react';
            if (id.includes('lucide-react')) return 'vendor.icons';
            if (id.includes('framer-motion')) return 'vendor.motion';
            if (id.includes('axios')) return 'vendor.axios';
            if (id.includes('socket.io-client')) return 'vendor.socket';
            if (id.includes('@tanstack') || id.includes('react-query') || id.includes('@tanstack')) return 'vendor.query';
            // Fallback vendor chunk for other node_modules
            return 'vendor';
          }
        }
      }
    }
  }
})
