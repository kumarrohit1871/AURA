import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Universal dev config: works locally and in online IDEs/proxies
const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  server: {
    // Honor platform-provided PORT (Codespaces, Render, Railway, etc.)
    port: Number(process.env.PORT) || 5000,
    // Listen on all interfaces for external access
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 5000,
    host: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, '.'),
    },
  },
});
