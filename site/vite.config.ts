import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: [
      'amazon-hackathon-sepia.vercel.app'
    ],
    proxy: {
      '/api': {
        target: 'https://aegisvision-backend.onrender.com/',
        changeOrigin: true
      },
      '/media': {
        target: 'https://aegisvision-backend.onrender.com/',
        changeOrigin: true
      }
    }
  }
});