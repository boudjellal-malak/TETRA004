import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redirige tous les appels /api/* vers le serveur FastAPI uvicorn
      '/api': {
        target:       'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
