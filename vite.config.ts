import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['pdf-lib', 'lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});

