import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { writeFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function generateServerEntry() {
  return {
    name: 'generate-server-entry',
    closeBundle() {
      const content = `// Production entry point - starts the Express server\n(async () => { await import('../server/index.js'); })();\n`;
      writeFileSync(path.resolve(__dirname, 'dist/index.cjs'), content);
    }
  }
}

export default defineConfig({
  plugins: [react(), generateServerEntry()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  },
});
