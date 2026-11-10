import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { spawn } from 'child_process'
import http from 'http'

/**
 * Auto-starts the backend Express server on port 3001 when running Vite dev server,
 * so the user never has to remember to manually run `npm run server` separately.
 */
function autoBackendPlugin() {
  let backendProc = null;
  return {
    name: 'auto-backend-server',
    configureServer(server) {
      // Check if backend is already listening on port 3001
      const ping = http.get('http://localhost:3001/api/auth/me', () => {
        // Backend is already running
      });
      ping.on('error', () => {
        backendProc = spawn('node', ['backend/server.js'], {
          stdio: 'inherit'
        });
        backendProc.on('error', (err) => {
          console.warn('[FinSight] Auto-starting backend process error:', err.message);
        });
      });

      const killBackend = () => {
        if (backendProc) {
          try { backendProc.kill(); } catch {}
          backendProc = null;
        }
      };

      process.on('SIGINT', killBackend);
      process.on('SIGTERM', killBackend);
      process.on('exit', killBackend);
      server.httpServer?.on('close', killBackend);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
